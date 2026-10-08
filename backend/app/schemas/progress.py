"""Response shape for deterministic workout summary metrics."""

from datetime import datetime

from pydantic import BaseModel, Field


class ProgressSummary(BaseModel):
    """Summary counts calculated by the backend from persisted workout rows."""

    total_sessions: int = Field(serialization_alias="totalSessions")
    sessions_last_7_days: int = Field(serialization_alias="sessionsLast7Days")
    total_sets: int = Field(serialization_alias="totalSets")
    unique_exercises: int = Field(serialization_alias="uniqueExercises")


class ExerciseProgressPoint(BaseModel):
    """One session's objective result for a selected exercise."""

    performed_at: datetime = Field(serialization_alias="performedAt")
    max_weight_kg: float = Field(serialization_alias="maxWeightKg")
    volume_kg_reps: float = Field(serialization_alias="volumeKgReps")
    set_count: int = Field(serialization_alias="setCount")


class ExerciseProgressRead(BaseModel):
    """Exercise identity, personal best, and chronological session metrics."""

    exercise_id: str = Field(serialization_alias="exerciseId")
    exercise_name: str = Field(serialization_alias="exerciseName")
    personal_best_kg: float | None = Field(serialization_alias="personalBestKg")
    workouts: list[ExerciseProgressPoint]
