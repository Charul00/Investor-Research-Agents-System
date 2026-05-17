from sqlalchemy import JSON, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import ReportStatus


class Report(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "reports"

    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    query_text: Mapped[str] = mapped_column(Text)
    status: Mapped[ReportStatus] = mapped_column(Enum(ReportStatus), default=ReportStatus.DRAFT)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[list[str]] = mapped_column(JSON, default=list)

    organization = relationship("Organization", back_populates="reports")
    author = relationship("User", back_populates="authored_reports")
