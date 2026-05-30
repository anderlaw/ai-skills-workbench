"""创建 FastAPI 应用、注册中间件、异常处理、路由和启动生命周期。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.errors import http_exception_handler, validation_exception_handler
from app.db.seed import seed_defaults
from app.db.session import SessionLocal
from app.db.session import reset_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    """初始化应用运行生命周期、依赖组件和路由挂载。

    参数：`app` 表示调用方传入的业务参数。
    返回：异步上下文管理器；启动时初始化默认数据，关闭时无额外副作用。
    """
    settings = get_settings()
    if settings.app_env == "test":
        reset_database()
    db = SessionLocal()
    try:
        seed_defaults(db)
    finally:
        db.close()
    yield


def create_app() -> FastAPI:
    """创建并配置 FastAPI 应用实例。

    参数：无。
    返回：已注册 CORS、异常处理器和 API 路由的 FastAPI 应用。
    """
    settings = get_settings()
    app = FastAPI(title=settings.app_name, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.include_router(api_router)

    @app.get("/health")
    def health() -> dict[str, str]:
        """健康检查接口。

        参数：无。
        返回：`{"status": "ok"}`，用于本地启动和部署探活。
        """
        return {"status": "ok"}

    return app


app = create_app()
