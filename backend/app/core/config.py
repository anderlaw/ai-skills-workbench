"""读取环境配置并规范化数据库、CORS、管理员账号等运行参数。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def normalize_database_url(value: str) -> str:
    """把外部 PostgreSQL URL 规范化为 SQLAlchemy psycopg 驱动 URL。

    参数：`value` 表示待处理的字段值。
    返回：可直接传给 SQLAlchemy `create_engine` 的数据库连接字符串。
    """
    if value.startswith("postgresql://"):
        return value.replace("postgresql://", "postgresql+psycopg://", 1)
    if value.startswith("postgres://"):
        return value.replace("postgres://", "postgresql+psycopg://", 1)
    return value


class Settings(BaseSettings):
    """应用配置结构，集中描述环境变量、数据库、CORS 和管理员默认账号。

    业务意义：承载 `Settings` 相关的数据边界或能力，供系统其他模块复用。
    """
    app_name: str = "project-tracker"
    app_env: str = "local"
    database_url: str = Field(
        "postgresql+psycopg://postgres:postgres@localhost:5432/project_tracker",
        validation_alias="DATABASE_URL",
    )
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    admin_username: str = "admin"
    admin_password: str = "admin123"
    admin_display_name: str = "项目负责人"
    auth_secret: str = "change-me-in-production"
    token_expire_minutes: int = 720

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def normalized_database_url(self) -> str:
        """返回规范化后的数据库连接地址。

        参数：无。
        返回：适配 SQLAlchemy 驱动前缀的数据库 URL。
        """
        return normalize_database_url(self.database_url)

    @property
    def cors_origin_list(self) -> list[str]:
        """把逗号分隔的 CORS 配置转换为列表。

        参数：无。
        返回：去除空白和空项后的前端来源列表。
        """
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """读取并缓存应用配置。

    参数：无。
    返回：当前进程复用的 Settings 实例。
    """
    return Settings()
