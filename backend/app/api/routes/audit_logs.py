from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import db_session, require_actor
from app.api.utils import apply_pagination, get_or_404
from app.core.security import Actor
from app.models.audit_log import AuditLog
from app.schemas.audit_log import AuditLogList, AuditLogRead


router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


@router.get("", response_model=AuditLogList)
def list_audit_logs(
    db: Session = Depends(db_session),
    _: Actor = Depends(require_actor),
    target_type: str | None = Query(None, alias="targetType"),
    target_id: int | None = Query(None, alias="targetId"),
    action: str | None = None,
    actor_id: int | None = Query(None, alias="actorId"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
) -> AuditLogList:
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc(), AuditLog.id.desc())
    if target_type:
        stmt = stmt.where(AuditLog.target_type == target_type)
    if target_id:
        stmt = stmt.where(AuditLog.target_id == target_id)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    if actor_id:
        stmt = stmt.where(AuditLog.actor_id == actor_id)
    items, total = apply_pagination(db, stmt, page, page_size)
    return AuditLogList(items=items, total=total)


@router.get("/{audit_log_id}", response_model=AuditLogRead)
def get_audit_log(
    audit_log_id: int,
    db: Session = Depends(db_session),
    _: Actor = Depends(require_actor),
) -> AuditLog:
    return get_or_404(db, AuditLog, audit_log_id, "audit_log")
