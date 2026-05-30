"""角色接口模块，负责角色 CRUD、软删除和权限节点授权。

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
from app.models.role import Role
from app.models.role_permission_node import RolePermissionNode
from app.schemas.base import AuditAction, TargetType
from app.schemas.role import RoleCreate, RoleList, RolePermissionUpdate, RoleRead, RoleUpdate


router = APIRouter(prefix="/roles", tags=["roles"])


@router.get("", response_model=RoleList)
def list_roles(
    db: Session = Depends(db_session),
    _: Actor = Depends(require_admin),
) -> RoleList:
    """查询角色列表并附带每个角色已授权的权限节点 id。

    参数：`db` 表示数据库会话，用于查询和提交业务数据；`_` 表示依赖注入占位参数，用于触发登录或权限校验。
    返回：统一 `{ items, total }` 角色列表响应；仅 ADMIN 可访问。
    """
    roles = db.scalars(select(Role).order_by(Role.id)).all()
    role_ids = [role.id for role in roles]
    permission_map = load_role_permission_map(db, role_ids)
    return RoleList(
        items=[to_role_read(role, permission_map.get(role.id, [])) for role in roles],
        total=len(roles),
    )


@router.post("", response_model=RoleRead, status_code=201)
def create_role(
    payload: RoleCreate,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> RoleRead:
    """创建业务角色。

    参数：`payload` 表示接口请求体或业务输入数据；`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：创建后的角色；角色 code 全局唯一且创建后不可改。
    """
    exists = db.scalar(select(Role).where(Role.code == payload.code))
    if exists is not None:
        raise ApiError(409, "ROLE_CODE_EXISTS", "角色 code 已存在")
    role = Role(**payload.model_dump())
    db.add(role)
    db.flush()
    create_audit_log(
        db,
        actor,
        AuditAction.CREATE,
        TargetType.ROLE,
        role.id,
        None,
        model_to_dict(role),
        "新增角色",
    )
    db.commit()
    db.refresh(role)
    return to_role_read(role, [])


@router.put("/{role_id}", response_model=RoleRead)
def update_role(
    role_id: int,
    payload: RoleUpdate,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> RoleRead:
    """更新角色名称、描述和状态。

    参数：`role_id` 表示调用方传入的业务参数；`payload` 表示接口请求体或业务输入数据；`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：更新后的角色；ADMIN 角色受保护不可修改。
    """
    role = get_or_404(db, Role, role_id, "role")
    ensure_role_mutable(role)
    before = model_to_dict(role)
    role.name = payload.name
    role.description = payload.description
    role.status = payload.status
    db.flush()
    create_audit_log(
        db,
        actor,
        AuditAction.UPDATE,
        TargetType.ROLE,
        role.id,
        before,
        model_to_dict(role),
        "更新角色",
    )
    db.commit()
    db.refresh(role)
    permission_ids = load_role_permission_map(db, [role.id]).get(role.id, [])
    return to_role_read(role, permission_ids)


@router.delete("/{role_id}", response_model=RoleRead)
def delete_role(
    role_id: int,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> RoleRead:
    """软删除角色。

    参数：`role_id` 表示调用方传入的业务参数；`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：状态置为 DISABLED 的角色；ADMIN 角色不可删除。
    """
    role = get_or_404(db, Role, role_id, "role")
    ensure_role_mutable(role)
    before = model_to_dict(role)
    role.status = "DISABLED"
    db.flush()
    create_audit_log(
        db,
        actor,
        AuditAction.REMOVE,
        TargetType.ROLE,
        role.id,
        before,
        model_to_dict(role),
        "删除角色",
    )
    db.commit()
    db.refresh(role)
    permission_ids = load_role_permission_map(db, [role.id]).get(role.id, [])
    return to_role_read(role, permission_ids)


@router.put("/{role_id}/permission-nodes", response_model=RoleRead)
def update_role_permissions(
    role_id: int,
    payload: RolePermissionUpdate,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> RoleRead:
    """整体替换角色的权限节点授权。

    参数：`role_id` 表示调用方传入的业务参数；`payload` 表示接口请求体或业务输入数据；`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：更新授权后的角色；停用权限节点和 ADMIN 角色授权都不允许修改。
    """
    role = get_or_404(db, Role, role_id, "role")
    ensure_role_mutable(role, message="ADMIN 角色权限不可修改")
    requested_ids = sorted(set(payload.permission_node_ids))
    if requested_ids:
        # 授权前必须确认所有节点存在且启用，避免角色拿到不可见或已停用的菜单权限。
        nodes = db.scalars(select(PermissionNode).where(PermissionNode.id.in_(requested_ids))).all()
        found_by_id = {node.id: node for node in nodes}
        missing_ids = set(requested_ids) - set(found_by_id)
        if missing_ids:
            raise ApiError(400, "PERMISSION_NODE_NOT_FOUND", "权限节点不存在")
        inactive_ids = [node_id for node_id in requested_ids if found_by_id[node_id].status != "ACTIVE"]
        if inactive_ids:
            raise ApiError(400, "PERMISSION_NODE_NOT_ACTIVE", "权限节点已停用，不能授权")

    before_ids = load_role_permission_map(db, [role.id]).get(role.id, [])
    db.execute(delete(RolePermissionNode).where(RolePermissionNode.role_id == role.id))
    for node_id in requested_ids:
        db.add(RolePermissionNode(role_id=role.id, permission_node_id=node_id))
    db.flush()
    create_audit_log(
        db,
        actor,
        AuditAction.UPDATE,
        TargetType.ROLE,
        role.id,
        {"permissionNodeIds": before_ids},
        {"permissionNodeIds": requested_ids},
        "更新角色权限",
    )
    db.commit()
    return to_role_read(role, requested_ids)


def ensure_role_mutable(role: Role, message: str = "ADMIN 角色不可修改") -> None:
    """校验角色是否允许被修改。

    参数：`role` 表示角色 ORM 对象；`message` 表示调用方传入的业务参数。
    返回：无返回值；ADMIN 角色不可编辑、删除或改授权。
    """
    if role.code == "ADMIN":
        raise ApiError(400, "ADMIN_ROLE_IMMUTABLE", message)


def load_role_permission_map(db: Session, role_ids: list[int]) -> dict[int, list[int]]:
    """加载角色到权限节点 id 列表的映射。

    参数：`db` 表示数据库会话，用于查询和提交业务数据；`role_ids` 表示调用方传入的业务参数。
    返回：`role_id -> permission_node_ids` 的字典。
    """
    if not role_ids:
        return {}
    rows = db.execute(
        select(RolePermissionNode.role_id, RolePermissionNode.permission_node_id)
        .where(RolePermissionNode.role_id.in_(role_ids))
        .order_by(RolePermissionNode.permission_node_id)
    ).all()
    result: dict[int, list[int]] = {role_id: [] for role_id in role_ids}
    for role_id, permission_node_id in rows:
        result.setdefault(role_id, []).append(permission_node_id)
    return result


def to_role_read(role: Role, permission_node_ids: list[int]) -> RoleRead:
    """把角色 ORM 和授权节点 id 组合成接口响应结构。

    参数：`role` 表示角色 ORM 对象；`permission_node_ids` 表示调用方传入的业务参数。
    返回：前端角色管理页需要的 RoleRead。
    """
    return RoleRead(
        id=role.id,
        code=role.code,
        name=role.name,
        description=role.description,
        status=role.status,
        permission_node_ids=permission_node_ids,
        created_at=role.created_at,
        updated_at=role.updated_at,
    )
