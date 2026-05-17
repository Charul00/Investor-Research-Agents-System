from fastapi import APIRouter

from app.api.routes import auth, dashboard, health, organizations, reports, research, watchlist

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(organizations.router, prefix="/organizations", tags=["organizations"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(research.router, prefix="/research", tags=["research"])
api_router.include_router(watchlist.router, prefix="/watchlist", tags=["watchlist"])
