"""审计日志查询接口模块，负责暴露关键写操作记录的只读查询能力。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

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
    """分页查询审计日志并支持目标、动作和操作者筛选。

    参数：`db` 表示数据库会话，用于查询和提交业务数据；`_` 表示依赖注入占位参数，用于触发登录或权限校验；`target_type` 表示调用方传入的业务参数；`target_id` 表示调用方传入的业务参数；`action` 表示调用方传入的业务参数；`actor_id` 表示调用方传入的业务参数；`page` 表示调用方传入的业务参数；`page_size` 表示调用方传入的业务参数。
    返回：统一 `{ items, total }` 审计日志列表响应。
    """
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
    """查询单条审计日志详情。

    参数：`audit_log_id` 表示调用方传入的业务参数；`db` 表示数据库会话，用于查询和提交业务数据；`_` 表示依赖注入占位参数，用于触发登录或权限校验。
    返回：审计日志 ORM 对象；不存在时返回统一 404。
    """
    return get_or_404(db, AuditLog, audit_log_id, "audit_log")
