"""需求接口模块，负责需求编辑、删除、认领以及项目参与权限校验。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import db_session, has_permission, require_actor
from app.api.utils import create_audit_log, get_or_404, model_to_dict, update_model
from app.core.errors import ApiError
from app.core.security import Actor
from app.models.member import Member
from app.models.project_member import ProjectMember
from app.models.requirement import Requirement
from app.schemas.base import AuditAction, TargetType
from app.schemas.requirement import RequirementRead, RequirementUpdate


router = APIRouter(prefix="/requirements", tags=["requirements"])


@router.put("/{requirement_id}", response_model=RequirementRead)
def update_requirement(
    requirement_id: int,
    payload: RequirementUpdate,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_actor),
) -> Requirement:
    """更新需求池里的单条需求。

    参数：`requirement_id` 表示调用方传入的业务参数；`payload` 表示接口请求体或业务输入数据；`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：更新后的需求；非管理员必须满足项目分配、本人创建、未认领和权限 code 校验。
    """
    requirement = get_or_404(db, Requirement, requirement_id, "requirement")
    ensure_can_modify_requirement(db, actor, requirement, "requirement:update-own")
    before = model_to_dict(requirement)
    update_model(requirement, payload.model_dump(exclude_unset=True))
    db.flush()
    create_audit_log(
        db,
        actor,
        AuditAction.UPDATE,
        TargetType.REQUIREMENT,
        requirement.id,
        before,
        model_to_dict(requirement),
        "更新需求",
    )
    db.commit()
    db.refresh(requirement)
    return requirement


@router.delete("/{requirement_id}", status_code=204)
def delete_requirement(
    requirement_id: int,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_actor),
) -> None:
    """删除需求池里的单条需求并记录审计日志。

    参数：`requirement_id` 表示调用方传入的业务参数；`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：无返回值；非管理员只能删除自己创建且未被认领的需求。
    """
    requirement = get_or_404(db, Requirement, requirement_id, "requirement")
    ensure_can_modify_requirement(db, actor, requirement, "requirement:delete-own")
    before = model_to_dict(requirement)
    db.delete(requirement)
    create_audit_log(
        db,
        actor,
        AuditAction.REMOVE,
        TargetType.REQUIREMENT,
        requirement.id,
        before,
        None,
        "删除需求",
    )
    db.commit()


@router.post("/{requirement_id}/claim", response_model=RequirementRead)
def claim_requirement(
    requirement_id: int,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_actor),
) -> Requirement:
    """认领一个仍处于 OPEN 状态的需求。

    参数：`requirement_id` 表示调用方传入的业务参数；`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：认领后的需求；非管理员必须已分配到项目并拥有 `requirement:claim`。
    """
    requirement = get_or_404(db, Requirement, requirement_id, "requirement")
    # 需求一旦被认领就进入锁定态，普通贡献者不能再修改或删除。
    if requirement.status != "OPEN" or requirement.claimed_by_user_id is not None:
        raise ApiError(409, "REQUIREMENT_ALREADY_CLAIMED", "需求已被认领")
    if "ADMIN" not in actor.roles:
        # CONTRIBUTOR 的权限分两层：菜单权限 code 通过后，还必须参与当前项目。
        if not has_permission(actor, "requirement", "requirement:claim"):
            raise ApiError(403, "FORBIDDEN", "无权执行该操作")
        ensure_project_assignment(db, actor.id, requirement.project_id)
    before = model_to_dict(requirement)
    requirement.status = "CLAIMED"
    requirement.claimed_by_user_id = actor.id
    requirement.claimed_at = datetime.now(timezone.utc)
    db.flush()
    create_audit_log(
        db,
        actor,
        AuditAction.CLAIM,
        TargetType.REQUIREMENT,
        requirement.id,
        before,
        model_to_dict(requirement),
        "认领需求",
    )
    db.commit()
    db.refresh(requirement)
    return requirement


def ensure_can_modify_requirement(db: Session, actor: Actor, requirement: Requirement, permission_code: str) -> None:
    """校验当前用户能否修改或删除某条需求。

    参数：`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录；`requirement` 表示需求 ORM 对象；`permission_code` 表示调用方传入的业务参数。
    返回：无返回值；校验失败抛出 403，ADMIN 直接放行。
    """
    if "ADMIN" in actor.roles:
        return
    # 普通用户必须同时满足权限 code、项目分配、创建人、未认领四个条件。
    if not has_permission(actor, "requirement", permission_code):
        raise ApiError(403, "FORBIDDEN", "无权执行该操作")
    ensure_project_assignment(db, actor.id, requirement.project_id)
    if requirement.created_by_user_id != actor.id:
        raise ApiError(403, "REQUIREMENT_OWNER_REQUIRED", "只能操作自己创建的需求")
    if requirement.status != "OPEN" or requirement.claimed_by_user_id is not None:
        raise ApiError(403, "REQUIREMENT_LOCKED", "已认领需求不能修改或删除")


def ensure_project_assignment(db: Session, user_id: int, project_id: int) -> None:
    """校验用户账号是否通过项目人员关系参与了指定项目。

    参数：`db` 表示数据库会话，用于查询和提交业务数据；`user_id` 表示调用方传入的业务参数；`project_id` 表示调用方传入的业务参数。
    返回：无返回值；未找到启用项目成员关系时抛出 403。
    """
    # 业务上“参与项目”仍落在 project_members，但通过 members.user_id 与登录账号绑定。
    assignment = db.scalar(
        select(ProjectMember)
        .join(Member, Member.id == ProjectMember.member_id)
        .where(
            ProjectMember.project_id == project_id,
            ProjectMember.status == "ACTIVE",
            Member.user_id == user_id,
            Member.status == "ACTIVE",
        )
    )
    if assignment is None:
        raise ApiError(403, "PROJECT_ASSIGNMENT_REQUIRED", "只有被分配到项目的用户才能操作需求池")
