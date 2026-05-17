from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ReportStatus


class ReportBase(BaseModel):
    title: str = Field(min_length=2, max_length=255)
    query_text: str = Field(min_length=5)
    summary: str | None = None
    status: ReportStatus = ReportStatus.DRAFT
    tags: list[str] = Field(default_factory=list)


class ReportCreateRequest(ReportBase):
    pass


class ReportUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=255)
    query_text: str | None = Field(default=None, min_length=5)
    summary: str | None = None
    status: ReportStatus | None = None
    tags: list[str] | None = None


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    author_id: UUID
    author_name: str
    title: str
    query_text: str
    summary: str | None
    status: ReportStatus
    tags: list[str]
    created_at: datetime
    updated_at: datetime


class ReportListResponse(BaseModel):
    reports: list[ReportResponse]
