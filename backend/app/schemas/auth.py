from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.organization import MembershipSummary


class UserSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    email: EmailStr


class SignupRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    organization_name: str = Field(min_length=2, max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    organization_id: UUID | None = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=20)
    organization_id: UUID | None = None


class AuthSessionResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserSummary
    memberships: list[MembershipSummary]
    active_membership: MembershipSummary


class MeResponse(BaseModel):
    user: UserSummary
    memberships: list[MembershipSummary]
