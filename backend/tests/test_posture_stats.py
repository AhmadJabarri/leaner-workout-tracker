"""Tests for the posture streak calculation."""

from datetime import date

from app.services.posture_stats import current_streak

TODAY = date(2026, 10, 10)


def test_no_checkins_means_no_streak() -> None:
    assert current_streak([], TODAY) == 0


def test_only_today() -> None:
    assert current_streak([date(2026, 10, 10)], TODAY) == 1


def test_three_days_in_a_row_ending_today() -> None:
    dates = [date(2026, 10, 8), date(2026, 10, 9), date(2026, 10, 10)]
    assert current_streak(dates, TODAY) == 3


def test_not_checked_in_today_yet_keeps_streak() -> None:
    dates = [date(2026, 10, 8), date(2026, 10, 9)]
    assert current_streak(dates, TODAY) == 2


def test_missed_yesterday_and_today_breaks_streak() -> None:
    dates = [date(2026, 10, 7), date(2026, 10, 8)]
    assert current_streak(dates, TODAY) == 0


def test_a_gap_stops_the_count() -> None:
    # Oct 7 is missing, so only Oct 8-10 count.
    dates = [date(2026, 10, 5), date(2026, 10, 6), date(2026, 10, 8), date(2026, 10, 9), date(2026, 10, 10)]
    assert current_streak(dates, TODAY) == 3


def test_order_and_duplicates_do_not_matter() -> None:
    dates = [date(2026, 10, 10), date(2026, 10, 9), date(2026, 10, 10), date(2026, 10, 9)]
    assert current_streak(dates, TODAY) == 2
