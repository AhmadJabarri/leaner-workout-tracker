"""Catalog routes for built-in routines and user-owned exercise records."""

from collections.abc import Sequence
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.dependencies import get_current_user
from app.models import Exercise, RoutineExercise, User, WorkoutRoutine
from app.schemas.catalog import (
    ExerciseCatalogCreate,
    ExerciseCatalogRead,
    WorkoutRoutineRead,
)

router = APIRouter(prefix="/api/catalog", tags=["Catalog"])


@router.get(
    "/exercises",
    response_model=list[ExerciseCatalogRead],
    response_model_exclude_none=True,
    summary="List built-in and current-user exercises",
)
def list_exercises(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Sequence[Exercise]:
    """Read built-ins plus exercises owned by the signed-in account."""
    # Keep the main workout groups together and put chest exercises first so a
    # new custom workout gets a useful default exercise in the current UI.
    muscle_group_order = case(
        {"Chest": 0, "Triceps": 1, "Back": 2, "Biceps": 3, "Shoulders": 4, "Legs": 5},
        value=Exercise.primary_muscle_group,
        else_=6,
    )
    statement = (
        select(Exercise)
        .where(or_(Exercise.owner_user_id.is_(None), Exercise.owner_user_id == user.id))
        .order_by(muscle_group_order, Exercise.name, Exercise.id)
    )
    return db.scalars(statement).all()


@router.post(
    "/exercises",
    response_model=ExerciseCatalogRead,
    response_model_exclude_none=True,
    status_code=201,
    summary="Create a custom exercise for the signed-in account",
)
def create_exercise(
    payload: ExerciseCatalogCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Exercise:
    """Validate uniqueness, assign the ID and owner, then persist the exercise."""
    duplicate = db.scalar(
        select(Exercise.id).where(
            or_(Exercise.owner_user_id.is_(None), Exercise.owner_user_id == user.id),
            func.lower(Exercise.name) == payload.name.lower(),
        )
    )
    if duplicate is not None:
        raise HTTPException(
            status_code=409,
            detail="You already have a custom exercise with that name.",
        )

    exercise = Exercise(
        id=str(uuid4()),
        name=payload.name,
        primary_muscle_group=payload.primary_muscle_group,
        equipment=payload.equipment or None,
        owner_user_id=user.id,
    )
    db.add(exercise)
    db.commit()
    db.refresh(exercise)
    return exercise


@router.get(
    "/routines",
    response_model=list[WorkoutRoutineRead],
    summary="List workout routines with their planned exercise order",
)
def list_routines(db: Session = Depends(get_db)) -> list[WorkoutRoutineRead]:
    """Read routines and build the frontend shape from ordered DB relationships."""
    statement = (
        select(WorkoutRoutine)
        .where(WorkoutRoutine.owner_user_id.is_(None))
        .options(
            selectinload(WorkoutRoutine.exercise_links).selectinload(
                RoutineExercise.exercise
            )
        )
        .order_by(WorkoutRoutine.id)
    )
    routines = db.scalars(statement).all()
    response: list[WorkoutRoutineRead] = []

    for routine in routines:
        # The relationship itself has no ordering; use the persisted position column.
        links = sorted(routine.exercise_links, key=lambda link: link.position)
        muscle_groups = list(
            dict.fromkeys(link.exercise.primary_muscle_group for link in links)
        )
        response.append(
            WorkoutRoutineRead(
                id=routine.id,
                name=routine.name,
                muscle_groups=muscle_groups,
                exercises=[{"exercise_id": link.exercise_id} for link in links],
            )
        )

    return response
