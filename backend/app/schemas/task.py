from datetime import date, datetime

from pydantic import Field

from app.schemas.base import CamelModel, OptionalUrlMixin, TaskPriority, TaskStatus, TaskType
from app.schemas.member import MemberRead
from app.schemas.project import ProjectRead


class TaskBase(OptionalUrlMixin):
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
    pass


class TaskUpdate(OptionalUrlMixin, CamelModel):
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
    progress: int = Field(..., ge=0, le=100)
    current_issues: str | None = None


class TaskStatusUpdate(CamelModel):
    status: TaskStatus
    description: str | None = None


class TaskSubmit(CamelModel):
    pr_url: str | None = None
    submission_note: str | None = None


class TaskRead(CamelModel):
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
    items: list[TaskRead]
    total: int
