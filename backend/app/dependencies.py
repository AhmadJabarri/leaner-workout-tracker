"""Request dependencies for database access and authenticated user identity."""

import hashlib
from datetime import datetime, timezone
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models import User, UserSession

# Stable local account seeded for workout ownership until authentication exists.
LOCAL_USER_ID = UUID("00000000-0000-0000-0000-000000000001")
LOCAL_USER_USERNAME = "local-user"
LOCAL_USER_PASSWORD_HASH = "LOCAL_ONLY_AUTH_NOT_ENABLED"


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    """Resolve the user from a valid session cookie, never from a client user ID."""
    raw_token = request.cookies.get("leaner_session")
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sign in to continue.",
        )

    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    now = datetime.now(timezone.utc)
    session = db.scalar(
        select(UserSession).where(
            UserSession.token_hash == token_hash,
            UserSession.expires_at > now,
        )
    )
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session has expired. Sign in again.",
        )

    user = db.get(User, session.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Your session is no longer valid. Sign in again.",
        )
    return user
