"""task schema 模块，定义接口请求体、响应体和字段校验结构。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from datetime import date, datetime

from pydantic import Field

from app.schemas.base import CamelModel, OptionalUrlMixin, TaskPriority, TaskStatus, TaskType
from app.schemas.member import MemberRead
from app.schemas.project import ProjectRead


class TaskBase(OptionalUrlMixin):
    """TaskBase 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `TaskBase` 相关的数据边界或能力，供系统其他模块复用。
    """
    project_id: int
    assignee_id: int | None = None
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    task_type: TaskType = TaskType.OTHER
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.TODO
    progress: int = Field(0, ge=0, le=100)
    github_issue_url: str | None = None
    pr_url: str | None = None
    submission_note: str | None = None
    current_issues: str | None = None
    due_date: date | None = None
    completed_at: datetime | None = None
    remark: str | None = None


class TaskCreate(TaskBase):
    """TaskCreate 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `TaskCreate` 相关的数据边界或能力，供系统其他模块复用。
    """
    pass


class TaskUpdate(OptionalUrlMixin, CamelModel):
    """TaskUpdate 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `TaskUpdate` 相关的数据边界或能力，供系统其他模块复用。
    """
    project_id: int | None = None
    assignee_id: int | None = None
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    task_type: TaskType | None = None
    priority: TaskPriority | None = None
    status: TaskStatus | None = None
    progress: int | None = Field(None, ge=0, le=100)
    github_issue_url: str | None = None
    pr_url: str | None = None
    submission_note: str | None = None
    current_issues: str | None = None
    due_date: date | None = None
    completed_at: datetime | None = None
    remark: str | None = None


class TaskProgressUpdate(CamelModel):
    """TaskProgressUpdate 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `TaskProgressUpdate` 相关的数据边界或能力，供系统其他模块复用。
    """
    progress: int = Field(..., ge=0, le=100)
    current_issues: str | None = None


class TaskStatusUpdate(CamelModel):
    """TaskStatusUpdate 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `TaskStatusUpdate` 相关的数据边界或能力，供系统其他模块复用。
    """
    status: TaskStatus
    description: str | None = None


class TaskSubmit(CamelModel):
    """TaskSubmit 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `TaskSubmit` 相关的数据边界或能力，供系统其他模块复用。
    """
    pr_url: str | None = None
    submission_note: str | None = None


class TaskRead(CamelModel):
    """TaskRead 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `TaskRead` 相关的数据边界或能力，供系统其他模块复用。
    """
    id: int
    project_id: int
    assignee_id: int | None
    title: str
    description: str | None
    task_type: TaskType
    priority: TaskPriority
    status: TaskStatus
    progress: int
    github_issue_url: str | None
    pr_url: str | None
    submission_note: str | None
    current_issues: str | None
    due_date: date | None
    completed_at: datetime | None
    remark: str | None
    created_at: datetime
    updated_at: datetime
    project: ProjectRead | None = None
    assignee: MemberRead | None = None


class TaskList(CamelModel):
    """TaskList 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `TaskList` 相关的数据边界或能力，供系统其他模块复用。
    """
    items: list[TaskRead]
    total: int
