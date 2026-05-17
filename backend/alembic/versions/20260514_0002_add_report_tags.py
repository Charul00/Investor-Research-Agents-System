"""add report tags

Revision ID: 20260514_0002
Revises: 20260513_0001
Create Date: 2026-05-14 11:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260514_0002"
down_revision: str | None = "20260513_0001"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "reports",
        sa.Column("tags", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
    )
    op.alter_column("reports", "tags", server_default=None)


def downgrade() -> None:
    op.drop_column("reports", "tags")
