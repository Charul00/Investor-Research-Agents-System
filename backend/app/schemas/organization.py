from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

from app.models.enums import MembershipRole


class MembershipSummary(BaseModel):
    id: UUID
    organization_id: UUID
    organization_name: str
    organization_slug: str
    role: MembershipRole
    joined_at: datetime


class OrganizationResponse(BaseModel):
    id: UUID
    name: str
    slug: str


class OrganizationCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)


class OrganizationListResponse(BaseModel):
    organizations: list[MembershipSummary]


class InviteCreateRequest(BaseModel):
    email: EmailStr | None = None
    role: MembershipRole = MembershipRole.ANALYST
    expires_in_days: int = Field(default=7, ge=1, le=30)


class InviteResponse(BaseModel):
    id: UUID
    code: str
    role: MembershipRole
    email: EmailStr | None = None
    expires_at: datetime


class JoinOrganizationRequest(BaseModel):
    code: str = Field(min_length=6, max_length=32)
