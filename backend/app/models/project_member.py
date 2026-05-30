"""项目人员关系 ORM 模型模块，保存项目与项目人员的职责和状态。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from datetime import datetime

from sqlalchemy import DateTime, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.base import ID_TYPE, IdMixin, TimestampMixin


class ProjectMember(IdMixin, TimestampMixin, Base):
    """ProjectMember ORM 模型，映射业务数据库表并描述字段含义。

    业务意义：承载 `ProjectMember` 相关的数据边界或能力，供系统其他模块复用。
    """
    __tablename__ = "project_members"
    __table_args__ = (UniqueConstraint("project_id", "member_id", name="uq_project_member"),)

    project_id: Mapped[int] = mapped_column(ID_TYPE, nullable=False, index=True)
    member_id: Mapped[int] = mapped_column(ID_TYPE, nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(40), default="OTHER", nullable=False, index=True)
    responsibility: Mapped[str | None] = mapped_column(Text)
    joined_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    left_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(40), default="ACTIVE", nullable=False, index=True)

    project = relationship(
        "Project",
        primaryjoin="Project.id == foreign(ProjectMember.project_id)",
        back_populates="members",
        viewonly=True,
    )
    member = relationship(
        "Member",
        primaryjoin="Member.id == foreign(ProjectMember.member_id)",
        back_populates="projects",
        viewonly=True,
    )
