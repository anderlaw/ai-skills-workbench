from datetime import date

from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.base import IdMixin, TimestampMixin


class Project(IdMixin, TimestampMixin, Base):
    __tablename__ = "projects"

    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    project_type: Mapped[str | None] = mapped_column(String(100), index=True)
    tech_stack: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    feature_points: Mapped[str | None] = mapped_column(Text)
    github_url: Mapped[str | None] = mapped_column(String(500))
    deploy_url: Mapped[str | None] = mapped_column(String(500))
    status: Mapped[str] = mapped_column(String(40), default="PLANNING", nullable=False, index=True)
    progress: Mapped[int] = mapped_column(default=0, nullable=False)
    current_progress: Mapped[str | None] = mapped_column(Text)
    current_issues: Mapped[str | None] = mapped_column(Text)
    next_steps: Mapped[str | None] = mapped_column(Text)
    start_date: Mapped[date | None] = mapped_column()
    expected_finish_date: Mapped[date | None] = mapped_column()
    actual_finish_date: Mapped[date | None] = mapped_column()
    remark: Mapped[str | None] = mapped_column(Text)

    members = relationship(
        "ProjectMember",
        primaryjoin="Project.id == foreign(ProjectMember.project_id)",
        back_populates="project",
        viewonly=True,
    )
    tasks = relationship(
        "Task",
        primaryjoin="Project.id == foreign(Task.project_id)",
        back_populates="project",
        viewonly=True,
    )
