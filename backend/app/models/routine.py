"""Routine models: reusable plans and their ordered exercise links."""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.exercise import Exercise
    from app.models.user import User


class WorkoutRoutine(Base):
    __tablename__ = "workout_routines"

    # Text IDs preserve routine slugs such as "chest-triceps".
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    # NULL owner means this is a shared, built-in routine.
    owner_user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True
    )

    owner: Mapped[User | None] = relationship(back_populates="routines")
    exercise_links: Mapped[list[RoutineExercise]] = relationship(
        back_populates="routine", cascade="all, delete-orphan"
    )


class RoutineExercise(Base):
    # This association model represents the many-to-many routine/exercise link.
    # It stores position because exercise order is part of the planned routine.
    __tablename__ = "routine_exercises"
    __table_args__ = (
        UniqueConstraint("routine_id", "position", name="uq_routine_exercise_position"),
    )

    routine_id: Mapped[str] = mapped_column(
        ForeignKey("workout_routines.id", ondelete="CASCADE"), primary_key=True
    )
    exercise_id: Mapped[str] = mapped_column(ForeignKey("exercises.id"), primary_key=True)
    position: Mapped[int] = mapped_column(Integer)

    routine: Mapped[WorkoutRoutine] = relationship(back_populates="exercise_links")
    exercise: Mapped[Exercise] = relationship(back_populates="routine_links")
