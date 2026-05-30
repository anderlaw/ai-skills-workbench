from datetime import datetime

from pydantic import Field

from app.schemas.base import CamelModel


class PermissionNodeCreate(CamelModel):
    parent_id: int | None = None
    node_type: str
    name: str = Field(min_length=1, max_length=120)
    code: str = Field(min_length=1, max_length=160)
    route_path: str | None = None
    operation_level: str = "GET"
    sort_order: int = 0
    icon: str | None = None
    status: str = "ACTIVE"


class PermissionNodeUpdate(CamelModel):
    parent_id: int | None = None
    name: str = Field(min_length=1, max_length=120)
    route_path: str | None = None
    operation_level: str = "GET"
    sort_order: int = 0
    icon: str | None = None
    status: str = "ACTIVE"


class PermissionNodeRead(CamelModel):
    id: int
    parent_id: int | None = None
    node_type: str
    name: str
    code: str
    route_path: str | None = None
    operation_level: str
    sort_order: int
    icon: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime


class PermissionNodeTree(PermissionNodeRead):
    children: list["PermissionNodeTree"] = Field(default_factory=list)


class PermissionNodeTreeList(CamelModel):
    items: list[PermissionNodeTree]
    total: int
