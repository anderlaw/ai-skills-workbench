"""任务接口模块，负责任务 CRUD、负责人、状态、进度和提交信息维护。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from datetime import timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import db_session, require_actor, require_admin
from app.api.utils import apply_pagination, create_audit_log, get_or_404, model_to_dict, update_model, utcnow
from app.core.security import Actor
from app.models.member import Member
from app.models.project import Project
from app.models.task import Task
from app.schemas.base import AuditAction, TargetType
from app.schemas.task import (
    TaskCreate,
    TaskList,
    TaskProgressUpdate,
    TaskRead,
    TaskStatusUpdate,
    TaskSubmit,
    TaskUpdate,
)


router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=TaskList)
def list_tasks(
    db: Session = Depends(db_session),
    _: Actor = Depends(require_actor),
    project_id: int | None = Query(None, alias="projectId"),
    project_id_snake: int | None = Query(None, alias="project_id"),
    assignee_id: int | None = Query(None, alias="assigneeId"),
    assignee_id_snake: int | None = Query(None, alias="assignee_id"),
    status: str | None = None,
    task_type: str | None = Query(None, alias="taskType"),
    priority: str | None = None,
    keyword: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
) -> TaskList:
    """分页查询任务列表并支持项目、负责人、状态、类型、优先级和关键字筛选。

    参数：`db` 表示数据库会话，用于查询和提交业务数据；`_` 表示依赖注入占位参数，用于触发登录或权限校验；`project_id` 表示调用方传入的业务参数；`project_id_snake` 表示调用方传入的业务参数；`assignee_id` 表示调用方传入的业务参数；`assignee_id_snake` 表示调用方传入的业务参数；`status` 表示调用方传入的业务参数；`task_type` 表示调用方传入的业务参数；`priority` 表示调用方传入的业务参数；`keyword` 表示调用方传入的业务参数；`page` 表示调用方传入的业务参数；`page_size` 表示调用方传入的业务参数。
    返回：统一 `{ items, total }` 任务列表响应，包含项目和负责人信息。
    """
    effective_project_id = project_id or project_id_snake
    effective_assignee_id = assignee_id or assignee_id_snake
    stmt = (
        select(Task)
        .options(joinedload(Task.project), joinedload(Task.assignee))
        .order_by(Task.updated_at.desc(), Task.id.desc())
    )
    if effective_project_id:
        stmt = stmt.where(Task.project_id == effective_project_id)
    if effective_assignee_id:
        stmt = stmt.where(Task.assignee_id == effective_assignee_id)
    if status:
        stmt = stmt.where(Task.status == status)
    if task_type:
        stmt = stmt.where(Task.task_type == task_type)
    if priority:
        stmt = stmt.where(Task.priority == priority)
    if keyword:
        pattern = f"%{keyword}%"
        stmt = stmt.where(or_(Task.title.ilike(pattern), Task.description.ilike(pattern)))
    items, total = apply_pagination(db, stmt, page, page_size)
    return TaskList(items=items, total=total)


def validate_task_refs(db: Session, payload: TaskCreate | TaskUpdate) -> None:
    """校验任务引用的项目和负责人是否存在。

    参数：`db` 表示数据库会话，用于查询和提交业务数据；`payload` 表示接口请求体或业务输入数据。
    返回：无返回值；项目或负责人不存在时抛出统一 404。
    """
    data = payload.model_dump(exclude_unset=True)
    if data.get("project_id") is not None:
        get_or_404(db, Project, data["project_id"], "project")
    if data.get("assignee_id") is not None:
        get_or_404(db, Member, data["assignee_id"], "member")


@router.post("", response_model=TaskRead, status_code=201)
def create_task(
    payload: TaskCreate,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> Task:
    """创建任务并可指定项目和负责人。

    参数：`payload` 表示接口请求体或业务输入数据；`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：创建后的任务，包含项目和负责人信息；仅 ADMIN 可调用。
    """
    validate_task_refs(db, payload)
    task = Task(**payload.model_dump())
    db.add(task)
    db.flush()
    create_audit_log(db, actor, AuditAction.CREATE, TargetType.TASK, task.id, None, model_to_dict(task))
    db.commit()
    return db.scalar(
        select(Task).options(joinedload(Task.project), joinedload(Task.assignee)).where(Task.id == task.id)
    )


@router.get("/{task_id}", response_model=TaskRead)
def get_task(task_id: int, db: Session = Depends(db_session), _: Actor = Depends(require_actor)) -> Task:
    """查询任务详情。

    参数：`task_id` 表示调用方传入的业务参数；`db` 表示数据库会话，用于查询和提交业务数据；`_` 表示依赖注入占位参数，用于触发登录或权限校验。
    返回：任务 ORM 对象，包含项目和负责人；不存在时返回统一 404。
    """
    task = db.scalar(
        select(Task).options(joinedload(Task.project), joinedload(Task.assignee)).where(Task.id == task_id)
    )
    if task is None:
        return get_or_404(db, Task, task_id, "task")
    return task


@router.put("/{task_id}", response_model=TaskRead)
def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> Task:
    """更新任务基础信息和负责人。

    参数：`task_id` 表示调用方传入的业务参数；`payload` 表示接口请求体或业务输入数据；`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：更新后的任务；负责人变化时审计动作记录为 ASSIGN。
    """
    validate_task_refs(db, payload)
    task = get_or_404(db, Task, task_id, "task")
    before = model_to_dict(task)
    data = payload.model_dump(exclude_unset=True)
    action = AuditAction.ASSIGN if "assignee_id" in data and data["assignee_id"] != before.get("assignee_id") else AuditAction.UPDATE
    update_model(task, data)
    db.flush()
    create_audit_log(db, actor, action, TargetType.TASK, task.id, before, model_to_dict(task))
    db.commit()
    return db.scalar(
        select(Task).options(joinedload(Task.project), joinedload(Task.assignee)).where(Task.id == task.id)
    )


@router.patch("/{task_id}/progress", response_model=TaskRead)
def update_task_progress(
    task_id: int,
    payload: TaskProgressUpdate,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> Task:
    """更新任务进度和当前问题。

    参数：`task_id` 表示调用方传入的业务参数；`payload` 表示接口请求体或业务输入数据；`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：更新后的任务，并记录进度变更审计日志。
    """
    task = get_or_404(db, Task, task_id, "task")
    before = model_to_dict(task)
    task.progress = payload.progress
    if payload.current_issues is not None:
        task.current_issues = payload.current_issues
    db.flush()
    create_audit_log(
        db,
        actor,
        AuditAction.PROGRESS_CHANGE,
        TargetType.TASK,
        task.id,
        before,
        model_to_dict(task),
        payload.current_issues,
    )
    db.commit()
    return db.scalar(
        select(Task).options(joinedload(Task.project), joinedload(Task.assignee)).where(Task.id == task.id)
    )


@router.patch("/{task_id}/status", response_model=TaskRead)
def update_task_status(
    task_id: int,
    payload: TaskStatusUpdate,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> Task:
    """更新任务状态。

    参数：`task_id` 表示调用方传入的业务参数；`payload` 表示接口请求体或业务输入数据；`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：更新后的任务；标记 DONE 时同步完成时间和 100% 进度。
    """
    task = get_or_404(db, Task, task_id, "task")
    before = model_to_dict(task)
    task.status = payload.status.value
    if payload.status.value == "DONE":
        # 完成态是任务生命周期终点，后端统一补齐完成时间和进度。
        task.completed_at = utcnow()
        task.progress = 100
    db.flush()
    create_audit_log(
        db,
        actor,
        AuditAction.STATUS_CHANGE,
        TargetType.TASK,
        task.id,
        before,
        model_to_dict(task),
        payload.description,
    )
    db.commit()
    return db.scalar(
        select(Task).options(joinedload(Task.project), joinedload(Task.assignee)).where(Task.id == task.id)
    )


@router.patch("/{task_id}/submit", response_model=TaskRead)
def submit_task(
    task_id: int,
    payload: TaskSubmit,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> Task:
    """提交任务产出信息。

    参数：`task_id` 表示调用方传入的业务参数；`payload` 表示接口请求体或业务输入数据；`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：提交后的任务；状态统一置为 SUBMITTED。
    """
    task = get_or_404(db, Task, task_id, "task")
    before = model_to_dict(task)
    task.pr_url = payload.pr_url
    task.submission_note = payload.submission_note
    task.status = "SUBMITTED"
    db.flush()
    create_audit_log(
        db,
        actor,
        AuditAction.SUBMIT,
        TargetType.TASK,
        task.id,
        before,
        model_to_dict(task),
        payload.submission_note,
    )
    db.commit()
    return db.scalar(
        select(Task).options(joinedload(Task.project), joinedload(Task.assignee)).where(Task.id == task.id)
    )
