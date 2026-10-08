"""Response schemas for the exercise and workout-routine catalog API."""

from pydantic import BaseModel, ConfigDict, Field


class ExerciseCatalogCreate(BaseModel):
    """Client-editable exercise fields; the server owns the exercise ID."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=120)
    primary_muscle_group: str = Field(min_length=1, max_length=60)
    equipment: str | None = Field(default=None, max_length=80)


class ExerciseCatalogRead(BaseModel):
    """An exercise sent to React; aliases keep the existing camelCase TS shape."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    primary_muscle_group: str = Field(serialization_alias="primaryMuscleGroup")
    equipment: str | None = None


class RoutineExerciseRead(BaseModel):
    """A link to one planned exercise, using the frontend's exerciseId field."""

    exercise_id: str = Field(serialization_alias="exerciseId")


class WorkoutRoutineRead(BaseModel):
    """A reusable routine plus muscle groups derived from its ordered exercises."""

    id: str
    name: str
    muscle_groups: list[str] = Field(serialization_alias="muscleGroups")
    exercises: list[RoutineExerciseRead]
