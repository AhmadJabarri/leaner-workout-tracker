"""Sign-in, sign-up, and AI Coach request limits."""

from fastapi.testclient import TestClient

from app.rate_limit import RateLimiter, coach_limiter, failed_signin_limiter, signup_limiter


def test_limiter_allows_up_to_the_limit() -> None:
    limiter = RateLimiter(limit=2, window_seconds=60)
    limiter.check("key", "blocked")
    limiter.hit("key")
    limiter.hit("key")
    try:
        limiter.check("key", "blocked")
    except Exception as error:
        assert getattr(error, "status_code", None) == 429
    else:
        raise AssertionError("third event should be blocked")
    # Other keys have their own allowance.
    limiter.check("other", "blocked")


def test_repeated_wrong_passwords_are_blocked(client: TestClient) -> None:
    client.post("/api/auth/signup", json={"username": "dave", "password": "secret-pass"})
    client.cookies.clear()

    for _ in range(failed_signin_limiter.limit):
        response = client.post("/api/auth/signin", json={"username": "dave", "password": "wrong"})
        assert response.status_code == 401

    # Even the correct password is refused until the window passes.
    blocked = client.post("/api/auth/signin", json={"username": "dave", "password": "secret-pass"})
    assert blocked.status_code == 429
    assert "Retry-After" in blocked.headers


def test_successful_signins_are_not_counted(client: TestClient) -> None:
    client.post("/api/auth/signup", json={"username": "erin", "password": "secret-pass"})
    for _ in range(failed_signin_limiter.limit + 2):
        response = client.post("/api/auth/signin", json={"username": "erin", "password": "secret-pass"})
        assert response.status_code == 200


def test_signups_per_network_are_limited(client: TestClient) -> None:
    for number in range(signup_limiter.limit):
        response = client.post(
            "/api/auth/signup", json={"username": f"user{number}", "password": "secret-pass"}
        )
        assert response.status_code == 201
    blocked = client.post("/api/auth/signup", json={"username": "onemore", "password": "secret-pass"})
    assert blocked.status_code == 429


def test_coach_requests_are_limited(signed_in_client: TestClient) -> None:
    # Without GROQ_API_KEY each allowed request returns 503, but still counts.
    for _ in range(coach_limiter.limit):
        response = signed_in_client.post("/api/coach/ask", json={"question": "How am I doing?"})
        assert response.status_code == 503
    blocked = signed_in_client.post("/api/coach/ask", json={"question": "How am I doing?"})
    assert blocked.status_code == 429
