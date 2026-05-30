"""project_member schema 模块，定义接口请求体、响应体和字段校验结构。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from datetime import datetime

from app.schemas.base import CamelModel, ProjectMemberStatus, ProjectRole
from app.schemas.member import MemberRead
from app.schemas.project import ProjectRead


class ProjectMemberCreate(CamelModel):
    """ProjectMemberCreate 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `ProjectMemberCreate` 相关的数据边界或能力，供系统其他模块复用。
    """
    member_id: int
    role: ProjectRole = ProjectRole.OTHER
    responsibility: str | None = None
    status: ProjectMemberStatus = ProjectMemberStatus.ACTIVE


class ProjectMemberRead(CamelModel):
    """ProjectMemberRead 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `ProjectMemberRead` 相关的数据边界或能力，供系统其他模块复用。
    """
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
    """ProjectMemberList 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `ProjectMemberList` 相关的数据边界或能力，供系统其他模块复用。
    """
    items: list[ProjectMemberRead]
    total: int
