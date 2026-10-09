"""Account sign-up, sign-in, session, and sign-out behavior."""

from fastapi.testclient import TestClient


def test_signup_signs_the_user_in(client: TestClient) -> None:
    response = client.post(
        "/api/auth/signup",
        json={"username": "Alice", "password": "secret-pass"},
    )
    assert response.status_code == 201
    # Usernames are normalized to lowercase.
    assert response.json()["username"] == "alice"
    assert "password_hash" not in response.json()

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["username"] == "alice"


def test_duplicate_username_is_rejected(client: TestClient) -> None:
    client.post("/api/auth/signup", json={"username": "bob", "password": "secret-pass"})
    client.cookies.clear()
    response = client.post("/api/auth/signup", json={"username": "BOB", "password": "other-pass"})
    assert response.status_code == 409


def test_signin_with_wrong_password_fails(client: TestClient) -> None:
    client.post("/api/auth/signup", json={"username": "carol", "password": "secret-pass"})
    client.cookies.clear()

    wrong = client.post("/api/auth/signin", json={"username": "carol", "password": "nope"})
    assert wrong.status_code == 401

    right = client.post("/api/auth/signin", json={"username": "carol", "password": "secret-pass"})
    assert right.status_code == 200


def test_private_routes_require_a_session(client: TestClient) -> None:
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/workouts").status_code == 401


def test_logout_ends_the_session(signed_in_client: TestClient) -> None:
    assert signed_in_client.post("/api/auth/logout").status_code == 204
    signed_in_client.cookies.clear()
    assert signed_in_client.get("/api/auth/me").status_code == 401
