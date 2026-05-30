"""审计日志 ORM 模型模块，记录系统关键写操作的操作者、对象和变更内容。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from datetime import datetime

from sqlalchemy import JSON, BigInteger, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.models.base import ID_TYPE, IdMixin


class AuditLog(IdMixin, Base):
    """AuditLog ORM 模型，映射业务数据库表并描述字段含义。

    业务意义：承载 `AuditLog` 相关的数据边界或能力，供系统其他模块复用。
    """
    __tablename__ = "audit_logs"

    actor_id: Mapped[int | None] = mapped_column(ID_TYPE)
    actor_name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    target_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    target_id: Mapped[int | None] = mapped_column(BigInteger, index=True)
    before_data: Mapped[dict | None] = mapped_column(JSON)
    after_data: Mapped[dict | None] = mapped_column(JSON)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
