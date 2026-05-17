from sqlalchemy import Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import MembershipRole, MembershipStatus


class Membership(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "memberships"
    __table_args__ = (
        UniqueConstraint("organization_id", "user_id", name="uq_memberships_org_user"),
    )

    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    role: Mapped[MembershipRole] = mapped_column(
        Enum(MembershipRole),
        default=MembershipRole.ANALYST,
    )
    status: Mapped[MembershipStatus] = mapped_column(
        Enum(MembershipStatus),
        default=MembershipStatus.ACTIVE,
    )

    organization = relationship("Organization", back_populates="memberships")
    user = relationship("User", back_populates="memberships")
