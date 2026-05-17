from collections.abc import Callable
from typing import Annotated
from uuid import UUID

from fastapi import Depends, Header, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.database import get_db
from app.core.errors import api_error
from app.core.security import decode_token
from app.models.enums import MembershipRole, MembershipStatus
from app.models.membership import Membership
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)
DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> User:
    if credentials is None:
        raise api_error(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="authentication_required",
            message="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(credentials.credentials, expected_type="access")

    try:
        user_id = UUID(payload["sub"])
    except (KeyError, ValueError) as exc:
        raise api_error(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="invalid_access_token",
            message="Invalid access token.",
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
    return user


def get_current_membership(
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
    organization_id: Annotated[str | None, Header(alias="X-Organization-Id")] = None,
) -> Membership:
    if not organization_id:
        raise api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="tenant_header_required",
            message="X-Organization-Id header is required.",
        )

    try:
        org_uuid = UUID(organization_id)
    except ValueError as exc:
        raise api_error(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="tenant_header_invalid",
            message="X-Organization-Id must be a valid UUID.",
        ) from exc

    statement = (
        select(Membership)
        .options(selectinload(Membership.organization))
        .where(
            Membership.organization_id == org_uuid,
            Membership.user_id == current_user.id,
            Membership.status == MembershipStatus.ACTIVE,
        )
    )
    membership = db.execute(statement).scalar_one_or_none()
    if membership is None:
        raise api_error(
            status_code=status.HTTP_403_FORBIDDEN,
            code="tenant_access_denied",
            message="You do not have access to this organization.",
        )
    return membership


def require_roles(*allowed_roles: MembershipRole) -> Callable[[Membership], Membership]:
    def role_checker(
        membership: Annotated[Membership, Depends(get_current_membership)],
    ) -> Membership:
        if membership.role not in allowed_roles:
            raise api_error(
                status_code=status.HTTP_403_FORBIDDEN,
                code="permission_denied",
                message="You do not have permission to perform this action.",
            )
        return membership

    return role_checker
