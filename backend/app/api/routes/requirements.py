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
    requirement = get_or_404(db, Requirement, requirement_id, "requirement")
    if requirement.status != "OPEN" or requirement.claimed_by_user_id is not None:
        raise ApiError(409, "REQUIREMENT_ALREADY_CLAIMED", "需求已被认领")
    if "ADMIN" not in actor.roles:
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
    if "ADMIN" in actor.roles:
        return
    if not has_permission(actor, "requirement", permission_code):
        raise ApiError(403, "FORBIDDEN", "无权执行该操作")
    ensure_project_assignment(db, actor.id, requirement.project_id)
    if requirement.created_by_user_id != actor.id:
        raise ApiError(403, "REQUIREMENT_OWNER_REQUIRED", "只能操作自己创建的需求")
    if requirement.status != "OPEN" or requirement.claimed_by_user_id is not None:
        raise ApiError(403, "REQUIREMENT_LOCKED", "已认领需求不能修改或删除")


def ensure_project_assignment(db: Session, user_id: int, project_id: int) -> None:
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
