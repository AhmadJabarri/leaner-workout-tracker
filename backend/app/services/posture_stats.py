"""Pure calculations for posture check-ins (no database, so they're easy to test)."""

from datetime import date, timedelta


def current_streak(checkin_dates: list[date], today: date) -> int:
    """Return how many days in a row the user has checked in, ending today.

    Rules:
    - If they checked in today, count today and every day before it without a gap.
    - If they haven't checked in today yet, the streak isn't broken: count from
      yesterday instead (they still have the rest of today).
    - If they missed yesterday AND today, the streak is 0.
    - The list may be in any order and may contain duplicates.

    Example: today is Oct 10, check-ins on Oct 8, 9, 10 -> 3.
    """
    # Remove duplicates and sort oldest -> newest, so the newest date is last.
    unique_checkins = sorted(set(checkin_dates))

    yesterday = today - timedelta(days=1)

    # Ignore any dates in the future; they can't be part of a streak yet.
    while unique_checkins and unique_checkins[-1] > today:
        unique_checkins.pop()

    if not unique_checkins:
        return 0

    # Start from today if they've checked in today, otherwise from yesterday.
    expected = today if unique_checkins[-1] == today else yesterday

    count = 0
    # Walk backwards one day at a time while each expected day is present.
    while unique_checkins and unique_checkins[-1] == expected:
        count += 1
        unique_checkins.pop()
        expected -= timedelta(days=1)

    return count
