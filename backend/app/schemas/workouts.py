"""Pydantic schemas validate workout API data at the backend boundary.

They define accepted/returned data shapes; they do not create database rows.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class WorkoutInput(BaseModel):
    """Base rules shared by data submitted to the API."""

    model_config = ConfigDict(extra="forbid")


class WorkoutSetCreate(WorkoutInput):
    """One performed set submitted by the frontend."""

    reps: int = Field(gt=0, description="Number of completed repetitions")
    weight_kg: float = Field(ge=0, description="Load used for the set, in kilograms")


class WorkoutExerciseCreate(WorkoutInput):
    """One exercise and its performed sets in a workout request."""

    exercise_id: str = Field(min_length=1)
    sets: list[WorkoutSetCreate] = Field(min_length=1)


class WorkoutCreate(WorkoutInput):
    """Client-submitted data for a workout; server-owned fields are omitted."""

    exercises: list[WorkoutExerciseCreate] = Field(min_length=1)
    notes: str | None = Field(default=None, max_length=1000)
    routine_id: str | None = Field(default=None, min_length=1)


class WorkoutSetRead(BaseModel):
    """A set returned by the API after it has been stored."""

    model_config = ConfigDict(from_attributes=True)

    reps: int
    weight_kg: float = Field(serialization_alias="weight")
    weight_unit: str = Field(default="kg", serialization_alias="weightUnit")


class WorkoutExerciseRead(BaseModel):
    """An exercise and its stored sets returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    exercise_id: str = Field(serialization_alias="exerciseId")
    sets: list[WorkoutSetRead]


class WorkoutSessionRead(BaseModel):
    """A complete stored workout returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    performed_at: datetime = Field(serialization_alias="performedAt")
    routine_id: str | None = Field(default=None, serialization_alias="routineId")
    exercises: list[WorkoutExerciseRead]
    notes: str | None = None
