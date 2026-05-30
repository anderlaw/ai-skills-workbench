"""audit_log schema 模块，定义接口请求体、响应体和字段校验结构。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from datetime import datetime
from typing import Any

from app.schemas.base import AuditAction, CamelModel, TargetType


class AuditLogRead(CamelModel):
    """AuditLogRead 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `AuditLogRead` 相关的数据边界或能力，供系统其他模块复用。
    """
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
    """AuditLogList 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `AuditLogList` 相关的数据边界或能力，供系统其他模块复用。
    """
    items: list[AuditLogRead]
    total: int
