"""member schema 模块，定义接口请求体、响应体和字段校验结构。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from datetime import datetime

from pydantic import Field

from app.schemas.base import CamelModel, MemberStatus
from app.schemas.user import UserRead


class MemberBase(CamelModel):
    """MemberBase 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `MemberBase` 相关的数据边界或能力，供系统其他模块复用。
    """
    user_id: int
    name: str = Field(..., min_length=1, max_length=120)
    contact: str | None = None
    github_username: str | None = None
    email: str | None = None
    skill_direction: str | None = None
    skill_level: str | None = None
    status: MemberStatus = MemberStatus.ACTIVE
    remark: str | None = None


class MemberCreate(MemberBase):
    """MemberCreate 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `MemberCreate` 相关的数据边界或能力，供系统其他模块复用。
    """
    pass


class MemberUpdate(CamelModel):
    """MemberUpdate 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `MemberUpdate` 相关的数据边界或能力，供系统其他模块复用。
    """
    user_id: int | None = None
    name: str | None = Field(None, min_length=1, max_length=120)
    contact: str | None = None
    github_username: str | None = None
    email: str | None = None
    skill_direction: str | None = None
    skill_level: str | None = None
    status: MemberStatus | None = None
    remark: str | None = None


class MemberStatusUpdate(CamelModel):
    """MemberStatusUpdate 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `MemberStatusUpdate` 相关的数据边界或能力，供系统其他模块复用。
    """
    status: MemberStatus
    description: str | None = None


class MemberRead(CamelModel):
    """MemberRead 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `MemberRead` 相关的数据边界或能力，供系统其他模块复用。
    """
    id: int
    user_id: int
    name: str
    contact: str | None
    github_username: str | None
    email: str | None
    skill_direction: str | None
    skill_level: str | None
    status: MemberStatus
    remark: str | None
    created_at: datetime
    updated_at: datetime
    user: UserRead | None = None


class MemberList(CamelModel):
    """MemberList 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `MemberList` 相关的数据边界或能力，供系统其他模块复用。
    """
    items: list[MemberRead]
    total: int
