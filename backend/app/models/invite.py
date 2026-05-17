from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import InviteStatus, MembershipRole


class Invite(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "invites"

    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    created_by_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    role: Mapped[MembershipRole] = mapped_column(
        Enum(MembershipRole),
        default=MembershipRole.ANALYST,
    )
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[InviteStatus] = mapped_column(
        Enum(InviteStatus),
        default=InviteStatus.PENDING,
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    organization = relationship("Organization", back_populates="invites")
