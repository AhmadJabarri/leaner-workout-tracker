"""Profile endpoints and the profile data the AI Coach receives."""

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import User
from app.schemas.profile import default_protein_target_g
from app.services.coach import _build_workout_context

PROFILE = {
    "bodyWeightKg": 63,
    "heightCm": 180,
    "age": 25,
    "goal": "build_muscle",
    "coachNotes": "I want high-protein meal ideas.",
}


def test_new_user_has_an_empty_profile(signed_in_client: TestClient) -> None:
    profile = signed_in_client.get("/api/profile").json()
    assert profile["bodyWeightKg"] is None
    assert profile["effectiveProteinTargetG"] is None


def test_profile_saves_and_calculates_protein_target(signed_in_client: TestClient) -> None:
    saved = signed_in_client.put("/api/profile", json=PROFILE)
    assert saved.status_code == 200
    body = saved.json()
    assert body["bodyWeightKg"] == 63
    assert body["goal"] == "build_muscle"
    # 63 kg × 1.8 g/kg for muscle gain.
    assert body["effectiveProteinTargetG"] == 113
    assert signed_in_client.get("/api/profile").json() == body


def test_custom_protein_target_overrides_default(signed_in_client: TestClient) -> None:
    body = signed_in_client.put("/api/profile", json={**PROFILE, "proteinTargetG": 130}).json()
    assert body["effectiveProteinTargetG"] == 130


def test_invalid_profile_values_are_rejected(signed_in_client: TestClient) -> None:
    assert signed_in_client.put("/api/profile", json={"bodyWeightKg": -5}).status_code == 422
    assert signed_in_client.put("/api/profile", json={"goal": "fly"}).status_code == 422


def test_profiles_are_private(client: TestClient) -> None:
    client.post("/api/auth/signup", json={"username": "first", "password": "secret-pass"})
    client.put("/api/profile", json=PROFILE)
    client.cookies.clear()
    client.post("/api/auth/signup", json={"username": "second", "password": "secret-pass"})
    assert client.get("/api/profile").json()["bodyWeightKg"] is None


def test_default_protein_target_by_goal() -> None:
    assert default_protein_target_g(None, "build_muscle") is None
    assert default_protein_target_g(63, "lose_fat") == 126
    assert default_protein_target_g(63, None) == 101


def test_coach_context_includes_profile_and_training_summary(
    signed_in_client: TestClient, db_session: Session
) -> None:
    signed_in_client.put("/api/profile", json=PROFILE)
    signed_in_client.post(
        "/api/workouts",
        json={"exercises": [{"exercise_id": "squat", "sets": [{"reps": 5, "weight_kg": 60}]}]},
    )

    user = db_session.scalar(select(User).where(User.username == "tester"))
    context, sessions = _build_workout_context(db_session, user)

    assert sessions == 1
    assert context["profile"]["dailyProteinTargetG"] == 113
    assert context["profile"]["bmi"] == 19.4
    assert context["profile"]["notesFromUser"] == "I want high-protein meal ideas."
    assert context["trainingSummary"]["setsByMuscleGroup"] == {"Legs": 1}
    assert context["trainingSummary"]["daysSinceLastWorkout"] == 0
