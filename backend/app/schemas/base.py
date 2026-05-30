from datetime import date, datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


def to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class ListResponse(CamelModel):
    items: list[Any]
    total: int


class ProjectStatus(str, Enum):
    PLANNING = "PLANNING"
    DEVELOPING = "DEVELOPING"
    TESTING = "TESTING"
    DEPLOYED = "DEPLOYED"
    DONE = "DONE"
    PAUSED = "PAUSED"
    ARCHIVED = "ARCHIVED"


class MemberStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    PAUSED = "PAUSED"
    LEFT = "LEFT"


class ProjectMemberStatus(str, Enum):
    ACTIVE = "ACTIVE"
    LEFT = "LEFT"


class ProjectRole(str, Enum):
    OWNER = "OWNER"
    FRONTEND = "FRONTEND"
    BACKEND = "BACKEND"
    FULLSTACK = "FULLSTACK"
    AI = "AI"
    TEST = "TEST"
    DEPLOY = "DEPLOY"
    OTHER = "OTHER"


class TaskType(str, Enum):
    FRONTEND = "FRONTEND"
    BACKEND = "BACKEND"
    AI = "AI"
    DATABASE = "DATABASE"
    DEPLOY = "DEPLOY"
    TEST = "TEST"
    DOC = "DOC"
    OTHER = "OTHER"


class TaskPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class TaskStatus(str, Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    BLOCKED = "BLOCKED"
    SUBMITTED = "SUBMITTED"
    REVIEWING = "REVIEWING"
    DONE = "DONE"
    CANCELLED = "CANCELLED"


class AuditAction(str, Enum):
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
    PROJECT = "PROJECT"
    MEMBER = "MEMBER"
    PROJECT_MEMBER = "PROJECT_MEMBER"
    TASK = "TASK"
    USER = "USER"
    ROLE = "ROLE"
    REQUIREMENT = "REQUIREMENT"
    PERMISSION_NODE = "PERMISSION_NODE"


class TimestampFields(CamelModel):
    created_at: datetime
    updated_at: datetime


class ProgressMixin(CamelModel):
    progress: int = Field(0, ge=0, le=100)


def empty_to_none(value: str | None) -> str | None:
    if value == "":
        return None
    return value


class OptionalUrlMixin(CamelModel):
    @field_validator("*", mode="before")
    @classmethod
    def normalize_empty_strings(cls, value):
        return empty_to_none(value) if isinstance(value, str) else value


DateLike = date | None
