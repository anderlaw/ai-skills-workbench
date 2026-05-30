from datetime import date, datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.base import ID_TYPE, IdMixin, TimestampMixin


class Task(IdMixin, TimestampMixin, Base):
    __tablename__ = "tasks"

    project_id: Mapped[int] = mapped_column(ID_TYPE, nullable=False, index=True)
    assignee_id: Mapped[int | None] = mapped_column(ID_TYPE, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    task_type: Mapped[str] = mapped_column(String(40), default="OTHER", nullable=False, index=True)
    priority: Mapped[str] = mapped_column(String(20), default="MEDIUM", nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(40), default="TODO", nullable=False, index=True)
    progress: Mapped[int] = mapped_column(default=0, nullable=False)
    github_issue_url: Mapped[str | None] = mapped_column(String(500))
    pr_url: Mapped[str | None] = mapped_column(String(500))
    submission_note: Mapped[str | None] = mapped_column(Text)
    current_issues: Mapped[str | None] = mapped_column(Text)
    due_date: Mapped[date | None] = mapped_column()
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    remark: Mapped[str | None] = mapped_column(Text)

    project = relationship(
        "Project",
        primaryjoin="Project.id == foreign(Task.project_id)",
        back_populates="tasks",
        viewonly=True,
    )
    assignee = relationship(
        "Member",
        primaryjoin="Member.id == foreign(Task.assignee_id)",
        back_populates="tasks",
        viewonly=True,
    )
