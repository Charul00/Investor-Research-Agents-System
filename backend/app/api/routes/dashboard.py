from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import DbSession, get_current_membership
from app.api.routes.reports import serialize_report
from app.api.routes.watchlist import serialize_watchlist_item
from app.models.enums import MembershipStatus, ReportStatus
from app.models.membership import Membership
from app.models.report import Report
from app.models.watchlist import WatchlistItem
from app.schemas.dashboard import DashboardResponse, DashboardStats
from app.services.organizations import build_membership_summary

router = APIRouter()


@router.get("", response_model=DashboardResponse)
def get_dashboard(
    membership: Annotated[Membership, Depends(get_current_membership)],
    db: DbSession,
) -> DashboardResponse:
    organization_id = membership.organization_id

    saved_reports = db.execute(
        select(func.count(Report.id)).where(Report.organization_id == organization_id)
    ).scalar_one()
    completed_reports = db.execute(
        select(func.count(Report.id)).where(
            Report.organization_id == organization_id,
            Report.status == ReportStatus.COMPLETE,
        )
    ).scalar_one()
    watchlist_count = db.execute(
        select(func.count(WatchlistItem.id)).where(WatchlistItem.organization_id == organization_id)
    ).scalar_one()
    active_members = db.execute(
        select(func.count(Membership.id)).where(
            Membership.organization_id == organization_id,
            Membership.status == MembershipStatus.ACTIVE,
        )
    ).scalar_one()

    recent_reports = list(
        db.execute(
            select(Report)
            .options(selectinload(Report.author))
            .where(Report.organization_id == organization_id)
            .order_by(Report.updated_at.desc())
            .limit(5)
        ).scalars()
    )
    watchlist = list(
        db.execute(
            select(WatchlistItem)
            .where(WatchlistItem.organization_id == organization_id)
            .order_by(WatchlistItem.created_at.desc())
            .limit(6)
        ).scalars()
    )

    return DashboardResponse(
        workspace=build_membership_summary(membership),
        stats=DashboardStats(
            saved_reports=saved_reports,
            completed_reports=completed_reports,
            watchlist_items=watchlist_count,
            active_members=active_members,
        ),
        recent_reports=[serialize_report(report) for report in recent_reports],
        watchlist=[serialize_watchlist_item(item) for item in watchlist],
    )
