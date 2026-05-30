from datetime import datetime

from pydantic import Field

from app.schemas.base import CamelModel


class RequirementCreate(CamelModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None
    priority: str = "MEDIUM"
    remark: str | None = None


class RequirementUpdate(CamelModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None
    priority: str | None = None
    remark: str | None = None


class RequirementRead(CamelModel):
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
    items: list[RequirementRead]
    total: int
