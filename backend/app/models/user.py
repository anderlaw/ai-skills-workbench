"""用户账号 ORM 模型模块，保存登录账号、密码、状态和人员基础资料。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.models.base import IdMixin, TimestampMixin


class User(IdMixin, TimestampMixin, Base):
    """User ORM 模型，映射业务数据库表并描述字段含义。

    业务意义：承载 `User` 相关的数据边界或能力，供系统其他模块复用。
    """
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
