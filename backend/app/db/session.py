"""Create the shared SQLAlchemy engine and provide short-lived DB sessions.

The engine manages connections; each Session is a unit of work that API routes
will use to read or write rows. Closing a session returns its connection safely.
"""

import os
from pathlib import Path
from typing import Generator

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker


# Load backend/.env for local development. Environment variables set by the
# hosting platform still take precedence over values in this file.
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

database_url = os.getenv("DATABASE_URL")
if not database_url:
    raise RuntimeError(
        "DATABASE_URL is not set. Copy backend/.env.example to backend/.env "
        "and configure your PostgreSQL connection."
    )


# The engine owns the connection pool and is shared for the lifetime of the app.
engine = create_engine(database_url, pool_pre_ping=True)

# Each request can get its own Session from this factory.
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    """Yield one database session and always close it when the request ends."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
