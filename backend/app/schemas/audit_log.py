from datetime import datetime
from typing import Any

from app.schemas.base import AuditAction, CamelModel, TargetType


class AuditLogRead(CamelModel):
    id: int
    actor_id: int | None
    actor_name: str
    action: AuditAction
    target_type: TargetType
    target_id: int | None
    before_data: dict[str, Any] | None
    after_data: dict[str, Any] | None
    description: str | None
    created_at: datetime


class AuditLogList(CamelModel):
    items: list[AuditLogRead]
    total: int
