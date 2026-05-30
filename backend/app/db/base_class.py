"""定义 SQLAlchemy 声明式基类，作为所有 ORM 模型的父类。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """SQLAlchemy 声明式基类，所有 ORM 模型都从这里继承。

    业务意义：承载 `Base` 相关的数据边界或能力，供系统其他模块复用。
    """
    pass
