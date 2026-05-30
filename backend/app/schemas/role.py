from datetime import datetime

from pydantic import Field

from app.schemas.base import CamelModel


class RoleRead(CamelModel):
    id: int
    code: str
    name: str
    description: str | None = None
    status: str
    permission_node_ids: list[int] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class RoleList(CamelModel):
    items: list[RoleRead]
    total: int


class RolePermissionUpdate(CamelModel):
    permission_node_ids: list[int]
