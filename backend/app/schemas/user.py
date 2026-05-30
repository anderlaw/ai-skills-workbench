"""user schema 模块，定义接口请求体、响应体和字段校验结构。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from datetime import datetime

from pydantic import Field

from app.schemas.base import CamelModel


class UserCreate(CamelModel):
    """UserCreate 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `UserCreate` 相关的数据边界或能力，供系统其他模块复用。
    """
    username: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=1, max_length=200)
    display_name: str = Field(min_length=1, max_length=120)
    role_codes: list[str] = Field(default_factory=list)
    status: str = "ACTIVE"
    email: str | None = None
    phone: str | None = None
    github_username: str | None = None
    skill_direction: str | None = None
    skill_level: str | None = None
    remark: str | None = None


class UserRead(CamelModel):
    """UserRead 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `UserRead` 相关的数据边界或能力，供系统其他模块复用。
    """
    id: int
    username: str
    display_name: str
    status: str
    email: str | None = None
    phone: str | None = None
    github_username: str | None = None
    skill_direction: str | None = None
    skill_level: str | None = None
    remark: str | None = None
    created_at: datetime
    updated_at: datetime


class UserList(CamelModel):
    """UserList 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `UserList` 相关的数据边界或能力，供系统其他模块复用。
    """
    items: list[UserRead]
    total: int


class UserRoleUpdate(CamelModel):
    """UserRoleUpdate 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `UserRoleUpdate` 相关的数据边界或能力，供系统其他模块复用。
    """
    role_codes: list[str]


class UserRoleAssignmentRead(CamelModel):
    """UserRoleAssignmentRead 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `UserRoleAssignmentRead` 相关的数据边界或能力，供系统其他模块复用。
    """
    user_id: int
    role_codes: list[str]
