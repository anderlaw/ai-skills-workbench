from fastapi import APIRouter, Depends
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.api.deps import db_session, require_admin
from app.api.utils import create_audit_log, get_or_404
from app.core.errors import ApiError
from app.core.security import Actor
from app.models.permission_node import PermissionNode
from app.models.role import Role
from app.models.role_permission_node import RolePermissionNode
from app.schemas.base import AuditAction, TargetType
from app.schemas.role import RoleList, RolePermissionUpdate, RoleRead


router = APIRouter(prefix="/roles", tags=["roles"])


@router.get("", response_model=RoleList)
def list_roles(
    db: Session = Depends(db_session),
    _: Actor = Depends(require_admin),
) -> RoleList:
    roles = db.scalars(select(Role).order_by(Role.id)).all()
    role_ids = [role.id for role in roles]
    permission_map = load_role_permission_map(db, role_ids)
    return RoleList(
        items=[to_role_read(role, permission_map.get(role.id, [])) for role in roles],
        total=len(roles),
    )


@router.put("/{role_id}/permission-nodes", response_model=RoleRead)
def update_role_permissions(
    role_id: int,
    payload: RolePermissionUpdate,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> RoleRead:
    role = get_or_404(db, Role, role_id, "role")
    if role.code == "ADMIN":
        raise ApiError(400, "ADMIN_ROLE_IMMUTABLE", "ADMIN 角色权限不可修改")
    requested_ids = sorted(set(payload.permission_node_ids))
    if requested_ids:
        found_ids = set(db.scalars(select(PermissionNode.id).where(PermissionNode.id.in_(requested_ids))).all())
        missing_ids = set(requested_ids) - found_ids
        if missing_ids:
            raise ApiError(400, "PERMISSION_NODE_NOT_FOUND", "权限节点不存在")

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


def load_role_permission_map(db: Session, role_ids: list[int]) -> dict[int, list[int]]:
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
