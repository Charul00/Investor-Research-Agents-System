import re
import secrets
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.enums import MembershipStatus
from app.models.invite import Invite
from app.models.membership import Membership
from app.models.organization import Organization
from app.schemas.organization import MembershipSummary


def slugify(value: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return normalized or "workspace"


def generate_unique_org_slug(db: Session, name: str) -> str:
    base_slug = slugify(name)
    candidate = base_slug
    suffix = 1

    while (
        db.execute(select(Organization).where(Organization.slug == candidate)).scalar_one_or_none()
    ):
        suffix += 1
        candidate = f"{base_slug}-{suffix}"
    return candidate


def create_organization_record(
    db: Session,
    name: str,
    created_by_user_id: UUID,
) -> Organization:
    organization = Organization(
        name=name.strip(),
        slug=generate_unique_org_slug(db, name),
        created_by_user_id=created_by_user_id,
    )
    db.add(organization)
    db.flush()
    return organization


def generate_unique_invite_code(db: Session, length: int = 10) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    while True:
        code = "".join(secrets.choice(alphabet) for _ in range(length))
        invite_exists = db.execute(select(Invite.id).where(Invite.code == code)).first()
        if invite_exists is None:
            return code


def get_memberships_for_user(db: Session, user_id: UUID) -> list[Membership]:
    statement = (
        select(Membership)
        .options(selectinload(Membership.organization))
        .where(Membership.user_id == user_id, Membership.status == MembershipStatus.ACTIVE)
        .order_by(Membership.created_at.asc())
    )
    return list(db.execute(statement).scalars())


def build_membership_summary(membership: Membership) -> MembershipSummary:
    return MembershipSummary(
        id=membership.id,
        organization_id=membership.organization_id,
        organization_name=membership.organization.name,
        organization_slug=membership.organization.slug,
        role=membership.role,
        joined_at=membership.created_at,
    )
