"""提供 API 层通用工具，包括审计日志、分页、模型更新和 404 处理。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy import Select, func, inspect, select
from sqlalchemy.orm import Session

from app.core.errors import not_found
from app.core.security import Actor
from app.models.audit_log import AuditLog
from app.schemas.base import AuditAction, TargetType


def utcnow() -> datetime:
    """返回带时区的 UTC 当前时间。

    参数：无。
    返回：用于模型时间字段和审计记录的 aware datetime。
    """
    return datetime.now(timezone.utc)


def model_to_dict(model: Any | None) -> dict[str, Any] | None:
    """把 SQLAlchemy 模型当前列值转换为可审计的字典。

    参数：`model` 表示ORM 模型类或实例。
    返回：模型列字段字典；传入 None 时返回 None。
    """
    if model is None:
        return None
    data = {}
    for attr in inspect(model).mapper.column_attrs:
        data[attr.key] = jsonable(getattr(model, attr.key))
    return data


def jsonable(value: Any) -> Any:
    """把日期、列表和字典递归转换为 JSON 可序列化值。

    参数：`value` 表示待处理的字段值。
    返回：可安全写入 JSON/JSONB 的值。
    """
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, list):
        return [jsonable(item) for item in value]
    if isinstance(value, dict):
        return {key: jsonable(item) for key, item in value.items()}
    return value


def create_audit_log(
    db: Session,
    actor: Actor,
    action: AuditAction,
    target_type: TargetType,
    target_id: int | None,
    before: dict[str, Any] | None,
    after: dict[str, Any] | None,
    description: str | None = None,
) -> None:
    """创建一条审计日志记录。

    参数：`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录；`action` 表示调用方传入的业务参数；`target_type` 表示调用方传入的业务参数；`target_id` 表示调用方传入的业务参数；`before` 表示调用方传入的业务参数；`after` 表示调用方传入的业务参数；`description` 表示调用方传入的业务参数。
    返回：无返回值；调用方负责在业务事务中提交。
    """
    db.add(
        AuditLog(
            actor_id=actor.id,
            actor_name=actor.name,
            action=action.value,
            target_type=target_type.value,
            target_id=target_id,
            before_data=before,
            after_data=after,
            description=description,
        )
    )


def get_or_404(db: Session, model, object_id: int, resource: str):
    """按主键查询 ORM 实例，找不到时抛出统一 404。

    参数：`db` 表示数据库会话，用于查询和提交业务数据；`model` 表示ORM 模型类或实例；`object_id` 表示调用方传入的业务参数；`resource` 表示调用方传入的业务参数。
    返回：对应 ORM 实例；找不到时抛出统一 404 业务异常。
    """
    instance = db.get(model, object_id)
    if instance is None:
        raise not_found(resource)
    return instance


def apply_pagination(db: Session, stmt: Select, page: int, page_size: int):
    """对 SQLAlchemy 查询应用分页并返回总数。

    参数：`db` 表示数据库会话，用于查询和提交业务数据；`stmt` 表示调用方传入的业务参数；`page` 表示调用方传入的业务参数；`page_size` 表示调用方传入的业务参数。
    返回：`(items, total)`，供列表接口包装为统一响应。
    """
    count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
    total = db.scalar(count_stmt) or 0
    items = db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).all()
    return items, total


def update_model(instance: Any, data: dict[str, Any]) -> None:
    """按字典字段批量更新 ORM 实例。

    参数：`instance` 表示待更新的 ORM 实例；`data` 表示待写入或返回的业务数据。
    返回：无返回值；仅修改传入 data 中包含的字段。
    """
    for key, value in data.items():
        setattr(instance, key, value)
