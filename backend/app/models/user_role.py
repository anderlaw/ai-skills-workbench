"""用户角色关系 ORM 模型模块，保存用户账号与角色的多对多关系。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from sqlalchemy import BigInteger, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.models.base import IdMixin


class UserRole(IdMixin, Base):
    """UserRole ORM 模型，映射业务数据库表并描述字段含义。

    业务意义：承载 `UserRole` 相关的数据边界或能力，供系统其他模块复用。
    """
    __tablename__ = "user_roles"
    __table_args__ = (UniqueConstraint("user_id", "role_id", name="uq_user_roles_user_role"),)

    user_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    role_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
