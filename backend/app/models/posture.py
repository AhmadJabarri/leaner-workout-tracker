"""Posture models: built-in exercises and the user's daily routine check-ins."""

from __future__ import annotations

from datetime import date, datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PostureExercise(Base):
    """One built-in posture exercise, e.g. "Chin tucks"."""

    __tablename__ = "posture_exercises"
    # Each exercise is measured in reps OR seconds, never both and never neither.
    __table_args__ = (
        CheckConstraint(
            "(reps IS NULL) <> (hold_seconds IS NULL)",
            name="ck_posture_exercise_reps_or_seconds",
        ),
    )

    # A readable slug like "chin-tucks", the same style as workout exercise IDs.
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    # Which body area it targets: "Neck", "Upper back", or "Lower back & hips".
    target_area: Mapped[str] = mapped_column(String(60))
    # Short how-to text shown in the app.
    instructions: Mapped[str] = mapped_column(Text)
    sets: Mapped[int] = mapped_column(Integer, default=1)
    reps: Mapped[int | None] = mapped_column(Integer, nullable=True)
    hold_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Order in the daily routine (1 = first).
    position: Mapped[int] = mapped_column(Integer, unique=True)


class PostureCheckin(Base):
    """One completed daily routine. A user can check in at most once per day."""

    __tablename__ = "posture_checkins"

    # TODO(you): write this model. See the instructions in the chat.


class PostureCheckinExercise(Base):
    """Which exercises were completed in a check-in (a many-to-many link)."""

    __tablename__ = "posture_checkin_exercises"

    checkin_id: Mapped[UUID] = mapped_column(
        ForeignKey("posture_checkins.id", ondelete="CASCADE"), primary_key=True
    )
    exercise_id: Mapped[str] = mapped_column(
        ForeignKey("posture_exercises.id"), primary_key=True
    )

    checkin: Mapped[PostureCheckin] = relationship(back_populates="exercises")
