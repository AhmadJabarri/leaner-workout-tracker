"""Personal profile the AI Coach always takes into account."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Numeric, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User


class UserProfile(Base):
    # One optional row per user; every field is optional so it can be filled gradually.
    __tablename__ = "user_profiles"
    __table_args__ = (
        CheckConstraint("body_weight_kg > 0", name="ck_profile_weight_positive"),
        CheckConstraint("height_cm > 0", name="ck_profile_height_positive"),
        CheckConstraint("age > 0", name="ck_profile_age_positive"),
        CheckConstraint("protein_target_g > 0", name="ck_profile_protein_positive"),
    )

    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    body_weight_kg: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    height_cm: Mapped[Decimal | None] = mapped_column(Numeric(5, 1), nullable=True)
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # A short goal key such as "build_muscle"; see app.schemas.profile.Goal.
    goal: Mapped[str | None] = mapped_column(String(40), nullable=True)
    # NULL means "use the default calculated from body weight and goal".
    protein_target_g: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Free-text notes the user wants the Coach to always remember.
    coach_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped[User] = relationship(back_populates="profile")
