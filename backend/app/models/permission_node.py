"""权限节点 ORM 模型模块，保存目录、菜单和权限项树。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from sqlalchemy import BigInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.models.base import IdMixin, TimestampMixin


class PermissionNode(IdMixin, TimestampMixin, Base):
    """PermissionNode ORM 模型，映射业务数据库表并描述字段含义。

    业务意义：承载 `PermissionNode` 相关的数据边界或能力，供系统其他模块复用。
    """
    __tablename__ = "permission_nodes"

    parent_id: Mapped[int | None] = mapped_column(BigInteger, index=True)
    node_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    code: Mapped[str] = mapped_column(String(160), nullable=False, unique=True, index=True)
    route_path: Mapped[str | None] = mapped_column(String(300), index=True)
    operation_level: Mapped[str] = mapped_column(String(20), default="GET", nullable=False, index=True)
    sort_order: Mapped[int] = mapped_column(default=0, nullable=False, index=True)
    icon: Mapped[str | None] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(40), default="ACTIVE", nullable=False, index=True)
