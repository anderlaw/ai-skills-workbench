from sqlalchemy import BigInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.models.base import IdMixin, TimestampMixin


class PermissionNode(IdMixin, TimestampMixin, Base):
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
