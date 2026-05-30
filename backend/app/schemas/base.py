"""base schema 模块，定义接口请求体、响应体和字段校验结构。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from datetime import date, datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


def to_camel(value: str) -> str:
    """把 ORM 或内部数据转换为接口响应结构。

    参数：`value` 表示待处理的字段值。
    返回：返回 `str`，作为接口响应或内部调用结果。
    """
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class CamelModel(BaseModel):
    """CamelModel 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `CamelModel` 相关的数据边界或能力，供系统其他模块复用。
    """
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class ListResponse(CamelModel):
    """ListResponse 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `ListResponse` 相关的数据边界或能力，供系统其他模块复用。
    """
    items: list[Any]
    total: int


class ProjectStatus(str, Enum):
    """ProjectStatus 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `ProjectStatus` 相关的数据边界或能力，供系统其他模块复用。
    """
    PLANNING = "PLANNING"
    DEVELOPING = "DEVELOPING"
    TESTING = "TESTING"
    DEPLOYED = "DEPLOYED"
    DONE = "DONE"
    PAUSED = "PAUSED"
    ARCHIVED = "ARCHIVED"


class MemberStatus(str, Enum):
    """MemberStatus 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `MemberStatus` 相关的数据边界或能力，供系统其他模块复用。
    """
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    PAUSED = "PAUSED"
    LEFT = "LEFT"


class ProjectMemberStatus(str, Enum):
    """ProjectMemberStatus 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `ProjectMemberStatus` 相关的数据边界或能力，供系统其他模块复用。
    """
    ACTIVE = "ACTIVE"
    LEFT = "LEFT"


class ProjectRole(str, Enum):
    """ProjectRole 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `ProjectRole` 相关的数据边界或能力，供系统其他模块复用。
    """
    OWNER = "OWNER"
    FRONTEND = "FRONTEND"
    BACKEND = "BACKEND"
    FULLSTACK = "FULLSTACK"
    AI = "AI"
    TEST = "TEST"
    DEPLOY = "DEPLOY"
    OTHER = "OTHER"


class TaskType(str, Enum):
    """TaskType 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `TaskType` 相关的数据边界或能力，供系统其他模块复用。
    """
    FRONTEND = "FRONTEND"
    BACKEND = "BACKEND"
    AI = "AI"
    DATABASE = "DATABASE"
    DEPLOY = "DEPLOY"
    TEST = "TEST"
    DOC = "DOC"
    OTHER = "OTHER"


class TaskPriority(str, Enum):
    """TaskPriority 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `TaskPriority` 相关的数据边界或能力，供系统其他模块复用。
    """
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class TaskStatus(str, Enum):
    """TaskStatus 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `TaskStatus` 相关的数据边界或能力，供系统其他模块复用。
    """
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    BLOCKED = "BLOCKED"
    SUBMITTED = "SUBMITTED"
    REVIEWING = "REVIEWING"
    DONE = "DONE"
    CANCELLED = "CANCELLED"


class AuditAction(str, Enum):
    """AuditAction 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `AuditAction` 相关的数据边界或能力，供系统其他模块复用。
    """
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    STATUS_CHANGE = "STATUS_CHANGE"
    PROGRESS_CHANGE = "PROGRESS_CHANGE"
    ASSIGN = "ASSIGN"
    SUBMIT = "SUBMIT"
    ARCHIVE = "ARCHIVE"
    REMOVE = "REMOVE"
    CLAIM = "CLAIM"


class TargetType(str, Enum):
    """TargetType 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `TargetType` 相关的数据边界或能力，供系统其他模块复用。
    """
    PROJECT = "PROJECT"
    MEMBER = "MEMBER"
    PROJECT_MEMBER = "PROJECT_MEMBER"
    TASK = "TASK"
    USER = "USER"
    ROLE = "ROLE"
    REQUIREMENT = "REQUIREMENT"
    PERMISSION_NODE = "PERMISSION_NODE"


class TimestampFields(CamelModel):
    """TimestampFields 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `TimestampFields` 相关的数据边界或能力，供系统其他模块复用。
    """
    created_at: datetime
    updated_at: datetime


class ProgressMixin(CamelModel):
    """ProgressMixin 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `ProgressMixin` 相关的数据边界或能力，供系统其他模块复用。
    """
    progress: int = Field(0, ge=0, le=100)


def empty_to_none(value: str | None) -> str | None:
    """提供 schema 层字段转换或校验辅助能力。

    参数：`value` 表示待处理的字段值。
    返回：返回 `str | None`，作为接口响应或内部调用结果。
    """
    if value == "":
        return None
    return value


class OptionalUrlMixin(CamelModel):
    """OptionalUrlMixin 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `OptionalUrlMixin` 相关的数据边界或能力，供系统其他模块复用。
    """
    @field_validator("*", mode="before")
    @classmethod
    def normalize_empty_strings(cls, value):
        """提供 schema 层字段转换或校验辅助能力。

        参数：`value` 表示待处理的字段值。
        返回：返回接口响应、业务对象或内部处理结果，具体类型由调用场景决定。
        """
        return empty_to_none(value) if isinstance(value, str) else value


DateLike = date | None
