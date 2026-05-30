"""permission_node schema 模块，定义接口请求体、响应体和字段校验结构。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from datetime import datetime

from pydantic import Field

from app.schemas.base import CamelModel


class PermissionNodeCreate(CamelModel):
    """PermissionNodeCreate 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `PermissionNodeCreate` 相关的数据边界或能力，供系统其他模块复用。
    """
    parent_id: int | None = None
    node_type: str
    name: str = Field(min_length=1, max_length=120)
    code: str = Field(min_length=1, max_length=160)
    route_path: str | None = None
    operation_level: str = "GET"
    sort_order: int = 0
    icon: str | None = None
    status: str = "ACTIVE"


class PermissionNodeUpdate(CamelModel):
    """PermissionNodeUpdate 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `PermissionNodeUpdate` 相关的数据边界或能力，供系统其他模块复用。
    """
    parent_id: int | None = None
    name: str = Field(min_length=1, max_length=120)
    route_path: str | None = None
    operation_level: str = "GET"
    sort_order: int = 0
    icon: str | None = None
    status: str = "ACTIVE"


class PermissionNodeRead(CamelModel):
    """PermissionNodeRead 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `PermissionNodeRead` 相关的数据边界或能力，供系统其他模块复用。
    """
    id: int
    parent_id: int | None = None
    node_type: str
    name: str
    code: str
    route_path: str | None = None
    operation_level: str
    sort_order: int
    icon: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime


class PermissionNodeTree(PermissionNodeRead):
    """PermissionNodeTree 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `PermissionNodeTree` 相关的数据边界或能力，供系统其他模块复用。
    """
    children: list["PermissionNodeTree"] = Field(default_factory=list)


class PermissionNodeTreeList(CamelModel):
    """PermissionNodeTreeList 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `PermissionNodeTreeList` 相关的数据边界或能力，供系统其他模块复用。
    """
    items: list[PermissionNodeTree]
    total: int
