from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.models.base import IdMixin, TimestampMixin


class User(IdMixin, TimestampMixin, Base):
    __tablename__ = "users"

    username: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)
    password: Mapped[str] = mapped_column(String(200), nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(40), default="ACTIVE", nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(200), index=True)
    phone: Mapped[str | None] = mapped_column(String(80))
    github_username: Mapped[str | None] = mapped_column(String(120), index=True)
    skill_direction: Mapped[str | None] = mapped_column(String(100), index=True)
    skill_level: Mapped[str | None] = mapped_column(String(40))
    remark: Mapped[str | None] = mapped_column(Text)
