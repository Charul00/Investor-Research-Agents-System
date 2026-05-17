from enum import StrEnum


class MembershipRole(StrEnum):
    ADMIN = "admin"
    ANALYST = "analyst"


class MembershipStatus(StrEnum):
    ACTIVE = "active"
    INVITED = "invited"
    DISABLED = "disabled"


class InviteStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REVOKED = "revoked"
    EXPIRED = "expired"


class ReportStatus(StrEnum):
    DRAFT = "draft"
    COMPLETE = "complete"
    FAILED = "failed"
