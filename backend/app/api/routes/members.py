"""项目人员接口模块，负责项目人员档案、账号绑定、状态和参与项目查询。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import db_session, require_actor, require_admin
from app.api.utils import apply_pagination, create_audit_log, get_or_404, model_to_dict, update_model
from app.core.errors import ApiError
from app.core.security import Actor
from app.models.member import Member
from app.models.project_member import ProjectMember
from app.models.user import User
from app.schemas.base import AuditAction, TargetType
from app.schemas.member import MemberCreate, MemberList, MemberRead, MemberStatusUpdate, MemberUpdate
from app.schemas.project_member import ProjectMemberList


router = APIRouter(prefix="/members", tags=["members"])


@router.get("", response_model=MemberList)
def list_members(
    db: Session = Depends(db_session),
    _: Actor = Depends(require_actor),
    keyword: str | None = None,
    status: str | None = None,
    skill_direction: str | None = Query(None, alias="skillDirection"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
) -> MemberList:
    """分页查询项目人员档案。

    参数：`db` 表示数据库会话，用于查询和提交业务数据；`_` 表示依赖注入占位参数，用于触发登录或权限校验；`keyword` 表示调用方传入的业务参数；`status` 表示调用方传入的业务参数；`skill_direction` 表示调用方传入的业务参数；`page` 表示调用方传入的业务参数；`page_size` 表示调用方传入的业务参数。
    返回：统一 `{ items, total }` 项目人员列表响应，包含绑定用户账号。
    """
    stmt = select(Member).options(joinedload(Member.user)).order_by(Member.updated_at.desc(), Member.id.desc())
    if keyword:
        pattern = f"%{keyword}%"
        stmt = stmt.where(or_(Member.name.ilike(pattern), Member.github_username.ilike(pattern)))
    if status:
        stmt = stmt.where(Member.status == status)
    if skill_direction:
        stmt = stmt.where(Member.skill_direction == skill_direction)
    items, total = apply_pagination(db, stmt, page, page_size)
    return MemberList(items=items, total=total)


@router.post("", response_model=MemberRead, status_code=201)
def create_member(
    payload: MemberCreate,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> Member:
    """创建项目人员档案并绑定一个登录账号。

    参数：`payload` 表示接口请求体或业务输入数据；`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：创建后的项目人员；同一用户账号只能绑定一个项目人员档案。
    """
    validate_member_user_binding(db, payload.user_id)
    member = Member(**payload.model_dump())
    db.add(member)
    db.flush()
    create_audit_log(db, actor, AuditAction.CREATE, TargetType.MEMBER, member.id, None, model_to_dict(member))
    db.commit()
    db.refresh(member)
    return member


@router.get("/{member_id}", response_model=MemberRead)
def get_member(member_id: int, db: Session = Depends(db_session), _: Actor = Depends(require_actor)) -> Member:
    """查询项目人员详情。

    参数：`member_id` 表示调用方传入的业务参数；`db` 表示数据库会话，用于查询和提交业务数据；`_` 表示依赖注入占位参数，用于触发登录或权限校验。
    返回：项目人员档案和绑定用户账号；不存在时返回统一 404。
    """
    member = db.scalar(select(Member).options(joinedload(Member.user)).where(Member.id == member_id))
    if member is None:
        return get_or_404(db, Member, member_id, "member")
    return member


@router.put("/{member_id}", response_model=MemberRead)
def update_member(
    member_id: int,
    payload: MemberUpdate,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> Member:
    """更新项目人员档案。

    参数：`member_id` 表示调用方传入的业务参数；`payload` 表示接口请求体或业务输入数据；`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：更新后的项目人员；切换绑定账号时会校验账号唯一性。
    """
    member = get_or_404(db, Member, member_id, "member")
    if payload.user_id is not None and payload.user_id != member.user_id:
        validate_member_user_binding(db, payload.user_id, current_member_id=member.id)
    before = model_to_dict(member)
    update_model(member, payload.model_dump(exclude_unset=True))
    db.flush()
    create_audit_log(db, actor, AuditAction.UPDATE, TargetType.MEMBER, member.id, before, model_to_dict(member))
    db.commit()
    db.refresh(member)
    return member


@router.patch("/{member_id}/status", response_model=MemberRead)
def update_member_status(
    member_id: int,
    payload: MemberStatusUpdate,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> Member:
    """更新项目人员状态。

    参数：`member_id` 表示调用方传入的业务参数；`payload` 表示接口请求体或业务输入数据；`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：更新后的项目人员，并记录状态变更审计日志。
    """
    member = get_or_404(db, Member, member_id, "member")
    before = model_to_dict(member)
    member.status = payload.status.value
    db.flush()
    create_audit_log(
        db,
        actor,
        AuditAction.STATUS_CHANGE,
        TargetType.MEMBER,
        member.id,
        before,
        model_to_dict(member),
        payload.description,
    )
    db.commit()
    db.refresh(member)
    return member


@router.get("/{member_id}/projects", response_model=ProjectMemberList)
def list_member_projects(
    member_id: int,
    db: Session = Depends(db_session),
    _: Actor = Depends(require_actor),
) -> ProjectMemberList:
    """查询某个项目人员参与过的项目关系。

    参数：`member_id` 表示调用方传入的业务参数；`db` 表示数据库会话，用于查询和提交业务数据；`_` 表示依赖注入占位参数，用于触发登录或权限校验。
    返回：项目人员参与项目列表，包含项目和人员账号信息。
    """
    get_or_404(db, Member, member_id, "member")
    stmt = (
        select(ProjectMember)
        .options(joinedload(ProjectMember.project), joinedload(ProjectMember.member).joinedload(Member.user))
        .where(ProjectMember.member_id == member_id)
        .order_by(ProjectMember.id.desc())
    )
    items = db.scalars(stmt).all()
    return ProjectMemberList(items=items, total=len(items))


def validate_member_user_binding(db: Session, user_id: int, current_member_id: int | None = None) -> None:
    """校验项目人员与用户账号的一对一绑定关系。

    参数：`db` 表示数据库会话，用于查询和提交业务数据；`user_id` 表示调用方传入的业务参数；`current_member_id` 表示调用方传入的业务参数。
    返回：无返回值；账号不存在或已绑定到其他人员时抛出业务错误。
    """
    get_or_404(db, User, user_id, "user")
    existing = db.scalar(select(Member).where(Member.user_id == user_id))
    if existing is not None and existing.id != current_member_id:
        raise ApiError(409, "MEMBER_USER_EXISTS", "该账号已绑定项目人员档案")
