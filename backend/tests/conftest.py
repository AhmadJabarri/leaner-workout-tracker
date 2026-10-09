"""Shared fixtures: an isolated in-memory database and an API test client.

Tests never connect to Neon or a local PostgreSQL server. Each test gets a
fresh SQLite database with the built-in catalog seeded, so tests can't affect
each other or any real workout history.
"""

import os

# Must be set before app.db.session is imported, which requires DATABASE_URL.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ.pop("GROQ_API_KEY", None)

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401  (registers every table on Base.metadata)
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.seed import _ensure_local_user, _sync_exercises, _sync_routines


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    # StaticPool keeps one connection, so the in-memory database survives
    # across the sessions opened by separate requests.
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    with TestingSession() as seed_db:
        _ensure_local_user(seed_db)
        _sync_exercises(seed_db)
        _sync_routines(seed_db)
        seed_db.commit()

    def override_get_db() -> Generator[Session, None, None]:
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestingSession() as db:
        yield db
    app.dependency_overrides.clear()
    engine.dispose()


@pytest.fixture
def client(db_session: Session) -> TestClient:
    return TestClient(app)


@pytest.fixture
def signed_in_client(client: TestClient) -> TestClient:
    response = client.post(
        "/api/auth/signup",
        json={"username": "tester", "password": "correct-horse"},
    )
    assert response.status_code == 201
    return client
