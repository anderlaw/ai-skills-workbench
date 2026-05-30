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
    return db


def get_actor_context(db: Session, user: User) -> Actor:
    roles = db.scalars(
        select(Role)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user.id, Role.status == "ACTIVE")
        .order_by(Role.id)
    ).all()
    role_ids = [role.id for role in roles]
    permission_scopes: dict[str, set[str]] = defaultdict(set)
    if role_ids:
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
    if "ADMIN" not in actor.roles:
        raise ApiError(403, "FORBIDDEN", "无权执行该操作")
    return actor


def has_permission(actor: Actor, scope: str, code: str) -> bool:
    if "ADMIN" in actor.roles:
        return True
    permission_scopes = actor.permission_scopes or {}
    return code in permission_scopes.get(scope, ())


def require_menu_permission(scope: str, code: str):
    def dependency(actor: Actor = Depends(require_actor)) -> Actor:
        if not has_permission(actor, scope, code):
            raise ApiError(403, "FORBIDDEN", "无权执行该操作")
        return actor

    return dependency
