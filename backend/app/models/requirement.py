from datetime import datetime

from sqlalchemy import BigInteger, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.models.base import IdMixin, TimestampMixin


class Requirement(IdMixin, TimestampMixin, Base):
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
