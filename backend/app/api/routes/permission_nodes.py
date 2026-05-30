from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import db_session, require_admin
from app.api.utils import create_audit_log, model_to_dict
from app.core.errors import ApiError
from app.core.security import Actor
from app.models.permission_node import PermissionNode
from app.schemas.base import AuditAction, TargetType
from app.schemas.permission_node import PermissionNodeCreate, PermissionNodeRead, PermissionNodeTree, PermissionNodeTreeList


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
    if payload.parent_id is not None:
        parent = db.get(PermissionNode, payload.parent_id)
        if parent is None:
            raise ApiError(404, "PERMISSION_NODE_NOT_FOUND", "父节点不存在")
        if parent.node_type == "PERMISSION":
            raise ApiError(400, "INVALID_PERMISSION_NODE_PARENT", "权限项下不能创建子节点")
        if payload.node_type == "PERMISSION" and parent.node_type != "MENU":
            raise ApiError(400, "INVALID_PERMISSION_NODE_PARENT", "权限项只能创建在菜单下")
    if payload.node_type == "PERMISSION" and payload.route_path:
        raise ApiError(400, "INVALID_PERMISSION_NODE_ROUTE", "权限项不能配置 routePath")
    node = PermissionNode(**payload.model_dump())
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
