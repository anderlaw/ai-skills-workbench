from datetime import datetime

from pydantic import Field

from app.schemas.base import CamelModel, MemberStatus


class MemberBase(CamelModel):
    name: str = Field(..., min_length=1, max_length=120)
    contact: str | None = None
    github_username: str | None = None
    email: str | None = None
    skill_direction: str | None = None
    skill_level: str | None = None
    status: MemberStatus = MemberStatus.ACTIVE
    remark: str | None = None


class MemberCreate(MemberBase):
    pass


class MemberUpdate(CamelModel):
    name: str | None = Field(None, min_length=1, max_length=120)
    contact: str | None = None
    github_username: str | None = None
    email: str | None = None
    skill_direction: str | None = None
    skill_level: str | None = None
    status: MemberStatus | None = None
    remark: str | None = None


class MemberStatusUpdate(CamelModel):
    status: MemberStatus
    description: str | None = None


class MemberRead(CamelModel):
    id: int
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


class MemberList(CamelModel):
    items: list[MemberRead]
    total: int
