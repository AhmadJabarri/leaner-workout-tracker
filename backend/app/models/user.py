"""User table model and its ORM relationships to a user's workout data."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid4)
    # Usernames identify accounts; API validation limits them to 3–32 characters.
    username: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    # Authentication code will store a password hash here, never the raw password.
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    exercises: Mapped[list[Exercise]] = relationship(back_populates="owner")
    routines: Mapped[list[WorkoutRoutine]] = relationship(back_populates="owner")
    workout_sessions: Mapped[list[WorkoutSession]] = relationship(back_populates="user")
    profile: Mapped[UserProfile | None] = relationship(back_populates="user", uselist=False)
