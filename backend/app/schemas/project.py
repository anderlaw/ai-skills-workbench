from datetime import date, datetime

from pydantic import Field

from app.schemas.base import CamelModel, OptionalUrlMixin, ProgressMixin, ProjectStatus


class ProjectBase(OptionalUrlMixin, ProgressMixin):
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    project_type: str | None = None
    tech_stack: list[str] = Field(default_factory=list)
    feature_points: str | None = None
    github_url: str | None = None
    deploy_url: str | None = None
    status: ProjectStatus = ProjectStatus.PLANNING
    current_progress: str | None = None
    current_issues: str | None = None
    next_steps: str | None = None
    start_date: date | None = None
    expected_finish_date: date | None = None
    actual_finish_date: date | None = None
    remark: str | None = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(OptionalUrlMixin, CamelModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    project_type: str | None = None
    tech_stack: list[str] | None = None
    feature_points: str | None = None
    github_url: str | None = None
    deploy_url: str | None = None
    status: ProjectStatus | None = None
    progress: int | None = Field(None, ge=0, le=100)
    current_progress: str | None = None
    current_issues: str | None = None
    next_steps: str | None = None
    start_date: date | None = None
    expected_finish_date: date | None = None
    actual_finish_date: date | None = None
    remark: str | None = None


class ProjectProgressUpdate(CamelModel):
    progress: int = Field(..., ge=0, le=100)
    current_progress: str | None = None


class ProjectStatusUpdate(CamelModel):
    status: ProjectStatus
    description: str | None = None


class ProjectRead(CamelModel):
    id: int
    name: str
    description: str | None
    project_type: str | None
    tech_stack: list[str]
    feature_points: str | None
    github_url: str | None
    deploy_url: str | None
    status: ProjectStatus
    progress: int
    current_progress: str | None
    current_issues: str | None
    next_steps: str | None
    start_date: date | None
    expected_finish_date: date | None
    actual_finish_date: date | None
    remark: str | None
    created_at: datetime
    updated_at: datetime


class ProjectList(CamelModel):
    items: list[ProjectRead]
    total: int
