"""Small in-memory rate limiter for sign-in attempts and AI Coach requests.

Leaner runs as a single Koyeb instance, so per-process memory is enough. The
counters reset when the server restarts, which is acceptable for slowing down
password guessing and protecting the Groq bill; it is not a billing ledger.
"""

import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request, status


class RateLimiter:
    """Allow at most `limit` events per key within a sliding `window_seconds`."""

    def __init__(self, limit: int, window_seconds: float) -> None:
        self.limit = limit
        self.window_seconds = window_seconds
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def _prune(self, key: str, now: float) -> deque[float]:
        events = self._events[key]
        while events and now - events[0] >= self.window_seconds:
            events.popleft()
        return events

    def check(self, key: str, message: str) -> None:
        """Raise 429 if `key` has already used its allowance; does not record."""
        with self._lock:
            events = self._prune(key, time.monotonic())
            if len(events) >= self.limit:
                retry_after = int(self.window_seconds - (time.monotonic() - events[0])) + 1
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=message,
                    headers={"Retry-After": str(retry_after)},
                )

    def hit(self, key: str) -> None:
        """Record one event for `key`."""
        with self._lock:
            now = time.monotonic()
            self._prune(key, now).append(now)

    def reset(self) -> None:
        with self._lock:
            self._events.clear()


def client_ip(request: Request) -> str:
    """Use the first X-Forwarded-For address set by Koyeb's proxy, if present."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# Failed sign-ins per username and per IP within 15 minutes.
failed_signin_limiter = RateLimiter(limit=10, window_seconds=15 * 60)
# New accounts per IP within an hour.
signup_limiter = RateLimiter(limit=5, window_seconds=60 * 60)
# AI Coach questions per user within an hour.
coach_limiter = RateLimiter(limit=30, window_seconds=60 * 60)

ALL_LIMITERS = (failed_signin_limiter, signup_limiter, coach_limiter)
