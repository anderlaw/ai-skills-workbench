from datetime import datetime

from sqlalchemy import BigInteger, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.models.base import IdMixin, TimestampMixin


class ProjectUser(IdMixin, TimestampMixin, Base):
    __tablename__ = "project_users"
    __table_args__ = (UniqueConstraint("project_id", "user_id", name="uq_project_users_project_user"),)

    project_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    responsibility: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), default="ACTIVE", nullable=False, index=True)
    assigned_at: Mapped[datetime | None] = mapped_column()
    removed_at: Mapped[datetime | None] = mapped_column()
