"""role schema 模块，定义接口请求体、响应体和字段校验结构。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from datetime import datetime

from pydantic import Field

from app.schemas.base import CamelModel


class RoleRead(CamelModel):
    """RoleRead 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `RoleRead` 相关的数据边界或能力，供系统其他模块复用。
    """
    id: int
    code: str
    name: str
    description: str | None = None
    status: str
    permission_node_ids: list[int] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class RoleList(CamelModel):
    """RoleList 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `RoleList` 相关的数据边界或能力，供系统其他模块复用。
    """
    items: list[RoleRead]
    total: int


class RoleCreate(CamelModel):
    """RoleCreate 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `RoleCreate` 相关的数据边界或能力，供系统其他模块复用。
    """
    code: str = Field(min_length=1, max_length=80)
    name: str = Field(min_length=1, max_length=120)
    description: str | None = None
    status: str = "ACTIVE"


class RoleUpdate(CamelModel):
    """RoleUpdate 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `RoleUpdate` 相关的数据边界或能力，供系统其他模块复用。
    """
    name: str = Field(min_length=1, max_length=120)
    description: str | None = None
    status: str = "ACTIVE"


class RolePermissionUpdate(CamelModel):
    """RolePermissionUpdate 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `RolePermissionUpdate` 相关的数据边界或能力，供系统其他模块复用。
    """
    permission_node_ids: list[int]
