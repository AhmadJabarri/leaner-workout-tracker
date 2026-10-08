"""Workout API routes for saving and reading each signed-in user's history."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from app.db.session import get_db
from app.dependencies import get_current_user
from app.models import (
    Exercise,
    User,
    WorkoutExercise,
    WorkoutRoutine,
    WorkoutSession,
    WorkoutSet,
)
from app.schemas.workouts import WorkoutCreate, WorkoutSessionRead

router = APIRouter(prefix="/api/workouts", tags=["Workouts"])


@router.post("", response_model=WorkoutSessionRead, status_code=201, summary="Save a completed workout")
def save_workout(
    payload: WorkoutCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> WorkoutSession:
    """Validate references, then save the session, exercises, and sets atomically."""
    exercise_ids = {entry.exercise_id for entry in payload.exercises}
    known_ids = set(
        db.scalars(
            select(Exercise.id).where(
                Exercise.id.in_(exercise_ids),
                or_(Exercise.owner_user_id.is_(None), Exercise.owner_user_id == user.id),
            )
        ).all()
    )
    missing_ids = exercise_ids - known_ids
    if missing_ids:
        raise HTTPException(
            status_code=422,
            detail="This workout includes a custom exercise that is not saved in the database yet. Use a built-in exercise for now.",
        )

    if payload.routine_id:
        routine_id = db.scalar(
            select(WorkoutRoutine.id).where(
                WorkoutRoutine.id == payload.routine_id,
                or_(WorkoutRoutine.owner_user_id.is_(None), WorkoutRoutine.owner_user_id == user.id),
            )
        )
        if routine_id is None:
            raise HTTPException(status_code=422, detail="The selected workout routine is not available.")

    session = WorkoutSession(
        user_id=user.id,
        routine_id=payload.routine_id,
        notes=payload.notes,
        exercises=[
            WorkoutExercise(
                exercise_id=exercise.exercise_id,
                position=position,
                sets=[
                    WorkoutSet(
                        set_number=set_number,
                        reps=workout_set.reps,
                        weight_kg=workout_set.weight_kg,
                    )
                    for set_number, workout_set in enumerate(exercise.sets, start=1)
                ],
            )
            for position, exercise in enumerate(payload.exercises, start=1)
        ],
    )

    # A single commit makes this an all-or-nothing save across the related tables.
    try:
        db.add(session)
        db.commit()
        saved_session = db.scalar(
            select(WorkoutSession)
            .where(WorkoutSession.id == session.id)
            .options(
                selectinload(WorkoutSession.exercises).selectinload(WorkoutExercise.sets)
            )
        )
    except Exception:
        db.rollback()
        raise

    if saved_session is None:
        raise HTTPException(status_code=500, detail="Workout was saved but could not be reloaded.")
    return saved_session


@router.get("", response_model=list[WorkoutSessionRead], summary="Read saved workout history")
def list_workouts(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[WorkoutSession]:
    """Return this signed-in user's saved workouts, newest first."""
    statement = (
        select(WorkoutSession)
        .where(WorkoutSession.user_id == user.id)
        .options(
            selectinload(WorkoutSession.exercises).selectinload(WorkoutExercise.sets)
        )
        .order_by(WorkoutSession.performed_at.desc())
    )
    return list(db.scalars(statement).all())


@router.post(
    "/preview",
    response_model=WorkoutCreate,
    summary="Validate a workout payload without saving it",
)
def preview_workout(workout: WorkoutCreate) -> WorkoutCreate:
    """Return the validated workout input as a preview; no data is persisted."""
    return workout
