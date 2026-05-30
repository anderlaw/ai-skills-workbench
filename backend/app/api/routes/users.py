"""用户账号接口模块，负责登录账号创建、查询和角色分配。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

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
    """分页查询用户账号。

    参数：`db` 表示数据库会话，用于查询和提交业务数据；`_` 表示依赖注入占位参数，用于触发登录或权限校验；`keyword` 表示调用方传入的业务参数；`status` 表示调用方传入的业务参数；`page` 表示调用方传入的业务参数；`page_size` 表示调用方传入的业务参数。
    返回：统一 `{ items, total }` 用户账号列表响应。
    """
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
    """创建可登录用户账号并分配初始角色。

    参数：`payload` 表示接口请求体或业务输入数据；`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：创建后的用户；未指定角色时默认授予 CONTRIBUTOR。
    """
    exists = db.scalar(select(User).where(User.username == payload.username))
    if exists is not None:
        raise ApiError(409, "USER_USERNAME_EXISTS", "登录账号已存在")
    user = User(**payload.model_dump(exclude={"role_codes"}))
    db.add(user)
    db.flush()
    role_codes = payload.role_codes or ["CONTRIBUTOR"]
    # 用户和角色是多对多关系，创建账号时同步写入 user_roles 关联表。
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
    """查询用户当前拥有的角色 code。

    参数：`user_id` 表示调用方传入的业务参数；`db` 表示数据库会话，用于查询和提交业务数据；`_` 表示依赖注入占位参数，用于触发登录或权限校验。
    返回：用户 id 和角色 code 列表；用户不存在时返回 404。
    """
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
    """整体替换用户角色。

    参数：`user_id` 表示调用方传入的业务参数；`payload` 表示接口请求体或业务输入数据；`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：更新后的用户角色 code 列表；至少保留一个启用角色。
    """
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
    # 角色授权采用整体替换，前端提交的勾选结果就是最终状态。
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
    """读取用户关联的角色 code 列表。

    参数：`db` 表示数据库会话，用于查询和提交业务数据；`user_id` 表示调用方传入的业务参数。
    返回：按角色 id 排序的角色 code 列表。
    """
    return list(
        db.scalars(
            select(Role.code)
            .join(UserRole, UserRole.role_id == Role.id)
            .where(UserRole.user_id == user_id)
            .order_by(Role.id)
        ).all()
    )
