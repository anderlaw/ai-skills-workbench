from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.base import IdMixin, TimestampMixin


class Member(IdMixin, TimestampMixin, Base):
    __tablename__ = "members"

    name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    contact: Mapped[str | None] = mapped_column(String(200))
    github_username: Mapped[str | None] = mapped_column(String(120), index=True)
    email: Mapped[str | None] = mapped_column(String(200))
    skill_direction: Mapped[str | None] = mapped_column(String(100), index=True)
    skill_level: Mapped[str | None] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(40), default="ACTIVE", nullable=False, index=True)
    remark: Mapped[str | None] = mapped_column(Text)

    projects = relationship(
        "ProjectMember",
        primaryjoin="Member.id == foreign(ProjectMember.member_id)",
        back_populates="member",
        viewonly=True,
    )
    tasks = relationship(
        "Task",
        primaryjoin="Member.id == foreign(Task.assignee_id)",
        back_populates="assignee",
        viewonly=True,
    )
