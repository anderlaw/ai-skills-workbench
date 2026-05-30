from datetime import datetime

from pydantic import Field

from app.schemas.base import CamelModel


class UserCreate(CamelModel):
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
    items: list[UserRead]
    total: int


class UserRoleUpdate(CamelModel):
    role_codes: list[str]


class UserRoleAssignmentRead(CamelModel):
    user_id: int
    role_codes: list[str]
