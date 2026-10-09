"""Profile input/output shapes and the backend's protein-target calculation."""

from decimal import Decimal
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class Goal(StrEnum):
    BUILD_MUSCLE = "build_muscle"
    LOSE_FAT = "lose_fat"
    MAINTAIN = "maintain"
    GET_STRONGER = "get_stronger"


# Grams of protein per kg of body weight per day, within the commonly
# recommended 1.6–2.2 g/kg range for people who strength train.
PROTEIN_G_PER_KG: dict[Goal | None, Decimal] = {
    Goal.BUILD_MUSCLE: Decimal("1.8"),
    Goal.GET_STRONGER: Decimal("1.8"),
    Goal.LOSE_FAT: Decimal("2.0"),
    Goal.MAINTAIN: Decimal("1.6"),
    None: Decimal("1.6"),
}


def default_protein_target_g(body_weight_kg: Decimal | float | None, goal: str | None) -> int | None:
    """Return a daily protein target in grams, or None without a body weight."""
    if body_weight_kg is None:
        return None
    per_kg = PROTEIN_G_PER_KG.get(Goal(goal) if goal else None, PROTEIN_G_PER_KG[None])
    return round(Decimal(str(body_weight_kg)) * per_kg)


class ProfileUpdate(BaseModel):
    """Every field is optional; sending null clears it."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True, str_strip_whitespace=True)

    body_weight_kg: float | None = Field(default=None, gt=0, le=400, alias="bodyWeightKg")
    height_cm: float | None = Field(default=None, gt=0, le=260, alias="heightCm")
    age: int | None = Field(default=None, gt=0, le=120)
    goal: Goal | None = None
    protein_target_g: int | None = Field(default=None, gt=0, le=500, alias="proteinTargetG")
    coach_notes: str | None = Field(default=None, max_length=1000, alias="coachNotes")


class ProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    body_weight_kg: float | None = Field(default=None, serialization_alias="bodyWeightKg")
    height_cm: float | None = Field(default=None, serialization_alias="heightCm")
    age: int | None = None
    goal: Goal | None = None
    protein_target_g: int | None = Field(default=None, serialization_alias="proteinTargetG")
    coach_notes: str | None = Field(default=None, serialization_alias="coachNotes")
    # The target actually used: the custom one if set, otherwise the default.
    effective_protein_target_g: int | None = Field(
        default=None, serialization_alias="effectiveProteinTargetG"
    )
