"""ORM 公共 mixin 模块，提供主键和时间戳字段。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Integer, func
from sqlalchemy.orm import Mapped, mapped_column


ID_TYPE = BigInteger().with_variant(Integer, "sqlite")


class IdMixin:
    """ORM 主键 mixin，为业务表提供统一 id 字段。

    业务意义：承载 `IdMixin` 相关的数据边界或能力，供系统其他模块复用。
    """
    id: Mapped[int] = mapped_column(ID_TYPE, primary_key=True, autoincrement=True)


class TimestampMixin:
    """ORM 时间戳 mixin，为业务表提供 created_at 和 updated_at 字段。

    业务意义：承载 `TimestampMixin` 相关的数据边界或能力，供系统其他模块复用。
    """
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
