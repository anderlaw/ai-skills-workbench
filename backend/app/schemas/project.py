"""project schema 模块，定义接口请求体、响应体和字段校验结构。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from datetime import date, datetime

from pydantic import Field

from app.schemas.base import CamelModel, OptionalUrlMixin, ProgressMixin, ProjectStatus


class ProjectBase(OptionalUrlMixin, ProgressMixin):
    """ProjectBase 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `ProjectBase` 相关的数据边界或能力，供系统其他模块复用。
    """
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
    """ProjectCreate 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `ProjectCreate` 相关的数据边界或能力，供系统其他模块复用。
    """
    pass


class ProjectUpdate(OptionalUrlMixin, CamelModel):
    """ProjectUpdate 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `ProjectUpdate` 相关的数据边界或能力，供系统其他模块复用。
    """
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
    """ProjectProgressUpdate 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `ProjectProgressUpdate` 相关的数据边界或能力，供系统其他模块复用。
    """
    progress: int = Field(..., ge=0, le=100)
    current_progress: str | None = None
    current_issues: str | None = None
    next_steps: str | None = None


class ProjectStatusUpdate(CamelModel):
    """ProjectStatusUpdate 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `ProjectStatusUpdate` 相关的数据边界或能力，供系统其他模块复用。
    """
    status: ProjectStatus
    description: str | None = None


class ProjectRead(CamelModel):
    """ProjectRead 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `ProjectRead` 相关的数据边界或能力，供系统其他模块复用。
    """
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
    """ProjectList 数据结构，定义接口请求或响应字段及校验规则。

    业务意义：承载 `ProjectList` 相关的数据边界或能力，供系统其他模块复用。
    """
    items: list[ProjectRead]
    total: int
