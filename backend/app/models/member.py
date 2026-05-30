"""项目人员 ORM 模型模块，保存参与项目人员档案并绑定登录账号。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.models.base import ID_TYPE, IdMixin, TimestampMixin


class Member(IdMixin, TimestampMixin, Base):
    """Member ORM 模型，映射业务数据库表并描述字段含义。

    业务意义：承载 `Member` 相关的数据边界或能力，供系统其他模块复用。
    """
    __tablename__ = "members"

    user_id: Mapped[int] = mapped_column(ID_TYPE, nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    contact: Mapped[str | None] = mapped_column(String(200))
    github_username: Mapped[str | None] = mapped_column(String(120), index=True)
    email: Mapped[str | None] = mapped_column(String(200))
    skill_direction: Mapped[str | None] = mapped_column(String(100), index=True)
    skill_level: Mapped[str | None] = mapped_column(String(40))
    status: Mapped[str] = mapped_column(String(40), default="ACTIVE", nullable=False, index=True)
    remark: Mapped[str | None] = mapped_column(Text)

    user = relationship(
        "User",
        primaryjoin="User.id == foreign(Member.user_id)",
        viewonly=True,
    )

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
