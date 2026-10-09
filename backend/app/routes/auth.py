"""Account registration, sign-in, current-session, and logout endpoints."""

import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies import (
    LOCAL_USER_ID,
    LOCAL_USER_PASSWORD_HASH,
    LOCAL_USER_USERNAME,
    get_current_user,
)
from app.models import User, UserSession
from app.rate_limit import client_ip, failed_signin_limiter, signup_limiter
from app.schemas.auth import SignInRequest, SignUpRequest, UserRead

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Argon2 is pwdlib's recommended password hashing algorithm. It is intentionally
# slow to make large-scale guessing attacks more expensive if hashes are stolen.
password_hasher = PasswordHash.recommended()
SESSION_COOKIE = "leaner_session"
SESSION_LIFETIME = timedelta(days=14)


def _secure_cookie() -> bool:
    """Use secure cookies in deployment; local HTTP development defaults to false."""
    return os.getenv("AUTH_COOKIE_SECURE", "false").strip().lower() == "true"


def _start_session(db: Session, user: User, response: Response) -> None:
    """Create a random browser token while persisting only its SHA-256 digest."""
    raw_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + SESSION_LIFETIME
    db.add(
        UserSession(
            user_id=user.id,
            token_hash=hashlib.sha256(raw_token.encode("utf-8")).hexdigest(),
            expires_at=expires_at,
        )
    )
    response.set_cookie(
        key=SESSION_COOKIE,
        value=raw_token,
        max_age=int(SESSION_LIFETIME.total_seconds()),
        expires=expires_at,
        httponly=True,
        secure=_secure_cookie(),
        samesite="lax",
        path="/",
    )


@router.post(
    "/signup",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a user account",
)
def sign_up(
    payload: SignUpRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> User:
    """Validate uniqueness, hash the password, save the user, and sign them in."""
    ip_key = client_ip(request)
    signup_limiter.check(ip_key, "Too many new accounts from this network. Try again later.")
    username = payload.username
    existing_user = db.scalar(select(User.id).where(User.username == username))
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this username already exists.",
        )

    new_password_hash = password_hasher.hash(payload.password.get_secret_value())
    # The first real account claims the seeded placeholder instead of creating a
    # second user, preserving the UUID that owns this installation's old workouts.
    local_user = db.scalar(
        select(User)
        .where(
            User.id == LOCAL_USER_ID,
            User.username == LOCAL_USER_USERNAME,
            User.password_hash == LOCAL_USER_PASSWORD_HASH,
        )
        .with_for_update()
    )
    if local_user is not None:
        user = local_user
        user.username = username
        user.password_hash = new_password_hash
    else:
        user = User(username=username, password_hash=new_password_hash)
    try:
        db.add(user)
        db.flush()
        _start_session(db, user, response)
        db.commit()
        db.refresh(user)
    except IntegrityError as error:
        # The unique database index also protects against two simultaneous
        # sign-up requests passing the check above at the same time.
        db.rollback()
        if db.scalar(select(User.id).where(User.username == username)) is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this username already exists.",
            ) from error
        raise

    signup_limiter.hit(ip_key)
    return user


@router.post("/signin", response_model=UserRead, summary="Sign in to an account")
def sign_in(
    payload: SignInRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> User:
    """Verify credentials and issue a fresh, expiring session cookie."""
    # Only failed attempts are counted, so normal sign-ins never lock anyone out.
    limit_keys = (f"user:{payload.username}", f"ip:{client_ip(request)}")
    for key in limit_keys:
        failed_signin_limiter.check(
            key, "Too many failed sign-in attempts. Wait a few minutes and try again."
        )
    user = db.scalar(select(User).where(User.username == payload.username))
    password = payload.password.get_secret_value()
    try:
        password_is_valid = user is not None and password_hasher.verify(
            password, user.password_hash
        )
    except UnknownHashError:
        password_is_valid = False

    if not password_is_valid or user is None:
        for key in limit_keys:
            failed_signin_limiter.hit(key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username or password is incorrect.",
        )

    _start_session(db, user, response)
    db.commit()
    return user


@router.get("/me", response_model=UserRead, summary="Get the signed-in account")
def get_me(user: User = Depends(get_current_user)) -> User:
    """Return the account resolved from the browser's valid session cookie."""
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="End the current session")
def log_out(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> None:
    """Revoke the current database session and expire its browser cookie."""
    raw_token = request.cookies.get(SESSION_COOKIE)
    if raw_token:
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        db.execute(delete(UserSession).where(UserSession.token_hash == token_hash))
        db.commit()
    response.delete_cookie(
        key=SESSION_COOKIE,
        path="/",
        httponly=True,
        secure=_secure_cookie(),
        samesite="lax",
    )
