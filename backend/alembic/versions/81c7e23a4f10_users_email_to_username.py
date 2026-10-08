"""Rename the account identifier while preserving existing user IDs and data."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "81c7e23a4f10"
down_revision: Union[str, None] = "3df330aa401f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Rename the unique email column and reserve a username for the local row."""
    op.alter_column(
        "users",
        "email",
        new_column_name="username",
        existing_type=sa.String(length=320),
        existing_nullable=False,
    )
    op.drop_index("ix_users_email", table_name="users")
    op.create_index("ix_users_username", "users", ["username"], unique=True)

    # Keep the seeded local account's UUID unchanged so workout foreign keys stay valid.
    op.execute(
        "UPDATE users SET username = 'local-user' "
        "WHERE id = '00000000-0000-0000-0000-000000000001' "
        "AND username = 'local@leaner.local'"
    )


def downgrade() -> None:
    """Restore the old field name and the placeholder's original value."""
    op.execute(
        "UPDATE users SET username = 'local@leaner.local' "
        "WHERE id = '00000000-0000-0000-0000-000000000001' "
        "AND username = 'local-user'"
    )
    op.drop_index("ix_users_username", table_name="users")
    op.alter_column(
        "users",
        "username",
        new_column_name="email",
        existing_type=sa.String(length=320),
        existing_nullable=False,
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
