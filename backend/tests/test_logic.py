from datetime import datetime, timedelta, timezone

from app.logic import next_runs, projected_hours_remaining, should_low_balance_alert


def test_next_runs_every_four_hours():
    start = datetime(2026, 4, 16, 8, 0, tzinfo=timezone.utc)
    runs = next_runs(start, interval_hours=4, count=3)
    assert runs == [
        datetime(2026, 4, 16, 8, 0, tzinfo=timezone.utc),
        datetime(2026, 4, 16, 12, 0, tzinfo=timezone.utc),
        datetime(2026, 4, 16, 16, 0, tzinfo=timezone.utc),
    ]


def test_projected_hours_remaining_for_balance_cover():
    hours = projected_hours_remaining(usdc_balance=34.5, amount_per_run=6.9, interval_hours=4)
    assert hours == 20


def test_low_balance_alert_when_cover_below_threshold():
    assert should_low_balance_alert(usdc_balance=20, amount_per_run=6.9, interval_hours=4, threshold_hours=24) is True
    assert should_low_balance_alert(usdc_balance=100, amount_per_run=6.9, interval_hours=4, threshold_hours=24) is False
