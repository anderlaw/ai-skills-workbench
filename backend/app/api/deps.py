"""提供请求依赖、登录用户解析、角色权限上下文和菜单权限校验。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from collections import defaultdict

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.core.security import Actor, verify_access_token
from app.db.session import get_db
from app.models.permission_node import PermissionNode
from app.models.role import Role
from app.models.role_permission_node import RolePermissionNode
from app.models.user import User
from app.models.user_role import UserRole


bearer = HTTPBearer(auto_error=False)


def db_session(db: Session = Depends(get_db)) -> Session:
    """把底层数据库 Session 暴露给路由依赖。

    参数：`db` 表示数据库会话，用于查询和提交业务数据。
    返回：当前请求生命周期内的数据库 Session。
    """
    return db


def get_actor_context(db: Session, user: User) -> Actor:
    """根据用户账号重新装配当前请求的角色和菜单权限 scope。

    参数：`db` 表示数据库会话，用于查询和提交业务数据；`user` 表示用户账号 ORM 对象或当前用户信息。
    返回：包含用户、角色 code 和 `菜单 code -> 权限 code` 映射的操作者上下文。
    """
    # token 只存身份，权限和状态每次都从数据库读取，避免禁用账号或调整角色后仍可继续操作。
    roles = db.scalars(
        select(Role)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user.id, Role.status == "ACTIVE")
        .order_by(Role.id)
    ).all()
    role_ids = [role.id for role in roles]
    permission_scopes: dict[str, set[str]] = defaultdict(set)
    if role_ids:
        # 只加载启用权限节点，停用节点不会再参与后端按钮级权限判断。
        nodes = db.scalars(
            select(PermissionNode)
            .join(RolePermissionNode, RolePermissionNode.permission_node_id == PermissionNode.id)
            .where(
                RolePermissionNode.role_id.in_(role_ids),
                PermissionNode.status == "ACTIVE",
            )
            .order_by(PermissionNode.sort_order, PermissionNode.id)
        ).all()
        node_by_id = {node.id: node for node in nodes}
        for node in nodes:
            if node.node_type != "PERMISSION":
                continue
            # 权限项的 scope 由所属菜单 code 决定，前端 `useMenuPerm(scope)` 也按这个结构判断按钮权限。
            parent = node_by_id.get(node.parent_id) or db.get(PermissionNode, node.parent_id)
            if parent is not None and parent.node_type == "MENU":
                permission_scopes[parent.code].add(node.code)

    return Actor(
        id=user.id,
        username=user.username,
        name=user.display_name,
        roles=tuple(role.code for role in roles),
        permission_scopes={scope: tuple(sorted(codes)) for scope, codes in permission_scopes.items()},
    )


def require_actor(
    db: Session = Depends(db_session),
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> Actor:
    """校验 Bearer token 并返回当前登录操作者。

    参数：`db` 表示数据库会话，用于查询和提交业务数据；`credentials` 表示Bearer token 凭证。
    返回：当前登录用户的 Actor；token 缺失、过期、账号禁用时抛出 401。
    """
    if credentials is None:
        raise ApiError(401, "UNAUTHORIZED", "请先登录")
    token_payload = verify_access_token(credentials.credentials)
    if token_payload is None:
        raise ApiError(401, "UNAUTHORIZED", "登录已失效，请重新登录")
    user = db.get(User, token_payload.user_id)
    if user is None or user.username != token_payload.username:
        raise ApiError(401, "UNAUTHORIZED", "登录已失效，请重新登录")
    if user.status != "ACTIVE":
        raise ApiError(401, "USER_DISABLED", "用户已被禁用")
    return get_actor_context(db, user)


def require_admin(actor: Actor = Depends(require_actor)) -> Actor:
    """限制接口只能由 ADMIN 角色调用。

    参数：`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：通过 ADMIN 校验后的 Actor；非管理员抛出 403。
    """
    if "ADMIN" not in actor.roles:
        raise ApiError(403, "FORBIDDEN", "无权执行该操作")
    return actor


def has_permission(actor: Actor, scope: str, code: str) -> bool:
    """判断当前操作者是否拥有某个菜单 scope 下的权限 code。

    参数：`actor` 表示当前登录用户上下文，用于权限判断和审计记录；`scope` 表示调用方传入的业务参数；`code` 表示调用方传入的业务参数。
    返回：拥有权限返回 True，否则返回 False；ADMIN 永远返回 True。
    """
    if "ADMIN" in actor.roles:
        return True
    permission_scopes = actor.permission_scopes or {}
    return code in permission_scopes.get(scope, ())


def require_menu_permission(scope: str, code: str):
    """生成菜单权限依赖，用于需要按钮级权限控制的接口。

    参数：`scope` 表示调用方传入的业务参数；`code` 表示调用方传入的业务参数。
    返回：可被 FastAPI Depends 使用的依赖函数。
    """
    def dependency(actor: Actor = Depends(require_actor)) -> Actor:
        """执行具体的 scope/code 校验。

        参数：`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
        返回：通过权限校验后的 Actor；没有权限时抛出 403。
        """
        if not has_permission(actor, scope, code):
            raise ApiError(403, "FORBIDDEN", "无权执行该操作")
        return actor

    return dependency
