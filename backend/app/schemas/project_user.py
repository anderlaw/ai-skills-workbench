from datetime import datetime

from app.schemas.base import CamelModel


class ProjectUserCreate(CamelModel):
    user_id: int
    responsibility: str | None = None
    status: str = "ACTIVE"


class ProjectUserRead(CamelModel):
    id: int
    project_id: int
    user_id: int
    responsibility: str | None = None
    status: str
    assigned_at: datetime | None = None
    removed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class ProjectUserList(CamelModel):
    items: list[ProjectUserRead]
    total: int
