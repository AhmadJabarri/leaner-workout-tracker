"""Add a per-user profile (body stats, goal, protein target, coach notes)."""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4e8f1a2b3c5"
down_revision: Union[str, None] = "c9a41e6d2f08"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the profile table; it is additive and touches no existing rows."""
    op.create_table(
        "user_profiles",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("body_weight_kg", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("height_cm", sa.Numeric(precision=5, scale=1), nullable=True),
        sa.Column("age", sa.Integer(), nullable=True),
        sa.Column("goal", sa.String(length=40), nullable=True),
        sa.Column("protein_target_g", sa.Integer(), nullable=True),
        sa.Column("coach_notes", sa.Text(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("body_weight_kg > 0", name="ck_profile_weight_positive"),
        sa.CheckConstraint("height_cm > 0", name="ck_profile_height_positive"),
        sa.CheckConstraint("age > 0", name="ck_profile_age_positive"),
        sa.CheckConstraint("protein_target_g > 0", name="ck_profile_protein_positive"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )


def downgrade() -> None:
    """Remove profile records."""
    op.drop_table("user_profiles")
