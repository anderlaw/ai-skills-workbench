"""权限节点接口模块，负责目录、菜单、权限项的树形维护和校验。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

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
    """按树形结构返回所有权限节点。

    参数：`db` 表示数据库会话，用于查询和提交业务数据；`_` 表示依赖注入占位参数，用于触发登录或权限校验。
    返回：包含目录、菜单、权限项的树形列表；该接口仅 ADMIN 可访问。
    """
    nodes = db.scalars(select(PermissionNode).order_by(PermissionNode.sort_order, PermissionNode.id)).all()
    return PermissionNodeTreeList(items=build_tree(nodes), total=len(nodes))


@router.post("", response_model=PermissionNodeRead, status_code=201)
def create_permission_node(
    payload: PermissionNodeCreate,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> PermissionNode:
    """创建目录、菜单或权限项节点。

    参数：`payload` 表示接口请求体或业务输入数据；`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：创建后的权限节点；code 全局唯一，权限项只能挂在菜单下。
    """
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
    """更新权限节点的父级、展示信息、状态和排序。

    参数：`node_id` 表示调用方传入的业务参数；`payload` 表示接口请求体或业务输入数据；`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：更新后的权限节点；停用节点会同步移除角色授权关系。
    """
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
        # 停用节点不能继续出现在角色授权里，避免前端菜单和按钮误判。
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
    """软删除权限节点，并在必要时拒绝删除仍有启用子节点的父节点。

    参数：`node_id` 表示调用方传入的业务参数；`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：状态置为 DISABLED 的权限节点；同时清理角色授权关系。
    """
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
    """把权限节点平铺列表组装成前端可渲染的树。

    参数：`nodes` 表示权限节点集合。
    返回：根节点列表，每个节点都带有 children。
    """
    node_by_id = {}
    for node in nodes:
        tree_node = PermissionNodeTree.model_validate(node, from_attributes=True)
        tree_node.children = []
        node_by_id[node.id] = tree_node
    roots: list[PermissionNodeTree] = []
    for node in nodes:
        tree_node = node_by_id[node.id]
        # 使用逻辑外键 parent_id 组树；父节点缺失时退化为根节点，避免脏数据导致接口失败。
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
    """校验权限树节点的类型、父子层级、状态和路由规则。

    参数：`db` 表示数据库会话，用于查询和提交业务数据；`node_type` 表示调用方传入的业务参数；`parent_id` 表示调用方传入的业务参数；`route_path` 表示调用方传入的业务参数；`operation_level` 表示调用方传入的业务参数；`status` 表示调用方传入的业务参数；`current_node_id` 表示调用方传入的业务参数。
    返回：无返回值；非法层级、循环父级或停用父节点下启用子节点时抛出业务错误。
    """
    if node_type not in {"DIRECTORY", "MENU", "PERMISSION"}:
        raise ApiError(400, "INVALID_PERMISSION_NODE_TYPE", "权限节点类型不合法")
    if operation_level not in {"GET", "POST", "BOTH"}:
        raise ApiError(400, "INVALID_PERMISSION_NODE_OPERATION_LEVEL", "权限节点操作级别不合法")
    if status not in {"ACTIVE", "DISABLED"}:
        raise ApiError(400, "INVALID_PERMISSION_NODE_STATUS", "权限节点状态不合法")
    if node_type == "PERMISSION" and route_path:
        raise ApiError(400, "INVALID_PERMISSION_NODE_ROUTE", "权限项不能配置 routePath")
    # routePath 只对目录和菜单有业务意义，最终页面路径由目录/菜单路径拼接得到。
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
    # 权限项只允许作为菜单的子节点，目录下只能继续放目录或菜单。
    if node_type == "PERMISSION" and parent.node_type != "MENU":
        raise ApiError(400, "INVALID_PERMISSION_NODE_PARENT", "权限项只能创建在菜单下")
    if status == "ACTIVE" and parent.status != "ACTIVE":
        raise ApiError(400, "PERMISSION_NODE_PARENT_INACTIVE", "父节点已停用，不能启用当前节点")
    if current_node_id is not None:
        ensure_not_descendant_parent(db, current_node_id, parent_id)


def ensure_not_descendant_parent(db: Session, current_node_id: int, parent_id: int) -> None:
    """防止编辑节点时把父节点移动到自己的子孙节点下。

    参数：`db` 表示数据库会话，用于查询和提交业务数据；`current_node_id` 表示调用方传入的业务参数；`parent_id` 表示调用方传入的业务参数。
    返回：无返回值；检测到循环层级时抛出业务错误。
    """
    cursor: int | None = parent_id
    while cursor is not None:
        # 顺着候选父节点向上查找，只要遇到当前节点就说明会形成树环。
        if cursor == current_node_id:
            raise ApiError(400, "INVALID_PERMISSION_NODE_PARENT", "父节点不能是自己或自己的子节点")
        parent = db.get(PermissionNode, cursor)
        cursor = parent.parent_id if parent is not None else None
