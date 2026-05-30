"""需求 ORM 模型模块，保存项目需求池中的需求、创建人和认领人。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from datetime import datetime

from sqlalchemy import BigInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.models.base import IdMixin, TimestampMixin


class Requirement(IdMixin, TimestampMixin, Base):
    """Requirement ORM 模型，映射业务数据库表并描述字段含义。

    业务意义：承载 `Requirement` 相关的数据边界或能力，供系统其他模块复用。
    """
    __tablename__ = "requirements"

    project_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), default="OPEN", nullable=False, index=True)
    priority: Mapped[str] = mapped_column(String(20), default="MEDIUM", nullable=False, index=True)
    created_by_user_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    claimed_by_user_id: Mapped[int | None] = mapped_column(BigInteger, index=True)
    claimed_at: Mapped[datetime | None] = mapped_column()
    completed_at: Mapped[datetime | None] = mapped_column()
    remark: Mapped[str | None] = mapped_column(Text)
