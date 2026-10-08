"""Exercise catalog model for shared and user-created exercises."""

from __future__ import annotations

from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.routine import RoutineExercise
    from app.models.user import User
    from app.models.workout import WorkoutExercise


class Exercise(Base):
    __tablename__ = "exercises"

    # Text IDs preserve the exercise slugs already used by the React frontend.
    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    primary_muscle_group: Mapped[str] = mapped_column(String(60))
    equipment: Mapped[str | None] = mapped_column(String(80), nullable=True)
    # A NULL owner marks a built-in exercise; otherwise this FK identifies its user.
    owner_user_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id"), nullable=True
    )

    owner: Mapped[User | None] = relationship(back_populates="exercises")
    routine_links: Mapped[list[RoutineExercise]] = relationship(back_populates="exercise")
    workout_entries: Mapped[list[WorkoutExercise]] = relationship(back_populates="exercise")
