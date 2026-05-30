from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import db_session, require_actor
from app.core.security import Actor
from app.models.audit_log import AuditLog
from app.models.member import Member
from app.models.project import Project
from app.models.requirement import Requirement
from app.models.task import Task
from app.schemas.dashboard import (
    DashboardSummary,
    DashboardTasks,
    RecentAuditLogs,
    RecentProjects,
    StatusCount,
    StatusCountList,
)


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def count_where(db: Session, model, *criteria) -> int:
    stmt = select(func.count()).select_from(model)
    for criterion in criteria:
        stmt = stmt.where(criterion)
    return db.scalar(stmt) or 0


@router.get("/summary", response_model=DashboardSummary)
def summary(db: Session = Depends(db_session), _: Actor = Depends(require_actor)) -> DashboardSummary:
    project_total = count_where(db, Project)
    avg_progress = db.scalar(select(func.avg(Project.progress))) or 0
    return DashboardSummary(
        project_total=project_total,
        developing_project_total=count_where(db, Project, Project.status == "DEVELOPING"),
        deployed_project_total=count_where(db, Project, Project.status == "DEPLOYED"),
        done_project_total=count_where(db, Project, Project.status == "DONE"),
        paused_project_total=count_where(db, Project, Project.status == "PAUSED"),
        member_total=count_where(db, Member),
        active_member_total=count_where(db, Member, Member.status == "ACTIVE"),
        task_total=count_where(db, Task),
        in_progress_task_total=count_where(db, Task, Task.status == "IN_PROGRESS"),
        blocked_task_total=count_where(db, Task, Task.status == "BLOCKED"),
        done_task_total=count_where(db, Task, Task.status == "DONE"),
        pending_submission_task_total=count_where(db, Task, Task.status.in_(["TODO", "IN_PROGRESS"])),
        submitted_task_total=count_where(db, Task, Task.status == "SUBMITTED"),
        requirement_total=count_where(db, Requirement),
        open_requirement_total=count_where(db, Requirement, Requirement.status == "OPEN"),
        claimed_requirement_total=count_where(db, Requirement, Requirement.status == "CLAIMED"),
        average_project_progress=round(float(avg_progress), 2),
    )


@router.get("/project-status", response_model=StatusCountList)
def project_status(db: Session = Depends(db_session), _: Actor = Depends(require_actor)) -> StatusCountList:
    rows = db.execute(select(Project.status, func.count()).group_by(Project.status)).all()
    items = [StatusCount(status=status, total=total) for status, total in rows]
    return StatusCountList(items=items, total=len(items))


@router.get("/task-status", response_model=StatusCountList)
def task_status(db: Session = Depends(db_session), _: Actor = Depends(require_actor)) -> StatusCountList:
    rows = db.execute(select(Task.status, func.count()).group_by(Task.status)).all()
    items = [StatusCount(status=status, total=total) for status, total in rows]
    return StatusCountList(items=items, total=len(items))


@router.get("/recent-projects", response_model=RecentProjects)
def recent_projects(
    db: Session = Depends(db_session),
    _: Actor = Depends(require_actor),
    limit: int = Query(5, ge=1, le=20),
) -> RecentProjects:
    items = db.scalars(select(Project).order_by(Project.updated_at.desc(), Project.id.desc()).limit(limit)).all()
    return RecentProjects(items=items, total=len(items))


@router.get("/blocked-tasks", response_model=DashboardTasks)
def blocked_tasks(
    db: Session = Depends(db_session),
    _: Actor = Depends(require_actor),
    limit: int = Query(10, ge=1, le=50),
) -> DashboardTasks:
    items = db.scalars(
        select(Task)
        .options(joinedload(Task.project), joinedload(Task.assignee))
        .where(Task.status == "BLOCKED")
        .order_by(Task.updated_at.desc(), Task.id.desc())
        .limit(limit)
    ).all()
    return DashboardTasks(items=items, total=len(items))


@router.get("/pending-tasks", response_model=DashboardTasks)
def pending_tasks(
    db: Session = Depends(db_session),
    _: Actor = Depends(require_actor),
    limit: int = Query(10, ge=1, le=50),
) -> DashboardTasks:
    items = db.scalars(
        select(Task)
        .options(joinedload(Task.project), joinedload(Task.assignee))
        .where(Task.status.in_(["TODO", "IN_PROGRESS"]))
        .order_by(Task.updated_at.desc(), Task.id.desc())
        .limit(limit)
    ).all()
    return DashboardTasks(items=items, total=len(items))


@router.get("/recent-audit-logs", response_model=RecentAuditLogs)
def recent_audit_logs(
    db: Session = Depends(db_session),
    _: Actor = Depends(require_actor),
    limit: int = Query(10, ge=1, le=50),
) -> RecentAuditLogs:
    items = db.scalars(select(AuditLog).order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).limit(limit)).all()
    return RecentAuditLogs(items=items, total=len(items))
