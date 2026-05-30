from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from app.api.deps import db_session, require_actor, require_admin
from app.api.utils import apply_pagination, create_audit_log, get_or_404, model_to_dict, update_model
from app.core.security import Actor
from app.models.member import Member
from app.models.project_member import ProjectMember
from app.schemas.base import AuditAction, TargetType
from app.schemas.member import MemberCreate, MemberList, MemberRead, MemberStatusUpdate, MemberUpdate
from app.schemas.project_member import ProjectMemberList


router = APIRouter(prefix="/members", tags=["members"])


@router.get("", response_model=MemberList)
def list_members(
    db: Session = Depends(db_session),
    _: Actor = Depends(require_actor),
    keyword: str | None = None,
    status: str | None = None,
    skill_direction: str | None = Query(None, alias="skillDirection"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="pageSize"),
) -> MemberList:
    stmt = select(Member).order_by(Member.updated_at.desc(), Member.id.desc())
    if keyword:
        pattern = f"%{keyword}%"
        stmt = stmt.where(or_(Member.name.ilike(pattern), Member.github_username.ilike(pattern)))
    if status:
        stmt = stmt.where(Member.status == status)
    if skill_direction:
        stmt = stmt.where(Member.skill_direction == skill_direction)
    items, total = apply_pagination(db, stmt, page, page_size)
    return MemberList(items=items, total=total)


@router.post("", response_model=MemberRead, status_code=201)
def create_member(
    payload: MemberCreate,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> Member:
    member = Member(**payload.model_dump())
    db.add(member)
    db.flush()
    create_audit_log(db, actor, AuditAction.CREATE, TargetType.MEMBER, member.id, None, model_to_dict(member))
    db.commit()
    db.refresh(member)
    return member


@router.get("/{member_id}", response_model=MemberRead)
def get_member(member_id: int, db: Session = Depends(db_session), _: Actor = Depends(require_actor)) -> Member:
    return get_or_404(db, Member, member_id, "member")


@router.put("/{member_id}", response_model=MemberRead)
def update_member(
    member_id: int,
    payload: MemberUpdate,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> Member:
    member = get_or_404(db, Member, member_id, "member")
    before = model_to_dict(member)
    update_model(member, payload.model_dump(exclude_unset=True))
    db.flush()
    create_audit_log(db, actor, AuditAction.UPDATE, TargetType.MEMBER, member.id, before, model_to_dict(member))
    db.commit()
    db.refresh(member)
    return member


@router.patch("/{member_id}/status", response_model=MemberRead)
def update_member_status(
    member_id: int,
    payload: MemberStatusUpdate,
    db: Session = Depends(db_session),
    actor: Actor = Depends(require_admin),
) -> Member:
    member = get_or_404(db, Member, member_id, "member")
    before = model_to_dict(member)
    member.status = payload.status.value
    db.flush()
    create_audit_log(
        db,
        actor,
        AuditAction.STATUS_CHANGE,
        TargetType.MEMBER,
        member.id,
        before,
        model_to_dict(member),
        payload.description,
    )
    db.commit()
    db.refresh(member)
    return member


@router.get("/{member_id}/projects", response_model=ProjectMemberList)
def list_member_projects(
    member_id: int,
    db: Session = Depends(db_session),
    _: Actor = Depends(require_actor),
) -> ProjectMemberList:
    get_or_404(db, Member, member_id, "member")
    stmt = (
        select(ProjectMember)
        .options(joinedload(ProjectMember.project), joinedload(ProjectMember.member))
        .where(ProjectMember.member_id == member_id)
        .order_by(ProjectMember.id.desc())
    )
    items = db.scalars(stmt).all()
    return ProjectMemberList(items=items, total=len(items))
