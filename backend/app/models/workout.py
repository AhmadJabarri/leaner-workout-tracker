"""Workout history models: completed sessions, performed exercises, and sets."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.exercise import Exercise
    from app.models.user import User
    from app.models.routine import WorkoutRoutine


class WorkoutSession(Base):
    # A session is one completed workout; it may optionally reference a plan.
    __tablename__ = "workout_sessions"
    __table_args__ = (Index("ix_workout_user_performed", "user_id", "performed_at"),)

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"))
    routine_id: Mapped[str | None] = mapped_column(
        ForeignKey("workout_routines.id"), nullable=True
    )
    performed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped[User] = relationship(back_populates="workout_sessions")
    routine: Mapped[WorkoutRoutine | None] = relationship()
    exercises: Mapped[list[WorkoutExercise]] = relationship(
        back_populates="session", cascade="all, delete-orphan", order_by="WorkoutExercise.position"
    )


class WorkoutExercise(Base):
    # This records what happened in this session, separately from the routine plan.
    __tablename__ = "workout_exercises"
    __table_args__ = (
        UniqueConstraint("workout_session_id", "position", name="uq_workout_exercise_position"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    workout_session_id: Mapped[UUID] = mapped_column(
        ForeignKey("workout_sessions.id", ondelete="CASCADE")
    )
    exercise_id: Mapped[str] = mapped_column(ForeignKey("exercises.id"))
    position: Mapped[int] = mapped_column(Integer)

    session: Mapped[WorkoutSession] = relationship(back_populates="exercises")
    exercise: Mapped[Exercise] = relationship(back_populates="workout_entries")
    sets: Mapped[list[WorkoutSet]] = relationship(
        back_populates="workout_exercise", cascade="all, delete-orphan", order_by="WorkoutSet.set_number"
    )


class WorkoutSet(Base):
    # Each row is one performed set, so reps and weight can vary per set.
    __tablename__ = "workout_sets"
    __table_args__ = (
        CheckConstraint("set_number > 0", name="ck_workout_set_number_positive"),
        CheckConstraint("reps > 0", name="ck_workout_set_reps_positive"),
        CheckConstraint("weight_kg >= 0", name="ck_workout_set_weight_nonnegative"),
        UniqueConstraint("workout_exercise_id", "set_number", name="uq_workout_set_number"),
    )

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    workout_exercise_id: Mapped[UUID] = mapped_column(
        ForeignKey("workout_exercises.id", ondelete="CASCADE")
    )
    set_number: Mapped[int] = mapped_column(Integer)
    reps: Mapped[int] = mapped_column(Integer)
    # Numeric stores decimal weights without floating-point rounding errors.
    weight_kg: Mapped[Decimal] = mapped_column(Numeric(7, 2))

    workout_exercise: Mapped[WorkoutExercise] = relationship(back_populates="sets")
