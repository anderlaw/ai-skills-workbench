from app.core.config import Settings, normalize_database_url
from app.db.session import build_engine_kwargs


def test_standard_postgres_url_uses_psycopg_driver():
    assert normalize_database_url("postgresql://user:pass@example.com/db") == (
        "postgresql+psycopg://user:pass@example.com/db"
    )


def test_neon_postgres_url_alias_uses_psycopg_driver():
    assert normalize_database_url("postgres://user:pass@example.com/db?sslmode=require") == (
        "postgresql+psycopg://user:pass@example.com/db?sslmode=require"
    )


def test_postgres_engine_pre_pings_pooled_connections():
    kwargs = build_engine_kwargs("postgresql+psycopg://user:pass@example.com/db")

    assert kwargs["pool_pre_ping"] is True
    assert kwargs["pool_recycle"] == 1800


def test_default_cors_allows_localhost_and_loopback_dev_origins():
    origins = Settings().cors_origin_list

    assert "http://localhost:5173" in origins
    assert "http://127.0.0.1:5173" in origins
