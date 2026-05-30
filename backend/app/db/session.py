from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings


settings = get_settings()


def build_engine_kwargs(database_url: str) -> dict:
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
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def reset_database() -> None:
    from app.db.base import Base

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
