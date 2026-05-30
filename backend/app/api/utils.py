from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy import Select, func, inspect, select
from sqlalchemy.orm import Session

from app.core.errors import not_found
from app.core.security import Actor
from app.models.audit_log import AuditLog
from app.schemas.base import AuditAction, TargetType


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def model_to_dict(model: Any | None) -> dict[str, Any] | None:
    if model is None:
        return None
    data = {}
    for attr in inspect(model).mapper.column_attrs:
        data[attr.key] = jsonable(getattr(model, attr.key))
    return data


def jsonable(value: Any) -> Any:
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
    instance = db.get(model, object_id)
    if instance is None:
        raise not_found(resource)
    return instance


def apply_pagination(db: Session, stmt: Select, page: int, page_size: int):
    count_stmt = select(func.count()).select_from(stmt.order_by(None).subquery())
    total = db.scalar(count_stmt) or 0
    items = db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).all()
    return items, total


def update_model(instance: Any, data: dict[str, Any]) -> None:
    for key, value in data.items():
        setattr(instance, key, value)
