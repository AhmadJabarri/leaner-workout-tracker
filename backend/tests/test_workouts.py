"""Saving and reading workouts, catalog access, and progress summaries."""

from fastapi.testclient import TestClient

BENCH_WORKOUT = {
    "routine_id": "chest-triceps",
    "exercises": [
        {
            "exercise_id": "dumbbell-bench-press",
            "sets": [{"reps": 10, "weight_kg": 20}, {"reps": 8, "weight_kg": 22.5}],
        }
    ],
}


def test_catalog_lists_builtin_exercises_and_routines(signed_in_client: TestClient) -> None:
    exercises = signed_in_client.get("/api/catalog/exercises").json()
    assert any(exercise["id"] == "dumbbell-bench-press" for exercise in exercises)

    routines = signed_in_client.get("/api/catalog/routines").json()
    assert {routine["id"] for routine in routines} >= {"chest-triceps", "back-biceps", "shoulders-legs"}


def test_saved_workout_appears_in_history(signed_in_client: TestClient) -> None:
    saved = signed_in_client.post("/api/workouts", json=BENCH_WORKOUT)
    assert saved.status_code == 201

    history = signed_in_client.get("/api/workouts").json()
    assert len(history) == 1
    sets = history[0]["exercises"][0]["sets"]
    assert [workout_set["reps"] for workout_set in sets] == [10, 8]
    assert sets[1]["weight"] == 22.5


def test_invalid_sets_are_rejected(signed_in_client: TestClient) -> None:
    bad_workout = {
        "exercises": [{"exercise_id": "dumbbell-bench-press", "sets": [{"reps": 0, "weight_kg": 20}]}]
    }
    assert signed_in_client.post("/api/workouts", json=bad_workout).status_code == 422


def test_unknown_exercise_is_rejected(signed_in_client: TestClient) -> None:
    workout = {"exercises": [{"exercise_id": "not-real", "sets": [{"reps": 5, "weight_kg": 10}]}]}
    assert signed_in_client.post("/api/workouts", json=workout).status_code == 422


def test_users_only_see_their_own_workouts(client: TestClient) -> None:
    client.post("/api/auth/signup", json={"username": "first", "password": "secret-pass"})
    client.post("/api/workouts", json=BENCH_WORKOUT)
    client.cookies.clear()

    client.post("/api/auth/signup", json={"username": "second", "password": "secret-pass"})
    assert client.get("/api/workouts").json() == []


def test_progress_tracks_personal_best(signed_in_client: TestClient) -> None:
    signed_in_client.post("/api/workouts", json=BENCH_WORKOUT)

    summary = signed_in_client.get("/api/progress/summary").json()
    assert summary["totalSessions"] == 1
    assert summary["totalSets"] == 2

    progress = signed_in_client.get("/api/progress/exercises/dumbbell-bench-press").json()
    assert float(progress["personalBestKg"]) == 22.5
