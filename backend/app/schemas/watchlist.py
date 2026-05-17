from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class WatchlistBase(BaseModel):
    symbol: str = Field(min_length=1, max_length=24)
    company_name: str = Field(min_length=2, max_length=255)
    notes: str | None = Field(default=None, max_length=500)


class WatchlistCreateRequest(WatchlistBase):
    pass


class WatchlistUpdateRequest(BaseModel):
    company_name: str | None = Field(default=None, min_length=2, max_length=255)
    notes: str | None = Field(default=None, max_length=500)


class WatchlistItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    added_by_user_id: UUID
    symbol: str
    company_name: str
    notes: str | None
    created_at: datetime
    updated_at: datetime


class WatchlistListResponse(BaseModel):
    items: list[WatchlistItemResponse]
