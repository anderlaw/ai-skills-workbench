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
    task = get_or_404(db, Task, task_id, "task")
    before = model_to_dict(task)
    task.status = payload.status.value
    if payload.status.value == "DONE":
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
