"""项目接口模块，负责项目 CRUD、项目人员分配、需求池和项目进度状态更新。

本模块的注释用于说明业务边界、主要参数和返回结果，便于后续维护。
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import db_session, has_permission, require_actor, require_admin
from app.api.utils import apply_pagination, create_audit_log, get_or_404, model_to_dict, update_model
from app.core.errors import ApiError
from app.core.security import Actor
from app.models.member import Member
from app.models.project import Project
from app.models.project_member import ProjectMember
from app.models.requirement import Requirement
from app.schemas.base import AuditAction, TargetType
from app.schemas.project import (
    ProjectCreate,
    ProjectList,
    ProjectProgressUpdate,
    ProjectRead,
    ProjectStatusUpdate,
    ProjectUpdate,
)
from app.schemas.project_member import ProjectMemberCreate, ProjectMemberList, ProjectMemberRead
from app.schemas.requirement import RequirementCreate, RequirementList, RequirementRead


router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=ProjectList)
def list_projects(
    db: Session = Depends(db_session),
    _: Actor = Depends(require_actor),
    keyword: str | None = None,
    status: str | None = None,
    project_type: str | None = Query(None, alias="projectType"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
) -> ProjectList:
    """分页查询项目列表并支持关键字、状态和项目类型筛选。

    参数：`db` 表示数据库会话，用于查询和提交业务数据；`_` 表示依赖注入占位参数，用于触发登录或权限校验；`keyword` 表示调用方传入的业务参数；`status` 表示调用方传入的业务参数；`project_type` 表示调用方传入的业务参数；`page` 表示调用方传入的业务参数；`page_size` 表示调用方传入的业务参数。
    返回：统一 `{ items, total }` 项目列表响应。
    """
    stmt = select(Project).order_by(Project.updated_at.desc(), Project.id.desc())
    if keyword:
        pattern = f"%{keyword}%"
        stmt = stmt.where(or_(Project.name.ilike(pattern), Project.description.ilike(pattern)))
    if status:
        stmt = stmt.where(Project.status == status)
    if project_type:
        stmt = stmt.where(Project.project_type == project_type)
    items, total = apply_pagination(db, stmt, page, page_size)
    return ProjectList(items=items, total=total)


@router.post("", response_model=ProjectRead, status_code=201)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> Project:
    """创建项目基础信息。

    参数：`payload` 表示接口请求体或业务输入数据；`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：创建后的项目；仅 ADMIN 可调用。
    """
    project = Project(**payload.model_dump())
    db.add(project)
    db.flush()
    create_audit_log(db, actor, AuditAction.CREATE, TargetType.PROJECT, project.id, None, model_to_dict(project))
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(
    project_id: int,
    db: Session = Depends(db_session),
    _: Actor = Depends(require_actor),
) -> Project:
    """查询项目详情。

    参数：`project_id` 表示调用方传入的业务参数；`db` 表示数据库会话，用于查询和提交业务数据；`_` 表示依赖注入占位参数，用于触发登录或权限校验。
    返回：项目 ORM 对象；不存在时返回统一 404。
    """
    return get_or_404(db, Project, project_id, "project")


@router.put("/{project_id}", response_model=ProjectRead)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> Project:
    """更新项目基础资料。

    参数：`project_id` 表示调用方传入的业务参数；`payload` 表示接口请求体或业务输入数据；`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：更新后的项目；仅 ADMIN 可调用并记录审计日志。
    """
    project = get_or_404(db, Project, project_id, "project")
    before = model_to_dict(project)
    update_model(project, payload.model_dump(exclude_unset=True))
    db.flush()
    create_audit_log(db, actor, AuditAction.UPDATE, TargetType.PROJECT, project.id, before, model_to_dict(project))
    db.commit()
    db.refresh(project)
    return project


@router.patch("/{project_id}/progress", response_model=ProjectRead)
def update_project_progress(
    project_id: int,
    payload: ProjectProgressUpdate,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> Project:
    """更新项目整体进度和当前进展说明。

    参数：`project_id` 表示调用方传入的业务参数；`payload` 表示接口请求体或业务输入数据；`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：更新后的项目；CONTRIBUTOR 无权修改项目进度。
    """
    project = get_or_404(db, Project, project_id, "project")
    before = model_to_dict(project)
    project.progress = payload.progress
    if payload.current_progress is not None:
        project.current_progress = payload.current_progress
    db.flush()
    create_audit_log(
        db,
        actor,
        AuditAction.PROGRESS_CHANGE,
        TargetType.PROJECT,
        project.id,
        before,
        model_to_dict(project),
        payload.current_progress,
    )
    db.commit()
    db.refresh(project)
    return project


@router.patch("/{project_id}/status", response_model=ProjectRead)
def update_project_status(
    project_id: int,
    payload: ProjectStatusUpdate,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> Project:
    """更新项目状态并按归档/状态变化写入审计动作。

    参数：`project_id` 表示调用方传入的业务参数；`payload` 表示接口请求体或业务输入数据；`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：更新后的项目；仅 ADMIN 可调用。
    """
    project = get_or_404(db, Project, project_id, "project")
    before = model_to_dict(project)
    project.status = payload.status.value
    db.flush()
    create_audit_log(
        db,
        actor,
        AuditAction.STATUS_CHANGE if payload.status.value != "ARCHIVED" else AuditAction.ARCHIVE,
        TargetType.PROJECT,
        project.id,
        before,
        model_to_dict(project),
        payload.description,
    )
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}/members", response_model=ProjectMemberList)
def list_project_members(
    project_id: int,
    db: Session = Depends(db_session),
    _: Actor = Depends(require_actor),
) -> ProjectMemberList:
    """查询项目下的项目人员分配记录。

    参数：`project_id` 表示调用方传入的业务参数；`db` 表示数据库会话，用于查询和提交业务数据；`_` 表示依赖注入占位参数，用于触发登录或权限校验。
    返回：项目人员列表，包含绑定的成员和用户账号信息。
    """
    get_or_404(db, Project, project_id, "project")
    stmt = (
        select(ProjectMember)
        .options(joinedload(ProjectMember.member).joinedload(Member.user), joinedload(ProjectMember.project))
        .where(ProjectMember.project_id == project_id)
        .order_by(ProjectMember.id.desc())
    )
    items = db.scalars(stmt).all()
    return ProjectMemberList(items=items, total=len(items))


@router.get("/{project_id}/requirements", response_model=RequirementList)
def list_project_requirements(
    project_id: int,
    db: Session = Depends(db_session),
    _: Actor = Depends(require_actor),
    status: str | None = None,
    keyword: str | None = None,
) -> RequirementList:
    """查询项目需求池并支持状态和关键字筛选。

    参数：`project_id` 表示调用方传入的业务参数；`db` 表示数据库会话，用于查询和提交业务数据；`_` 表示依赖注入占位参数，用于触发登录或权限校验；`status` 表示调用方传入的业务参数；`keyword` 表示调用方传入的业务参数。
    返回：统一 `{ items, total }` 需求列表响应。
    """
    get_or_404(db, Project, project_id, "project")
    stmt = select(Requirement).where(Requirement.project_id == project_id).order_by(Requirement.updated_at.desc(), Requirement.id.desc())
    if status:
        stmt = stmt.where(Requirement.status == status)
    if keyword:
        pattern = f"%{keyword}%"
        stmt = stmt.where(or_(Requirement.title.ilike(pattern), Requirement.description.ilike(pattern)))
    items = db.scalars(stmt).all()
    return RequirementList(items=items, total=len(items))


@router.post("/{project_id}/requirements", response_model=RequirementRead, status_code=201)
def create_requirement(
    project_id: int,
    payload: RequirementCreate,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_actor),
) -> Requirement:
    """在指定项目的需求池中新增需求。

    参数：`project_id` 表示调用方传入的业务参数；`payload` 表示接口请求体或业务输入数据；`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：创建后的需求；普通用户必须被分配到该项目并拥有新增需求权限。
    """
    get_or_404(db, Project, project_id, "project")
    if "ADMIN" not in actor.roles:
        # 贡献者不能凭菜单权限跨项目写需求，必须同时是该项目的启用成员账号。
        if not has_permission(actor, "requirement", "requirement:create"):
            raise ApiError(403, "FORBIDDEN", "无权执行该操作")
        assignment = db.scalar(
            select(ProjectMember)
            .join(Member, Member.id == ProjectMember.member_id)
            .where(
                ProjectMember.project_id == project_id,
                ProjectMember.status == "ACTIVE",
                Member.user_id == actor.id,
                Member.status == "ACTIVE",
            )
        )
        if assignment is None:
            raise ApiError(403, "PROJECT_ASSIGNMENT_REQUIRED", "只有被分配到项目的用户才能操作需求池")
    requirement = Requirement(
        project_id=project_id,
        created_by_user_id=actor.id,
        **payload.model_dump(),
    )
    db.add(requirement)
    db.flush()
    create_audit_log(
        db,
        actor,
        AuditAction.CREATE,
        TargetType.REQUIREMENT,
        requirement.id,
        None,
        model_to_dict(requirement),
        "新增需求",
    )
    db.commit()
    db.refresh(requirement)
    return requirement


@router.post("/{project_id}/members", response_model=ProjectMemberRead, status_code=201)
def add_project_member(
    project_id: int,
    payload: ProjectMemberCreate,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> ProjectMember:
    """把成员账号分配到指定项目。

    参数：`project_id` 表示调用方传入的业务参数；`payload` 表示接口请求体或业务输入数据；`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：项目成员关系；已有关系时更新角色、职责和状态。
    """
    get_or_404(db, Project, project_id, "project")
    get_or_404(db, Member, payload.member_id, "member")
    relation = db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.member_id == payload.member_id,
        )
    )
    if relation is None:
        relation = ProjectMember(project_id=project_id, **payload.model_dump())
        db.add(relation)
    else:
        # 成员重新加入项目时复用原关系，避免同一成员在同一项目生成多条有效记录。
        update_model(relation, payload.model_dump())
    db.flush()
    create_audit_log(
        db,
        actor,
        AuditAction.CREATE,
        TargetType.PROJECT_MEMBER,
        relation.id,
        None,
        model_to_dict(relation),
        "将成员加入项目",
    )
    db.commit()
    return db.scalar(
        select(ProjectMember)
        .options(joinedload(ProjectMember.member).joinedload(Member.user), joinedload(ProjectMember.project))
        .where(ProjectMember.id == relation.id)
    )


@router.delete("/{project_id}/members/{member_id}", status_code=204)
def remove_project_member(
    project_id: int,
    member_id: int,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> None:
    """把成员从项目中移出。

    参数：`project_id` 表示调用方传入的业务参数；`member_id` 表示调用方传入的业务参数；`db` 表示数据库会话，用于查询和提交业务数据；`actor` 表示当前登录用户上下文，用于权限判断和审计记录。
    返回：无返回值；关系不会物理删除，而是把状态置为 LEFT。
    """
    relation = db.scalar(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.member_id == member_id,
        )
    )
    if relation is None:
        raise get_or_404(db, ProjectMember, -1, "project_member")
    before = model_to_dict(relation)
    # 项目参与记录用于审计和历史追踪，因此只做逻辑移出。
    relation.status = "LEFT"
    db.flush()
    create_audit_log(
        db,
        actor,
        AuditAction.REMOVE,
        TargetType.PROJECT_MEMBER,
        relation.id,
        before,
        model_to_dict(relation),
        "将成员移出项目",
    )
    db.commit()
