from datetime import datetime

from app.schemas.base import CamelModel, ProjectMemberStatus, ProjectRole
from app.schemas.member import MemberRead
from app.schemas.project import ProjectRead


class ProjectMemberCreate(CamelModel):
    member_id: int
    role: ProjectRole = ProjectRole.OTHER
    responsibility: str | None = None
    status: ProjectMemberStatus = ProjectMemberStatus.ACTIVE


class ProjectMemberRead(CamelModel):
    id: int
    project_id: int
    member_id: int
    role: ProjectRole
    responsibility: str | None
    joined_at: datetime | None
    left_at: datetime | None
    status: ProjectMemberStatus
    created_at: datetime
    updated_at: datetime
    member: MemberRead | None = None
    project: ProjectRead | None = None


class ProjectMemberList(CamelModel):
    items: list[ProjectMemberRead]
    total: int
