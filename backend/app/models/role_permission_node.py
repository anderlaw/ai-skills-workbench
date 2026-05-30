"""角色权限关系 ORM 模型模块，保存角色与权限节点的授权关系。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from sqlalchemy import BigInteger, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.models.base import IdMixin


class RolePermissionNode(IdMixin, Base):
    """RolePermissionNode ORM 模型，映射业务数据库表并描述字段含义。

    业务意义：承载 `RolePermissionNode` 相关的数据边界或能力，供系统其他模块复用。
    """
    __tablename__ = "role_permission_nodes"
    __table_args__ = (UniqueConstraint("role_id", "permission_node_id", name="uq_role_permission_node"),)

    role_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    permission_node_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
