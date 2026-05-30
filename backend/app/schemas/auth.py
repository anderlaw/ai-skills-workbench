"""auth schema 模块，定义接口请求体、响应体和字段校验结构。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from app.schemas.base import CamelModel


class LoginRequest(CamelModel):
    """LoginRequest 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `LoginRequest` 相关的数据边界或能力，供系统其他模块复用。
    """
    username: str
    password: str


class LoginResponse(CamelModel):
    """LoginResponse 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `LoginResponse` 相关的数据边界或能力，供系统其他模块复用。
    """
    access_token: str
    token_type: str = "bearer"
    display_name: str


class CurrentUserInfo(CamelModel):
    """CurrentUserInfo 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `CurrentUserInfo` 相关的数据边界或能力，供系统其他模块复用。
    """
    id: int
    username: str
    status: str
    display_name: str


class CurrentRole(CamelModel):
    """CurrentRole 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `CurrentRole` 相关的数据边界或能力，供系统其他模块复用。
    """
    id: int
    code: str
    name: str


class CurrentMenuNode(CamelModel):
    """CurrentMenuNode 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `CurrentMenuNode` 相关的数据边界或能力，供系统其他模块复用。
    """
    id: int
    parent_id: int | None = None
    node_type: str
    name: str
    code: str
    route_path: str | None = None
    scope: str | None = None
    icon: str | None = None
    sort_order: int
    children: list["CurrentMenuNode"] = []


class CurrentUser(CamelModel):
    """CurrentUser 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `CurrentUser` 相关的数据边界或能力，供系统其他模块复用。
    """
    user: CurrentUserInfo
    roles: list[CurrentRole]
    menu_tree: list[CurrentMenuNode]
    permission_scopes: dict[str, list[str]]
