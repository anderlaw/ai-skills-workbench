"""定义统一 API 错误结构和 FastAPI 异常响应格式。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from fastapi import HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class ApiError(HTTPException):
    """统一业务异常类型，用于把错误码和中文消息返回给前端。

    业务意义：承载 `ApiError` 相关的数据边界或能力，供系统其他模块复用。
    """
    def __init__(self, status_code: int, code: str, message: str):
        """初始化统一业务异常。

        参数：`status_code` 表示调用方传入的业务参数；`code` 表示调用方传入的业务参数；`message` 表示调用方传入的业务参数。
        返回：无返回值；异常 detail 会被统一异常处理器输出给前端。
        """
        super().__init__(
            status_code=status_code,
            detail={"code": code, "message": message},
        )


async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    """把 HTTPException 转换为统一 JSON 错误结构。

    参数：`_` 表示依赖注入占位参数，用于触发登录或权限校验；`exc` 表示调用方传入的业务参数。
    返回：包含 `code` 和 `message` 的 JSONResponse。
    """
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content={"code": "HTTP_ERROR", "message": str(exc.detail)},
    )


async def validation_exception_handler(
    _: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """把请求参数校验异常转换为统一 JSON 错误结构。

    参数：`_` 表示依赖注入占位参数，用于触发登录或权限校验；`exc` 表示调用方传入的业务参数。
    返回：422 JSONResponse，并附带 Pydantic 校验错误详情。
    """
    return JSONResponse(
        status_code=422,
        content={"code": "VALIDATION_ERROR", "message": "请求参数校验失败", "errors": exc.errors()},
    )


def not_found(resource: str) -> ApiError:
    """构造统一 404 业务异常。

    参数：`resource` 表示调用方传入的业务参数。
    返回：可直接 raise 的 ApiError。
    """
    return ApiError(404, f"{resource.upper()}_NOT_FOUND", f"{resource} 不存在")
