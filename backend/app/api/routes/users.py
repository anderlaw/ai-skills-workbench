from fastapi import APIRouter, Depends, Query
from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from app.api.deps import db_session, require_admin
from app.api.utils import apply_pagination, create_audit_log, model_to_dict
from app.core.errors import ApiError
from app.core.security import Actor
from app.models.role import Role
from app.models.user import User
from app.models.user_role import UserRole
from app.schemas.base import AuditAction, TargetType
from app.schemas.user import UserCreate, UserList, UserRead, UserRoleAssignmentRead, UserRoleUpdate


router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=UserList)
def list_users(
    db: Session = Depends(db_session),
    _: Actor = Depends(require_admin),
    keyword: str | None = None,
    status: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
) -> UserList:
    stmt = select(User).order_by(User.updated_at.desc(), User.id.desc())
    if keyword:
        pattern = f"%{keyword}%"
        stmt = stmt.where(or_(User.username.ilike(pattern), User.display_name.ilike(pattern)))
    if status:
        stmt = stmt.where(User.status == status)
    items, total = apply_pagination(db, stmt, page, page_size)
    return UserList(items=items, total=total)


@router.post("", response_model=UserRead, status_code=201)
def create_user(
    payload: UserCreate,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> User:
    exists = db.scalar(select(User).where(User.username == payload.username))
    if exists is not None:
        raise ApiError(409, "USER_USERNAME_EXISTS", "登录账号已存在")
    user = User(**payload.model_dump(exclude={"role_codes"}))
    db.add(user)
    db.flush()
    role_codes = payload.role_codes or ["CONTRIBUTOR"]
    roles = db.scalars(select(Role).where(Role.code.in_(role_codes), Role.status == "ACTIVE")).all()
    if len(roles) != len(set(role_codes)):
        raise ApiError(400, "ROLE_NOT_FOUND", "角色不存在或已停用")
    for role in roles:
        db.add(UserRole(user_id=user.id, role_id=role.id))
    db.flush()
    create_audit_log(db, actor, AuditAction.CREATE, TargetType.USER, user.id, None, model_to_dict(user))
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}/roles", response_model=UserRoleAssignmentRead)
def get_user_roles(
    user_id: int,
    db: Session = Depends(db_session),
    _: Actor = Depends(require_admin),
) -> UserRoleAssignmentRead:
    user = db.get(User, user_id)
    if user is None:
        raise ApiError(404, "USER_NOT_FOUND", "用户不存在")
    return UserRoleAssignmentRead(user_id=user.id, role_codes=get_user_role_codes(db, user.id))


@router.put("/{user_id}/roles", response_model=UserRoleAssignmentRead)
def update_user_roles(
    user_id: int,
    payload: UserRoleUpdate,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> UserRoleAssignmentRead:
    user = db.get(User, user_id)
    if user is None:
        raise ApiError(404, "USER_NOT_FOUND", "用户不存在")
    role_codes = sorted(set(payload.role_codes))
    if not role_codes:
        raise ApiError(400, "USER_ROLE_REQUIRED", "至少需要一个角色")
    roles = db.scalars(select(Role).where(Role.code.in_(role_codes), Role.status == "ACTIVE")).all()
    if len(roles) != len(role_codes):
        raise ApiError(400, "ROLE_NOT_FOUND", "角色不存在或已停用")
    before_codes = get_user_role_codes(db, user.id)
    db.execute(delete(UserRole).where(UserRole.user_id == user.id))
    for role in roles:
        db.add(UserRole(user_id=user.id, role_id=role.id))
    db.flush()
    create_audit_log(
        db,
        actor,
        AuditAction.UPDATE,
        TargetType.USER,
        user.id,
        {"roleCodes": before_codes},
        {"roleCodes": role_codes},
        "更新用户角色",
    )
    db.commit()
    return UserRoleAssignmentRead(user_id=user.id, role_codes=role_codes)


def get_user_role_codes(db: Session, user_id: int) -> list[str]:
    return list(
        db.scalars(
            select(Role.code)
            .join(UserRole, UserRole.role_id == Role.id)
            .where(UserRole.user_id == user_id)
            .order_by(Role.id)
        ).all()
    )
