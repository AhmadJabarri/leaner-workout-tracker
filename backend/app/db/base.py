"""Shared SQLAlchemy base; inheriting from it registers model table metadata."""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class that collects SQLAlchemy table models in its metadata."""
