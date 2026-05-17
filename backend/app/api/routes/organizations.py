from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.deps import DbSession, get_current_user, require_roles
from app.core.errors import api_error
from app.models.audit_log import AuditLog
from app.models.enums import InviteStatus, MembershipRole, MembershipStatus
from app.models.invite import Invite
from app.models.membership import Membership
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.organization import (
    InviteCreateRequest,
    InviteResponse,
    JoinOrganizationRequest,
    OrganizationCreateRequest,
    OrganizationListResponse,
    OrganizationResponse,
)
from app.services.organizations import (
    build_membership_summary,
    create_organization_record,
    generate_unique_invite_code,
    get_memberships_for_user,
)

router = APIRouter()


def normalize_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


@router.get("", response_model=OrganizationListResponse)
def list_organizations(
    current_user: Annotated[User, Depends(get_current_user)],
    db: DbSession,
) -> OrganizationListResponse:
    memberships = get_memberships_for_user(db, current_user.id)
    return OrganizationListResponse(
        organizations=[build_membership_summary(item) for item in memberships],
    )


@router.post("", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
def create_organization(
    payload: OrganizationCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DbSession,
) -> OrganizationResponse:
    organization = create_organization_record(db, payload.name, created_by_user_id=current_user.id)
    membership = Membership(
        organization_id=organization.id,
        user_id=current_user.id,
        role=MembershipRole.ADMIN,
        status=MembershipStatus.ACTIVE,
    )
    db.add(membership)
    db.commit()
    db.refresh(organization)

    return OrganizationResponse(
        id=organization.id,
        name=organization.name,
        slug=organization.slug,
    )


@router.post(
    "/invites",
    response_model=InviteResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_invite(
    payload: InviteCreateRequest,
    membership: Annotated[Membership, Depends(require_roles(MembershipRole.ADMIN))],
    db: DbSession,
) -> InviteResponse:
    invite = Invite(
        organization_id=membership.organization_id,
        created_by_user_id=membership.user_id,
        code=generate_unique_invite_code(db),
        role=payload.role,
        email=(payload.email.lower() if payload.email else None),
        expires_at=datetime.now(UTC) + timedelta(days=payload.expires_in_days),
    )
    db.add(invite)
    db.flush()
    db.add(
        AuditLog(
            organization_id=membership.organization_id,
            actor_user_id=membership.user_id,
            action="organization.invite.created",
            entity_type="invite",
            entity_id=str(invite.id),
            payload={
                "role": payload.role.value,
                "email": payload.email,
            },
        )
    )
    db.commit()

    return InviteResponse(
        id=invite.id,
        code=invite.code,
        role=invite.role,
        email=invite.email,
        expires_at=invite.expires_at,
    )


@router.post("/join", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def join_organization(
    payload: JoinOrganizationRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: DbSession,
) -> MessageResponse:
    invite = (
        db.query(Invite)
        .filter(Invite.code == payload.code.upper(), Invite.status == InviteStatus.PENDING)
        .one_or_none()
    )
    if invite is None:
        raise api_error(
            status_code=status.HTTP_404_NOT_FOUND,
            code="invite_not_found",
            message="Invite code not found.",
        )

    if normalize_utc(invite.expires_at) < datetime.now(UTC):
        invite.status = InviteStatus.EXPIRED
        db.commit()
        raise api_error(
            status_code=status.HTTP_410_GONE,
            code="invite_expired",
            message="Invite code has expired.",
        )

    if invite.email and invite.email.lower() != current_user.email.lower():
        raise api_error(
            status_code=status.HTTP_403_FORBIDDEN,
            code="invite_email_mismatch",
            message="This invite is reserved for a different email address.",
        )

    existing_membership = (
        db.query(Membership)
        .filter(
            Membership.organization_id == invite.organization_id,
            Membership.user_id == current_user.id,
        )
        .one_or_none()
    )
    if existing_membership is not None:
        raise api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="membership_already_exists",
            message="You are already a member of this organization.",
        )

    db.add(
        Membership(
            organization_id=invite.organization_id,
            user_id=current_user.id,
            role=invite.role,
            status=MembershipStatus.ACTIVE,
        )
    )
    invite.status = InviteStatus.ACCEPTED
    invite.accepted_at = datetime.now(UTC)
    db.add(
        AuditLog(
            organization_id=invite.organization_id,
            actor_user_id=current_user.id,
            action="organization.invite.accepted",
            entity_type="invite",
            entity_id=str(invite.id),
            payload={"code": invite.code},
        )
    )
    db.commit()
    return MessageResponse(message="Organization joined successfully.")
