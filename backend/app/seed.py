"""Seed the database with the app's built-in exercises and workout routines.

This is the source of truth for the built-in catalog the app serves. It is safe to
run again: shared built-in records are synchronized by their stable IDs, while
custom records with conflicting IDs are protected from being overwritten.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.dependencies import LOCAL_USER_ID, LOCAL_USER_PASSWORD_HASH, LOCAL_USER_USERNAME
from app.db.session import SessionLocal
from app.models import Exercise, RoutineExercise, User, WorkoutRoutine


# Stable IDs are stored in saved workouts, so never rename an existing ID.
BUILTIN_EXERCISES: tuple[tuple[str, str, str, str | None], ...] = (
    ("dumbbell-bench-press", "Dumbbell Bench Press", "Chest", "Dumbbell"),
    ("incline-dumbbell-bench-press", "Incline Dumbbell Bench Press", "Chest", "Dumbbell"),
    ("dumbbell-chest-fly", "Dumbbell Chest Fly", "Chest", "Dumbbell"),
    ("dumbbell-dips", "Dumbbell Dips", "Chest", "Dumbbell"),
    ("dumbbell-skull-crushers", "Dumbbell Skull Crushers", "Triceps", "Dumbbell"),
    ("dumbbell-triceps-pushdown", "Dumbbell Triceps Pushdown", "Triceps", "Dumbbell"),
    ("dumbbell-bent-over-row", "Dumbbell Bent-Over Row", "Back", "Dumbbell"),
    ("chest-supported-dumbbell-row", "Chest-Supported Dumbbell Row", "Back", "Dumbbell"),
    ("one-arm-dumbbell-row", "One-Arm Dumbbell Row", "Back", "Dumbbell"),
    ("dumbbell-pullover", "Dumbbell Pullover", "Back", "Dumbbell"),
    ("dumbbell-reverse-fly", "Dumbbell Reverse Fly", "Back", "Dumbbell"),
    ("dumbbell-hammer-curl", "Dumbbell Hammer Curl", "Biceps", "Dumbbell"),
    ("dumbbell-biceps-curl", "Dumbbell Biceps Curl", "Biceps", "Dumbbell"),
    ("seated-incline-dumbbell-curl", "Seated Incline Dumbbell Curl", "Biceps", "Dumbbell"),
    ("dumbbell-shoulder-press", "Dumbbell Shoulder Press", "Shoulders", "Dumbbell"),
    ("dumbbell-lateral-raise", "Dumbbell Lateral Raise", "Shoulders", "Dumbbell"),
    ("dumbbell-rear-delt-fly", "Dumbbell Rear Delt Fly", "Shoulders", "Dumbbell"),
    ("squat", "Squat", "Legs", None),
    ("hip-thrust", "Hip Thrust", "Legs", None),
    ("bulgarian-split-squat", "Bulgarian Split Squat", "Legs", None),
)


# Each routine lists exercise IDs in display order. Position starts at 1.
BUILTIN_ROUTINES: tuple[tuple[str, str, tuple[str, ...]], ...] = (
    (
        "chest-triceps",
        "Chest + Triceps",
        (
            "dumbbell-bench-press",
            "incline-dumbbell-bench-press",
            "dumbbell-chest-fly",
            "dumbbell-dips",
            "dumbbell-skull-crushers",
            "dumbbell-triceps-pushdown",
        ),
    ),
    (
        "back-biceps",
        "Back + Biceps",
        (
            "dumbbell-bent-over-row",
            "chest-supported-dumbbell-row",
            "one-arm-dumbbell-row",
            "dumbbell-pullover",
            "dumbbell-reverse-fly",
            "dumbbell-hammer-curl",
            "dumbbell-biceps-curl",
            "seated-incline-dumbbell-curl",
        ),
    ),
    (
        "shoulders-legs",
        "Shoulders + Legs",
        (
            "dumbbell-shoulder-press",
            "dumbbell-lateral-raise",
            "dumbbell-rear-delt-fly",
            "squat",
            "hip-thrust",
            "bulgarian-split-squat",
        ),
    ),
)


def _sync_exercises(db: Session) -> None:
    """Insert or update built-ins, but never overwrite a user's custom record."""
    for exercise_id, name, muscle_group, equipment in BUILTIN_EXERCISES:
        exercise = db.get(Exercise, exercise_id)
        if exercise is None:
            exercise = Exercise(id=exercise_id, owner_user_id=None)
            db.add(exercise)
        elif exercise.owner_user_id is not None:
            raise ValueError(
                f"Built-in exercise ID {exercise_id!r} conflicts with a custom exercise."
            )

        exercise.name = name
        exercise.primary_muscle_group = muscle_group
        exercise.equipment = equipment

    # Ensure exercise rows exist before creating foreign-key links to them.
    db.flush()


def _ensure_local_user(db: Session) -> None:
    """Create the local workout owner used until the app has authentication."""
    user = db.get(User, LOCAL_USER_ID)
    if user is None:
        user_with_username = db.scalar(
            select(User).where(User.username == LOCAL_USER_USERNAME)
        )
        if user_with_username is not None:
            raise ValueError("The reserved local username is already used by another user.")

        # This placeholder is never used to log in; authentication will replace
        # the local identity flow before the app is deployed publicly.
        db.add(
            User(
                id=LOCAL_USER_ID,
                username=LOCAL_USER_USERNAME,
                password_hash=LOCAL_USER_PASSWORD_HASH,
            )
        )
        db.flush()


def _sync_routines(db: Session) -> None:
    """Insert or update shared routines and their ordered exercise links."""
    for routine_id, name, exercise_ids in BUILTIN_ROUTINES:
        routine = db.get(WorkoutRoutine, routine_id)
        if routine is None:
            routine = WorkoutRoutine(id=routine_id, owner_user_id=None)
            db.add(routine)
        elif routine.owner_user_id is not None:
            raise ValueError(
                f"Built-in routine ID {routine_id!r} conflicts with a custom routine."
            )

        routine.name = name

    # Ensure routine rows exist before creating their association rows.
    db.flush()

    for routine_id, _name, exercise_ids in BUILTIN_ROUTINES:
        current_links = db.scalars(
            select(RoutineExercise).where(RoutineExercise.routine_id == routine_id)
        ).all()
        links_by_exercise_id = {link.exercise_id: link for link in current_links}
        desired_exercise_ids = set(exercise_ids)

        # Remove obsolete links if the built-in routine definition changes later.
        for link in current_links:
            if link.exercise_id not in desired_exercise_ids:
                db.delete(link)

        for position, exercise_id in enumerate(exercise_ids, start=1):
            link = links_by_exercise_id.get(exercise_id)
            if link is None:
                db.add(
                    RoutineExercise(
                        routine_id=routine_id,
                        exercise_id=exercise_id,
                        position=position,
                    )
                )
            else:
                link.position = position


def seed_builtin_catalog() -> None:
    """Synchronize the built-in catalog in one database transaction."""
    with SessionLocal() as db:
        try:
            _ensure_local_user(db)
            _sync_exercises(db)
            _sync_routines(db)
            db.commit()
        except Exception:
            # Keep the database from being left with only part of the catalog.
            db.rollback()
            raise

    print(
        "Seed complete: "
        f"{len(BUILTIN_EXERCISES)} built-in exercises and "
        f"{len(BUILTIN_ROUTINES)} built-in routines, plus the local development user."
    )


if __name__ == "__main__":
    seed_builtin_catalog()
