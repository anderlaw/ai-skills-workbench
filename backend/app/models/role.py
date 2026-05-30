"""角色 ORM 模型模块，保存系统角色及状态。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.models.base import IdMixin, TimestampMixin


class Role(IdMixin, TimestampMixin, Base):
    """Role ORM 模型，映射业务数据库表并描述字段含义。

    业务意义：承载 `Role` 相关的数据边界或能力，供系统其他模块复用。
    """
    __tablename__ = "roles"

    code: Mapped[str] = mapped_column(String(80), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), default="ACTIVE", nullable=False, index=True)
