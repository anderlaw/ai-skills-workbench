"""requirement schema 模块，定义接口请求体、响应体和字段校验结构。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from datetime import datetime

from pydantic import Field

from app.schemas.base import CamelModel


class RequirementCreate(CamelModel):
    """RequirementCreate 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `RequirementCreate` 相关的数据边界或能力，供系统其他模块复用。
    """
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    priority: str = "MEDIUM"
    remark: str | None = None


class RequirementUpdate(CamelModel):
    """RequirementUpdate 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `RequirementUpdate` 相关的数据边界或能力，供系统其他模块复用。
    """
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    priority: str | None = None
    remark: str | None = None


class RequirementRead(CamelModel):
    """RequirementRead 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `RequirementRead` 相关的数据边界或能力，供系统其他模块复用。
    """
    id: int
    project_id: int
    title: str
    description: str | None = None
    status: str
    priority: str
    created_by_user_id: int
    claimed_by_user_id: int | None = None
    claimed_at: datetime | None = None
    completed_at: datetime | None = None
    remark: str | None = None
    created_at: datetime
    updated_at: datetime


class RequirementList(CamelModel):
    """RequirementList 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `RequirementList` 相关的数据边界或能力，供系统其他模块复用。
    """
    items: list[RequirementRead]
    total: int
