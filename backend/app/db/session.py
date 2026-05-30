"""创建数据库 engine、Session 工厂以及测试环境重置工具。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings


settings = get_settings()


def build_engine_kwargs(database_url: str) -> dict:
    """根据数据库类型生成 SQLAlchemy engine 参数。

    参数：`database_url` 表示调用方传入的业务参数。
    返回：包含连接池和驱动兼容配置的参数字典。
    """
    engine_kwargs: dict = {"future": True}
    if database_url.startswith("sqlite"):
        engine_kwargs.update(
            {
                "connect_args": {"check_same_thread": False},
                "poolclass": StaticPool,
            }
        )
    else:
        engine_kwargs.update({"pool_pre_ping": True, "pool_recycle": 1800})
    return engine_kwargs


engine = create_engine(settings.normalized_database_url, **build_engine_kwargs(settings.normalized_database_url))
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    """为每个请求提供数据库会话并在请求结束后关闭。

    参数：无。
    返回：FastAPI 依赖使用的 Session 生成器。
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def reset_database() -> None:
    """重建数据库表结构，主要供测试环境使用。

    参数：无。
    返回：无返回值；会删除并重新创建所有 ORM 表。
    """
    from app.db.base import Base

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
