from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import db_session, require_actor
from app.core.errors import ApiError
from app.core.security import Actor, create_access_token
from app.models.permission_node import PermissionNode
from app.models.role import Role
from app.models.role_permission_node import RolePermissionNode
from app.models.user import User
from app.models.user_role import UserRole
from app.schemas.auth import CurrentMenuNode, CurrentRole, CurrentUser, CurrentUserInfo, LoginRequest, LoginResponse


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(db_session)) -> LoginResponse:
    user = db.scalar(select(User).where(User.username == payload.username))
    if user is None or user.password != payload.password:
        raise ApiError(401, "INVALID_CREDENTIALS", "用户名或密码错误")
    if user.status != "ACTIVE":
        raise ApiError(401, "USER_DISABLED", "用户已被禁用")
    return LoginResponse(
        access_token=create_access_token(user.id, user.username),
        display_name=user.display_name,
    )


@router.get("/me", response_model=CurrentUser)
def me(
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_actor),
) -> CurrentUser:
    user = db.get(User, actor.id)
    if user is None:
        raise ApiError(401, "UNAUTHORIZED", "登录已失效，请重新登录")
    roles = db.scalars(
        select(Role)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user.id, Role.status == "ACTIVE")
        .order_by(Role.id)
    ).all()
    nodes = []
    if roles:
        nodes = db.scalars(
            select(PermissionNode)
            .join(RolePermissionNode, RolePermissionNode.permission_node_id == PermissionNode.id)
            .where(
                RolePermissionNode.role_id.in_([role.id for role in roles]),
                PermissionNode.status == "ACTIVE",
            )
            .order_by(PermissionNode.sort_order, PermissionNode.id)
        ).all()
    return CurrentUser(
        user=CurrentUserInfo(
            id=user.id,
            username=user.username,
            display_name=user.display_name,
            status=user.status,
        ),
        roles=[CurrentRole(id=role.id, code=role.code, name=role.name) for role in roles],
        menu_tree=build_menu_tree(nodes),
        permission_scopes=build_permission_scopes(db, nodes),
    )


def build_menu_tree(nodes: list[PermissionNode]) -> list[CurrentMenuNode]:
    visible_nodes = [node for node in nodes if node.node_type in {"DIRECTORY", "MENU"}]
    children_by_parent: dict[int | None, list[PermissionNode]] = defaultdict(list)
    for node in visible_nodes:
        children_by_parent[node.parent_id].append(node)

    def scope_for(node: PermissionNode) -> str | None:
        return node.code if node.node_type == "MENU" else None

    def build(parent_id: int | None) -> list[CurrentMenuNode]:
        return [
            CurrentMenuNode(
                id=node.id,
                parent_id=node.parent_id,
                node_type=node.node_type,
                name=node.name,
                code=node.code,
                route_path=node.route_path,
                scope=scope_for(node),
                icon=node.icon,
                sort_order=node.sort_order,
                children=build(node.id),
            )
            for node in sorted(children_by_parent.get(parent_id, []), key=lambda item: (item.sort_order, item.id))
        ]

    return build(None)


def build_permission_scopes(db: Session, nodes: list[PermissionNode]) -> dict[str, list[str]]:
    node_by_id = {node.id: node for node in nodes}
    scopes: dict[str, set[str]] = defaultdict(set)
    for node in nodes:
        if node.node_type != "PERMISSION":
            continue
        parent = node_by_id.get(node.parent_id) or db.get(PermissionNode, node.parent_id)
        if parent is not None and parent.node_type == "MENU":
            scopes[parent.code].add(node.code)
    return {scope: sorted(codes) for scope, codes in scopes.items()}
