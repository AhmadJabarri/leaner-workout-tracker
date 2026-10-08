"""Build a bounded workout context and ask Groq to explain it to the user."""

import json
import os
from datetime import datetime, timedelta, timezone
from typing import Any

from groq import Groq
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    Exercise,
    User,
    WorkoutExercise,
    WorkoutRoutine,
    WorkoutSession,
    WorkoutSet,
)

LOOKBACK_WEEKS = 8
MAX_EXERCISE_SESSION_ROWS = 80


class CoachNotConfiguredError(Exception):
    """Raised when the server has no provider key configured."""


def _build_workout_context(db: Session, user: User) -> tuple[dict[str, Any], int]:
    """Query only this user's recent aggregates plus all-time best loads.

    The LLM receives a compact, fixed time window rather than the full database
    history. Workout notes and other users' data are deliberately excluded.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(weeks=LOOKBACK_WEEKS)
    recent_statement = (
        select(
            WorkoutSession.id.label("session_id"),
            WorkoutSession.performed_at.label("performed_at"),
            WorkoutRoutine.name.label("routine_name"),
            Exercise.id.label("exercise_id"),
            Exercise.name.label("exercise_name"),
            Exercise.primary_muscle_group.label("muscle_group"),
            func.max(WorkoutSet.weight_kg).label("max_weight_kg"),
            func.sum(WorkoutSet.reps * WorkoutSet.weight_kg).label("volume_kg_reps"),
            func.sum(WorkoutSet.reps).label("total_reps"),
            func.count(WorkoutSet.id).label("set_count"),
        )
        .join(WorkoutSession.exercises)
        .join(WorkoutExercise.exercise)
        .join(WorkoutExercise.sets)
        .outerjoin(WorkoutSession.routine)
        .where(
            WorkoutSession.user_id == user.id,
            WorkoutSession.performed_at >= cutoff,
        )
        .group_by(
            WorkoutSession.id,
            WorkoutSession.performed_at,
            WorkoutRoutine.name,
            Exercise.id,
            Exercise.name,
            Exercise.primary_muscle_group,
        )
        .order_by(WorkoutSession.performed_at.desc(), Exercise.name.asc())
        .limit(MAX_EXERCISE_SESSION_ROWS)
    )
    recent_rows = db.execute(recent_statement).all()
    # Count only sessions represented in the bounded context sent to the model.
    sessions_analyzed = len({row.session_id for row in recent_rows})

    # This is a compact all-time reference metric, not a dump of historical sets.
    best_statement = (
        select(
            Exercise.name.label("exercise_name"),
            func.max(WorkoutSet.weight_kg).label("best_weight_kg"),
        )
        .select_from(WorkoutSession)
        .join(WorkoutSession.exercises)
        .join(WorkoutExercise.exercise)
        .join(WorkoutExercise.sets)
        .where(WorkoutSession.user_id == user.id)
        .group_by(Exercise.id, Exercise.name)
        .order_by(Exercise.name.asc())
    )
    best_rows = db.execute(best_statement).all()

    context = {
        "window": f"Most recent {LOOKBACK_WEEKS} weeks",
        "allTimeHeaviestSetByExercise": [
            {"exercise": row.exercise_name, "weightKg": float(row.best_weight_kg)}
            for row in best_rows
        ],
        "recentExerciseSessions": [
            {
                "date": row.performed_at.isoformat(),
                "routine": row.routine_name,
                "exercise": row.exercise_name,
                "muscleGroup": row.muscle_group,
                "heaviestSetKg": float(row.max_weight_kg),
                "volumeKgReps": float(row.volume_kg_reps),
                "totalReps": int(row.total_reps),
                "sets": int(row.set_count),
            }
            for row in recent_rows
        ],
    }
    return context, int(sessions_analyzed)


def answer_workout_question(db: Session, user: User, question: str) -> tuple[str, int]:
    """Send the user's question and server-built workout context to Groq."""
    api_key = os.getenv("GROQ_API_KEY")
    model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    if not api_key:
        raise CoachNotConfiguredError

    context, sessions_analyzed = _build_workout_context(db, user)
    client = Groq(api_key=api_key, timeout=30.0, max_retries=0)
    completion = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": (
                    "You answer questions only from the supplied workout context. "
                    "Do not use outside fitness knowledge or give generic workout "
                    "programs, exercise suggestions, targets, or training rules. "
                    "Do not mention exercises, metrics, units, or effort scales "
                    "that are absent from the context. The backend calculated the "
                    "metrics: explain the supplied values, but do not calculate, "
                    "change, or invent numbers. If the context is empty or does not "
                    "contain evidence that answers the question, say that plainly "
                    "and ask the user to log relevant workouts. If the question is "
                    "not answerable from workout data, say you can only answer from "
                    "their saved workout data. Do not guess the user's name. Reply "
                    "concisely in plain text without Markdown formatting."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Question: {question}\n\n"
                    "Verified workout context (JSON):\n"
                    f"{json.dumps(context, ensure_ascii=False)}"
                ),
            },
        ],
        temperature=0.3,
        max_completion_tokens=500,
    )
    answer = completion.choices[0].message.content
    if not answer:
        raise RuntimeError("The AI provider returned an empty answer.")
    return answer, sessions_analyzed
