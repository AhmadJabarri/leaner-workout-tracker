"""Read-only progress endpoints with deterministic database calculations."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import get_current_user
from app.models import Exercise, User, WorkoutExercise, WorkoutSession, WorkoutSet
from app.schemas.progress import (
    ExerciseProgressPoint,
    ExerciseProgressRead,
    ProgressSummary,
)

router = APIRouter(prefix="/api/progress", tags=["Progress"])


@router.get("/summary", response_model=ProgressSummary, summary="Summarize saved training history")
def get_progress_summary(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ProgressSummary:
    """Count sessions, recent frequency, sets, and tracked exercises for this user."""
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    recent_session_id = case(
        (WorkoutSession.performed_at >= seven_days_ago, WorkoutSession.id),
        else_=None,
    )
    statement = (
        select(
            func.count(func.distinct(WorkoutSession.id)).label("total_sessions"),
            func.count(func.distinct(recent_session_id)).label("sessions_last_7_days"),
            func.count(func.distinct(WorkoutSet.id)).label("total_sets"),
            func.count(func.distinct(WorkoutExercise.exercise_id)).label(
                "unique_exercises"
            ),
        )
        .select_from(WorkoutSession)
        .outerjoin(WorkoutSession.exercises)
        .outerjoin(WorkoutExercise.sets)
        .where(WorkoutSession.user_id == user.id)
    )
    counts = db.execute(statement).one()

    return ProgressSummary(
        total_sessions=counts.total_sessions,
        sessions_last_7_days=counts.sessions_last_7_days,
        total_sets=counts.total_sets,
        unique_exercises=counts.unique_exercises,
    )


@router.get(
    "/exercises/{exercise_id}",
    response_model=ExerciseProgressRead,
    summary="Show progression history for one exercise",
)
def get_exercise_progress(
    exercise_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ExerciseProgressRead:
    """Aggregate each saved workout into its top load, volume, and set count."""
    exercise = db.scalar(
        select(Exercise).where(
            Exercise.id == exercise_id,
            or_(Exercise.owner_user_id.is_(None), Exercise.owner_user_id == user.id),
        )
    )
    if exercise is None:
        raise HTTPException(status_code=404, detail="Exercise was not found.")

    statement = (
        select(
            WorkoutSession.id.label("session_id"),
            WorkoutSession.performed_at.label("performed_at"),
            func.max(WorkoutSet.weight_kg).label("max_weight_kg"),
            func.sum(WorkoutSet.reps * WorkoutSet.weight_kg).label("volume_kg_reps"),
            func.count(WorkoutSet.id).label("set_count"),
        )
        .join(WorkoutSession.exercises)
        .join(WorkoutExercise.sets)
        .where(
            WorkoutSession.user_id == user.id,
            WorkoutExercise.exercise_id == exercise.id,
        )
        .group_by(WorkoutSession.id, WorkoutSession.performed_at)
        .order_by(WorkoutSession.performed_at.asc(), WorkoutSession.id.asc())
    )
    rows = db.execute(statement).all()
    workouts = [
        ExerciseProgressPoint(
            performed_at=row.performed_at,
            max_weight_kg=row.max_weight_kg,
            volume_kg_reps=row.volume_kg_reps,
            set_count=row.set_count,
        )
        for row in rows
    ]

    return ExerciseProgressRead(
        exercise_id=exercise.id,
        exercise_name=exercise.name,
        personal_best_kg=max((row.max_weight_kg for row in workouts), default=None),
        workouts=workouts,
    )
