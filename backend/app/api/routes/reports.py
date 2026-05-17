from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import String, cast, or_, select
from sqlalchemy.orm import selectinload

from app.api.deps import DbSession, get_current_membership
from app.core.errors import api_error
from app.models.audit_log import AuditLog
from app.models.enums import ReportStatus
from app.models.membership import Membership
from app.models.report import Report
from app.schemas.report import (
    ReportCreateRequest,
    ReportListResponse,
    ReportResponse,
    ReportUpdateRequest,
)

router = APIRouter()


def normalize_tags(tags: list[str]) -> list[str]:
    seen: set[str] = set()
    normalized: list[str] = []
    for raw_tag in tags:
        cleaned = raw_tag.strip().lower()
        if not cleaned or cleaned in seen:
            continue
        seen.add(cleaned)
        normalized.append(cleaned)
    return normalized


def serialize_report(report: Report) -> ReportResponse:
    return ReportResponse(
        id=report.id,
        organization_id=report.organization_id,
        author_id=report.author_id,
        author_name=report.author.full_name,
        title=report.title,
        query_text=report.query_text,
        summary=report.summary,
        status=report.status,
        tags=report.tags or [],
        created_at=report.created_at,
        updated_at=report.updated_at,
    )


@router.get("", response_model=ReportListResponse)
def list_reports(
    membership: Annotated[Membership, Depends(get_current_membership)],
    db: DbSession,
    search: Annotated[str | None, Query()] = None,
    status_filter: Annotated[ReportStatus | None, Query(alias="status")] = None,
    tag: Annotated[str | None, Query()] = None,
) -> ReportListResponse:
    statement = (
        select(Report)
        .options(selectinload(Report.author))
        .where(Report.organization_id == membership.organization_id)
        .order_by(Report.updated_at.desc())
    )

    if search:
        pattern = f"%{search.strip().lower()}%"
        statement = statement.where(
            or_(
                Report.title.ilike(pattern),
                Report.query_text.ilike(pattern),
                Report.summary.ilike(pattern),
            )
        )

    if status_filter:
        statement = statement.where(Report.status == status_filter)

    if tag:
        tag_pattern = f'%"{tag.strip().lower()}"%'
        statement = statement.where(cast(Report.tags, String).ilike(tag_pattern))

    reports = list(db.execute(statement).scalars())
    return ReportListResponse(reports=[serialize_report(report) for report in reports])


@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(
    payload: ReportCreateRequest,
    membership: Annotated[Membership, Depends(get_current_membership)],
    db: DbSession,
) -> ReportResponse:
    report = Report(
        organization_id=membership.organization_id,
        author_id=membership.user_id,
        title=payload.title.strip(),
        query_text=payload.query_text.strip(),
        summary=payload.summary.strip() if payload.summary else None,
        status=payload.status,
        tags=normalize_tags(payload.tags),
    )
    db.add(report)
    db.flush()
    db.add(
        AuditLog(
            organization_id=membership.organization_id,
            actor_user_id=membership.user_id,
            action="report.created",
            entity_type="report",
            entity_id=str(report.id),
            payload={"title": report.title, "status": report.status.value, "tags": report.tags},
        )
    )
    db.commit()
    return serialize_report(get_report_or_404(db, report.id, membership.organization_id))


def get_report_or_404(db: DbSession, report_id: UUID, organization_id: UUID) -> Report:
    statement = (
        select(Report)
        .options(selectinload(Report.author))
        .where(Report.id == report_id, Report.organization_id == organization_id)
    )
    report = db.execute(statement).scalar_one_or_none()
    if report is None:
        raise api_error(
            status_code=status.HTTP_404_NOT_FOUND,
            code="report_not_found",
            message="Report not found.",
        )
    return report


@router.get("/{report_id}", response_model=ReportResponse)
def get_report(
    report_id: UUID,
    membership: Annotated[Membership, Depends(get_current_membership)],
    db: DbSession,
) -> ReportResponse:
    report = get_report_or_404(db, report_id, membership.organization_id)
    return serialize_report(report)


@router.patch("/{report_id}", response_model=ReportResponse)
def update_report(
    report_id: UUID,
    payload: ReportUpdateRequest,
    membership: Annotated[Membership, Depends(get_current_membership)],
    db: DbSession,
) -> ReportResponse:
    report = get_report_or_404(db, report_id, membership.organization_id)

    if payload.title is not None:
        report.title = payload.title.strip()
    if payload.query_text is not None:
        report.query_text = payload.query_text.strip()
    if payload.summary is not None:
        report.summary = payload.summary.strip() or None
    if payload.status is not None:
        report.status = payload.status
    if payload.tags is not None:
        report.tags = normalize_tags(payload.tags)

    db.add(
        AuditLog(
            organization_id=membership.organization_id,
            actor_user_id=membership.user_id,
            action="report.updated",
            entity_type="report",
            entity_id=str(report.id),
            payload={"title": report.title, "status": report.status.value, "tags": report.tags},
        )
    )
    db.commit()
    return serialize_report(get_report_or_404(db, report.id, membership.organization_id))


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_report(
    report_id: UUID,
    membership: Annotated[Membership, Depends(get_current_membership)],
    db: DbSession,
) -> Response:
    report = get_report_or_404(db, report_id, membership.organization_id)
    db.add(
        AuditLog(
            organization_id=membership.organization_id,
            actor_user_id=membership.user_id,
            action="report.deleted",
            entity_type="report",
            entity_id=str(report.id),
            payload={"title": report.title},
        )
    )
    db.delete(report)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
