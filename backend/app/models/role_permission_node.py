from sqlalchemy import BigInteger, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.models.base import IdMixin


class RolePermissionNode(IdMixin, Base):
    __tablename__ = "role_permission_nodes"
    __table_args__ = (UniqueConstraint("role_id", "permission_node_id", name="uq_role_permission_node"),)

    role_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    permission_node_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
