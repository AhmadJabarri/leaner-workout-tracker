"""Build a bounded profile + workout context and ask Groq for coaching advice."""

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
    UserProfile,
    WorkoutExercise,
    WorkoutRoutine,
    WorkoutSession,
    WorkoutSet,
)
from app.schemas.profile import default_protein_target_g

LOOKBACK_WEEKS = 8
MAX_EXERCISE_SESSION_ROWS = 80


SYSTEM_PROMPT = (
    "You are Leaner Coach, a personal strength-training and nutrition coach for "
    "one person. You receive their profile (body weight, height, age, goal, daily "
    "protein target, and notes they want you to always remember) and a summary of "
    "their recent training, all calculated by the backend.\n\n"
    "How to coach:\n"
    "- Ground every answer in their data first: cite the actual exercises, weights, "
    "frequency, and muscle-group balance you see. Then give clear, practical advice: "
    "what to do next session, progression (e.g. add reps or a small weight jump), "
    "exercises to add or swap, recovery, and weekly structure.\n"
    "- You may use sound, mainstream exercise-science and sports-nutrition knowledge "
    "to make suggestions, including new exercises they haven't logged.\n"
    "- Nutrition: use their dailyProteinTargetG as the protein goal and mention it "
    "when relevant. Suggest simple foods and meal ideas that help reach it. You do "
    "not see what they ate unless they tell you in the question.\n"
    "- Always respect notesFromUser.\n"
    "- Use the supplied numbers as given; don't invent workouts or stats that aren't "
    "in the context. If data is missing (e.g. no profile or few workouts), say what "
    "is missing and still give useful general guidance.\n"
    "- Safety: you are not a doctor. For pain, injury, or medical conditions, give "
    "cautious general advice and recommend seeing a professional. Never suggest "
    "extreme diets or supplements beyond common ones like protein powder or creatine.\n"
    "- Never mention JSON field names (like dailyProteinTargetG); speak naturally.\n"
    "- Do not guess the user's name. Be direct and encouraging. Keep answers short: "
    "a sentence of assessment, then up to 5 short bullet points starting with '- '. "
    "Plain text only, no Markdown headings or bold."
)


class CoachNotConfiguredError(Exception):
    """Raised when the server has no provider key configured."""


def _profile_context(db: Session, user: User) -> dict[str, Any] | None:
    """Summarize the user's saved profile, including backend-calculated values."""
    profile = db.get(UserProfile, user.id)
    if profile is None:
        return None

    weight = float(profile.body_weight_kg) if profile.body_weight_kg is not None else None
    height = float(profile.height_cm) if profile.height_cm is not None else None
    bmi = round(weight / (height / 100) ** 2, 1) if weight and height else None
    return {
        "bodyWeightKg": weight,
        "heightCm": height,
        "age": profile.age,
        "goal": profile.goal,
        "bmi": bmi,
        "dailyProteinTargetG": profile.protein_target_g
        or default_protein_target_g(profile.body_weight_kg, profile.goal),
        "notesFromUser": profile.coach_notes,
    }


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

    # Simple backend-calculated summaries so the model doesn't do arithmetic.
    now = datetime.now(timezone.utc)
    session_dates = {row.session_id: row.performed_at for row in recent_rows}
    sets_by_muscle_group: dict[str, int] = {}
    for row in recent_rows:
        sets_by_muscle_group[row.muscle_group] = sets_by_muscle_group.get(row.muscle_group, 0) + int(row.set_count)
    last_workout = max(session_dates.values(), default=None)
    if last_workout is not None and last_workout.tzinfo is None:
        # Stored times are UTC; some drivers return them without a timezone.
        last_workout = last_workout.replace(tzinfo=timezone.utc)

    context = {
        "today": now.date().isoformat(),
        "profile": _profile_context(db, user),
        "trainingSummary": {
            "workoutsInWindow": len(session_dates),
            "averageWorkoutsPerWeek": round(len(session_dates) / LOOKBACK_WEEKS, 1),
            "daysSinceLastWorkout": (now - last_workout).days if last_workout else None,
            "setsByMuscleGroup": sets_by_muscle_group,
        },
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
                "content": SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": (
                    f"Question: {question}\n\n"
                    "Verified profile and workout context (JSON):\n"
                    f"{json.dumps(context, ensure_ascii=False)}"
                ),
            },
        ],
        temperature=0.5,
        max_completion_tokens=900,
    )
    answer = completion.choices[0].message.content
    if not answer:
        raise RuntimeError("The AI provider returned an empty answer.")
    return answer, sessions_analyzed
