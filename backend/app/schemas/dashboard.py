from pydantic import BaseModel

from app.schemas.organization import MembershipSummary
from app.schemas.report import ReportResponse
from app.schemas.watchlist import WatchlistItemResponse


class DashboardStats(BaseModel):
    saved_reports: int
    completed_reports: int
    watchlist_items: int
    active_members: int


class DashboardResponse(BaseModel):
    workspace: MembershipSummary
    stats: DashboardStats
    recent_reports: list[ReportResponse]
    watchlist: list[WatchlistItemResponse]
