from fastapi import APIRouter, Depends
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.api.deps import db_session, require_admin
from app.api.utils import create_audit_log, get_or_404, model_to_dict
from app.core.errors import ApiError
from app.core.security import Actor
from app.models.permission_node import PermissionNode
from app.models.role_permission_node import RolePermissionNode
from app.schemas.base import AuditAction, TargetType
from app.schemas.permission_node import (
    PermissionNodeCreate,
    PermissionNodeRead,
    PermissionNodeTree,
    PermissionNodeTreeList,
    PermissionNodeUpdate,
)


router = APIRouter(prefix="/permission-nodes", tags=["permission-nodes"])


@router.get("/tree", response_model=PermissionNodeTreeList)
def list_permission_tree(
    db: Session = Depends(db_session),
    _=Depends(require_admin),
) -> PermissionNodeTreeList:
    nodes = db.scalars(select(PermissionNode).order_by(PermissionNode.sort_order, PermissionNode.id)).all()
    return PermissionNodeTreeList(items=build_tree(nodes), total=len(nodes))


@router.post("", response_model=PermissionNodeRead, status_code=201)
def create_permission_node(
    payload: PermissionNodeCreate,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> PermissionNode:
    exists = db.scalar(select(PermissionNode).where(PermissionNode.code == payload.code))
    if exists is not None:
        raise ApiError(409, "PERMISSION_NODE_CODE_EXISTS", "权限 code 已存在")
    validate_permission_node(
        db,
        node_type=payload.node_type,
        parent_id=payload.parent_id,
        route_path=payload.route_path,
        operation_level=payload.operation_level,
        status=payload.status,
    )
    data = payload.model_dump()
    data["route_path"] = None if payload.node_type == "PERMISSION" else payload.route_path
    node = PermissionNode(**data)
    db.add(node)
    db.flush()
    create_audit_log(
        db,
        actor,
        AuditAction.CREATE,
        TargetType.PERMISSION_NODE,
        node.id,
        None,
        model_to_dict(node),
        "新增权限节点",
    )
    db.commit()
    db.refresh(node)
    return node


@router.put("/{node_id}", response_model=PermissionNodeRead)
def update_permission_node(
    node_id: int,
    payload: PermissionNodeUpdate,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> PermissionNode:
    node = get_or_404(db, PermissionNode, node_id, "permission_node")
    validate_permission_node(
        db,
        node_type=node.node_type,
        parent_id=payload.parent_id,
        route_path=payload.route_path,
        operation_level=payload.operation_level,
        status=payload.status,
        current_node_id=node.id,
    )
    before = model_to_dict(node)
    node.parent_id = payload.parent_id
    node.name = payload.name
    node.route_path = None if node.node_type == "PERMISSION" else payload.route_path
    node.operation_level = payload.operation_level
    node.sort_order = payload.sort_order
    node.icon = payload.icon
    node.status = payload.status
    if node.status != "ACTIVE":
        db.execute(delete(RolePermissionNode).where(RolePermissionNode.permission_node_id == node.id))
    db.flush()
    create_audit_log(
        db,
        actor,
        AuditAction.UPDATE,
        TargetType.PERMISSION_NODE,
        node.id,
        before,
        model_to_dict(node),
        "更新权限节点",
    )
    db.commit()
    db.refresh(node)
    return node


@router.delete("/{node_id}", response_model=PermissionNodeRead)
def delete_permission_node(
    node_id: int,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> PermissionNode:
    node = get_or_404(db, PermissionNode, node_id, "permission_node")
    active_child_id = db.scalar(
        select(PermissionNode.id)
        .where(PermissionNode.parent_id == node.id, PermissionNode.status == "ACTIVE")
        .limit(1)
    )
    if active_child_id is not None:
        raise ApiError(400, "PERMISSION_NODE_HAS_ACTIVE_CHILDREN", "存在启用的子节点，不能删除")
    before = model_to_dict(node)
    node.status = "DISABLED"
    db.execute(delete(RolePermissionNode).where(RolePermissionNode.permission_node_id == node.id))
    db.flush()
    create_audit_log(
        db,
        actor,
        AuditAction.REMOVE,
        TargetType.PERMISSION_NODE,
        node.id,
        before,
        model_to_dict(node),
        "删除权限节点",
    )
    db.commit()
    db.refresh(node)
    return node


def build_tree(nodes: list[PermissionNode]) -> list[PermissionNodeTree]:
    node_by_id = {}
    for node in nodes:
        tree_node = PermissionNodeTree.model_validate(node, from_attributes=True)
        tree_node.children = []
        node_by_id[node.id] = tree_node
    roots: list[PermissionNodeTree] = []
    for node in nodes:
        tree_node = node_by_id[node.id]
        if node.parent_id and node.parent_id in node_by_id:
            node_by_id[node.parent_id].children.append(tree_node)
        else:
            roots.append(tree_node)
    return roots


def validate_permission_node(
    db: Session,
    *,
    node_type: str,
    parent_id: int | None,
    route_path: str | None,
    operation_level: str,
    status: str,
    current_node_id: int | None = None,
) -> None:
    if node_type not in {"DIRECTORY", "MENU", "PERMISSION"}:
        raise ApiError(400, "INVALID_PERMISSION_NODE_TYPE", "权限节点类型不合法")
    if operation_level not in {"GET", "POST", "BOTH"}:
        raise ApiError(400, "INVALID_PERMISSION_NODE_OPERATION_LEVEL", "权限节点操作级别不合法")
    if status not in {"ACTIVE", "DISABLED"}:
        raise ApiError(400, "INVALID_PERMISSION_NODE_STATUS", "权限节点状态不合法")
    if node_type == "PERMISSION" and route_path:
        raise ApiError(400, "INVALID_PERMISSION_NODE_ROUTE", "权限项不能配置 routePath")
    if parent_id is None:
        if node_type == "PERMISSION":
            raise ApiError(400, "INVALID_PERMISSION_NODE_PARENT", "权限项只能创建在菜单下")
        return
    if current_node_id is not None and parent_id == current_node_id:
        raise ApiError(400, "INVALID_PERMISSION_NODE_PARENT", "父节点不能是自己或自己的子节点")
    parent = db.get(PermissionNode, parent_id)
    if parent is None:
        raise ApiError(404, "PERMISSION_NODE_NOT_FOUND", "父节点不存在")
    if parent.node_type == "PERMISSION":
        raise ApiError(400, "INVALID_PERMISSION_NODE_PARENT", "权限项下不能创建子节点")
    if node_type == "PERMISSION" and parent.node_type != "MENU":
        raise ApiError(400, "INVALID_PERMISSION_NODE_PARENT", "权限项只能创建在菜单下")
    if status == "ACTIVE" and parent.status != "ACTIVE":
        raise ApiError(400, "PERMISSION_NODE_PARENT_INACTIVE", "父节点已停用，不能启用当前节点")
    if current_node_id is not None:
        ensure_not_descendant_parent(db, current_node_id, parent_id)


def ensure_not_descendant_parent(db: Session, current_node_id: int, parent_id: int) -> None:
    cursor: int | None = parent_id
    while cursor is not None:
        if cursor == current_node_id:
            raise ApiError(400, "INVALID_PERMISSION_NODE_PARENT", "父节点不能是自己或自己的子节点")
        parent = db.get(PermissionNode, cursor)
        cursor = parent.parent_id if parent is not None else None
