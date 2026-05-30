"""dashboard schema 模块，定义接口请求体、响应体和字段校验结构。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from app.schemas.audit_log import AuditLogRead
from app.schemas.base import CamelModel
from app.schemas.project import ProjectRead
from app.schemas.task import TaskRead


class DashboardSummary(CamelModel):
    """DashboardSummary 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `DashboardSummary` 相关的数据边界或能力，供系统其他模块复用。
    """
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
    """StatusCount 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `StatusCount` 相关的数据边界或能力，供系统其他模块复用。
    """
    status: str
    total: int


class StatusCountList(CamelModel):
    """StatusCountList 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `StatusCountList` 相关的数据边界或能力，供系统其他模块复用。
    """
    items: list[StatusCount]
    total: int


class RecentProjects(CamelModel):
    """RecentProjects 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `RecentProjects` 相关的数据边界或能力，供系统其他模块复用。
    """
    items: list[ProjectRead]
    total: int


class DashboardTasks(CamelModel):
    """DashboardTasks 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `DashboardTasks` 相关的数据边界或能力，供系统其他模块复用。
    """
    items: list[TaskRead]
    total: int


class RecentAuditLogs(CamelModel):
    """RecentAuditLogs 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `RecentAuditLogs` 相关的数据边界或能力，供系统其他模块复用。
    """
    items: list[AuditLogRead]
    total: int
