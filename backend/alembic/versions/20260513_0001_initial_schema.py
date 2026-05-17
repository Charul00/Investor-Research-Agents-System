"""initial schema

Revision ID: 20260513_0001
Revises:
Create Date: 2026-05-13 12:20:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "20260513_0001"
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


membership_role_enum = postgresql.ENUM(
    "ADMIN",
    "ANALYST",
    name="membershiprole",
    create_type=False,
)
membership_status_enum = postgresql.ENUM(
    "ACTIVE",
    "INVITED",
    "DISABLED",
    name="membershipstatus",
    create_type=False,
)
invite_status_enum = postgresql.ENUM(
    "PENDING",
    "ACCEPTED",
    "REVOKED",
    "EXPIRED",
    name="invitestatus",
    create_type=False,
)
report_status_enum = postgresql.ENUM(
    "DRAFT",
    "COMPLETE",
    "FAILED",
    name="reportstatus",
    create_type=False,
)


def timestamp_column(name: str) -> sa.Column:
    return sa.Column(
        name,
        sa.DateTime(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
    )


def upgrade() -> None:
    bind = op.get_bind()
    membership_role_enum.create(bind, checkfirst=True)
    membership_status_enum.create(bind, checkfirst=True)
    invite_status_enum.create(bind, checkfirst=True)
    report_status_enum.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("id", sa.Uuid(), nullable=False),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    op.create_table(
        "organizations",
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("slug", sa.String(length=140), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["users.id"],
            name=op.f("fk_organizations_created_by_user_id_users"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_organizations")),
    )
    op.create_index(op.f("ix_organizations_slug"), "organizations", ["slug"], unique=True)

    op.create_table(
        "memberships",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("role", membership_role_enum, nullable=False),
        sa.Column("status", membership_status_enum, nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_memberships_organization_id_organizations"),
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name=op.f("fk_memberships_user_id_users"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_memberships")),
        sa.UniqueConstraint("organization_id", "user_id", name="uq_memberships_org_user"),
    )
    op.create_index(
        op.f("ix_memberships_organization_id"),
        "memberships",
        ["organization_id"],
        unique=False,
    )
    op.create_index(op.f("ix_memberships_user_id"), "memberships", ["user_id"], unique=False)

    op.create_table(
        "invites",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("role", membership_role_enum, nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("status", invite_status_enum, nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_invites_organization_id_organizations"),
        ),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["users.id"],
            name=op.f("fk_invites_created_by_user_id_users"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_invites")),
    )
    op.create_index(op.f("ix_invites_code"), "invites", ["code"], unique=True)
    op.create_index(
        op.f("ix_invites_organization_id"),
        "invites",
        ["organization_id"],
        unique=False,
    )

    op.create_table(
        "reports",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("author_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("query_text", sa.Text(), nullable=False),
        sa.Column("status", report_status_enum, nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.ForeignKeyConstraint(
            ["author_id"],
            ["users.id"],
            name=op.f("fk_reports_author_id_users"),
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_reports_organization_id_organizations"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_reports")),
    )
    op.create_index(op.f("ix_reports_author_id"), "reports", ["author_id"], unique=False)
    op.create_index(
        op.f("ix_reports_organization_id"),
        "reports",
        ["organization_id"],
        unique=False,
    )

    op.create_table(
        "watchlist_items",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("added_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("symbol", sa.String(length=24), nullable=False),
        sa.Column("company_name", sa.String(length=255), nullable=False),
        sa.Column("notes", sa.String(length=500), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.ForeignKeyConstraint(
            ["added_by_user_id"],
            ["users.id"],
            name=op.f("fk_watchlist_items_added_by_user_id_users"),
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_watchlist_items_organization_id_organizations"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_watchlist_items")),
        sa.UniqueConstraint("organization_id", "symbol", name="uq_watchlist_items_org_symbol"),
    )
    op.create_index(
        op.f("ix_watchlist_items_organization_id"),
        "watchlist_items",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_watchlist_items_added_by_user_id"),
        "watchlist_items",
        ["added_by_user_id"],
        unique=False,
    )
    op.create_index(op.f("ix_watchlist_items_symbol"), "watchlist_items", ["symbol"], unique=False)

    op.create_table(
        "audit_logs",
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("actor_user_id", sa.Uuid(), nullable=True),
        sa.Column("action", sa.String(length=120), nullable=False),
        sa.Column("entity_type", sa.String(length=80), nullable=False),
        sa.Column("entity_id", sa.String(length=64), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        timestamp_column("created_at"),
        timestamp_column("updated_at"),
        sa.ForeignKeyConstraint(
            ["actor_user_id"],
            ["users.id"],
            name=op.f("fk_audit_logs_actor_user_id_users"),
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name=op.f("fk_audit_logs_organization_id_organizations"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_audit_logs")),
    )
    op.create_index(op.f("ix_audit_logs_action"), "audit_logs", ["action"], unique=False)
    op.create_index(
        op.f("ix_audit_logs_organization_id"),
        "audit_logs",
        ["organization_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_audit_logs_organization_id"), table_name="audit_logs")
    op.drop_index(op.f("ix_audit_logs_action"), table_name="audit_logs")
    op.drop_table("audit_logs")

    op.drop_index(op.f("ix_watchlist_items_symbol"), table_name="watchlist_items")
    op.drop_index(op.f("ix_watchlist_items_added_by_user_id"), table_name="watchlist_items")
    op.drop_index(op.f("ix_watchlist_items_organization_id"), table_name="watchlist_items")
    op.drop_table("watchlist_items")

    op.drop_index(op.f("ix_reports_organization_id"), table_name="reports")
    op.drop_index(op.f("ix_reports_author_id"), table_name="reports")
    op.drop_table("reports")

    op.drop_index(op.f("ix_invites_organization_id"), table_name="invites")
    op.drop_index(op.f("ix_invites_code"), table_name="invites")
    op.drop_table("invites")

    op.drop_index(op.f("ix_memberships_user_id"), table_name="memberships")
    op.drop_index(op.f("ix_memberships_organization_id"), table_name="memberships")
    op.drop_table("memberships")

    op.drop_index(op.f("ix_organizations_slug"), table_name="organizations")
    op.drop_table("organizations")

    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")

    bind = op.get_bind()
    report_status_enum.drop(bind, checkfirst=True)
    invite_status_enum.drop(bind, checkfirst=True)
    membership_status_enum.drop(bind, checkfirst=True)
    membership_role_enum.drop(bind, checkfirst=True)
