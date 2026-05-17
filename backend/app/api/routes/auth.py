from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy import select

from app.api.deps import DbSession, get_current_user
from app.core.errors import api_error
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.enums import MembershipRole, MembershipStatus
from app.models.membership import Membership
from app.models.user import User
from app.schemas.auth import (
    AuthSessionResponse,
    LoginRequest,
    MeResponse,
    RefreshTokenRequest,
    SignupRequest,
    UserSummary,
)
from app.services.organizations import (
    build_membership_summary,
    create_organization_record,
    get_memberships_for_user,
)

router = APIRouter()


def build_session_response(
    user: User,
    memberships: list[Membership],
    active_membership: Membership,
) -> AuthSessionResponse:
    membership_summaries = [build_membership_summary(item) for item in memberships]
    active_summary = build_membership_summary(active_membership)
    return AuthSessionResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        token_type="bearer",
        user=UserSummary.model_validate(user),
        memberships=membership_summaries,
        active_membership=active_summary,
    )


@router.post("/signup", response_model=AuthSessionResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignupRequest, db: DbSession) -> AuthSessionResponse:
    existing_user = (
        db.execute(select(User).where(User.email == payload.email.lower())).scalar_one_or_none()
    )
    if existing_user is not None:
        raise api_error(
            status_code=status.HTTP_409_CONFLICT,
            code="email_already_registered",
            message="An account with this email already exists.",
        )

    user = User(
        full_name=payload.full_name.strip(),
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    db.flush()

    organization = create_organization_record(
        db,
        payload.organization_name,
        created_by_user_id=user.id,
    )
    membership = Membership(
        organization_id=organization.id,
        user_id=user.id,
        role=MembershipRole.ADMIN,
        status=MembershipStatus.ACTIVE,
    )
    db.add(membership)
    db.commit()

    memberships = get_memberships_for_user(db, user.id)
    active_membership = next(
        item for item in memberships if item.organization_id == organization.id
    )
    return build_session_response(user, memberships, active_membership)


@router.post("/login", response_model=AuthSessionResponse)
def login(payload: LoginRequest, db: DbSession) -> AuthSessionResponse:
    user = db.execute(select(User).where(User.email == payload.email.lower())).scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise api_error(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="invalid_credentials",
            message="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    memberships = get_memberships_for_user(db, user.id)
    if not memberships:
        raise api_error(
            status_code=status.HTTP_403_FORBIDDEN,
            code="no_active_organization",
            message="This account is not linked to any active organization.",
        )

    if payload.organization_id is not None:
        active_membership = next(
            (item for item in memberships if item.organization_id == payload.organization_id),
            None,
        )
        if active_membership is None:
            raise api_error(
                status_code=status.HTTP_403_FORBIDDEN,
                code="organization_access_denied",
                message="You do not belong to the requested organization.",
            )
    else:
        active_membership = memberships[0]

    return build_session_response(user, memberships, active_membership)


@router.post("/refresh", response_model=AuthSessionResponse)
def refresh_session(payload: RefreshTokenRequest, db: DbSession) -> AuthSessionResponse:
    token_payload = decode_token(payload.refresh_token, expected_type="refresh")
    try:
        user_id = UUID(token_payload["sub"])
    except (KeyError, ValueError) as exc:
        raise api_error(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="invalid_refresh_token",
            message="Refresh token is invalid.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise api_error(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="user_unavailable",
            message="User account is unavailable.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    memberships = get_memberships_for_user(db, user.id)
    if not memberships:
        raise api_error(
            status_code=status.HTTP_403_FORBIDDEN,
            code="no_active_organization",
            message="This account is not linked to any active organization.",
        )

    active_membership = memberships[0]
    if payload.organization_id is not None:
        active_membership = next(
            (item for item in memberships if item.organization_id == payload.organization_id),
            None,
        )
        if active_membership is None:
            raise api_error(
                status_code=status.HTTP_403_FORBIDDEN,
                code="organization_access_denied",
                message="You do not belong to the requested organization.",
            )

    return build_session_response(user, memberships, active_membership)


@router.get("/me", response_model=MeResponse)
def me(
    current_user: Annotated[User, Depends(get_current_user)],
    db: DbSession,
) -> MeResponse:
    memberships = get_memberships_for_user(db, current_user.id)
    return MeResponse(
        user=UserSummary.model_validate(current_user),
        memberships=[build_membership_summary(item) for item in memberships],
    )
