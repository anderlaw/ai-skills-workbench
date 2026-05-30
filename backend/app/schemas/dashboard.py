from app.schemas.audit_log import AuditLogRead
from app.schemas.base import CamelModel
from app.schemas.project import ProjectRead
from app.schemas.task import TaskRead


class DashboardSummary(CamelModel):
    project_total: int
    developing_project_total: int
    deployed_project_total: int
    done_project_total: int
    paused_project_total: int
    member_total: int
    active_member_total: int
    task_total: int
    in_progress_task_total: int
    blocked_task_total: int
    done_task_total: int
    pending_submission_task_total: int
    submitted_task_total: int
    requirement_total: int
    open_requirement_total: int
    claimed_requirement_total: int
    average_project_progress: float


class StatusCount(CamelModel):
    status: str
    total: int


class StatusCountList(CamelModel):
    items: list[StatusCount]
    total: int


class RecentProjects(CamelModel):
    items: list[ProjectRead]
    total: int


class DashboardTasks(CamelModel):
    items: list[TaskRead]
    total: int


class RecentAuditLogs(CamelModel):
    items: list[AuditLogRead]
    total: int
