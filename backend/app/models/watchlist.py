from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class WatchlistItem(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "watchlist_items"
    __table_args__ = (
        UniqueConstraint("organization_id", "symbol", name="uq_watchlist_items_org_symbol"),
    )

    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    added_by_user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    symbol: Mapped[str] = mapped_column(String(24), index=True)
    company_name: Mapped[str] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)

    organization = relationship("Organization", back_populates="watchlist_items")
