from datetime import datetime, timedelta


def next_runs(start: datetime, interval_hours: int, count: int) -> list[datetime]:
    return [start + timedelta(hours=interval_hours * index) for index in range(count)]


def projected_hours_remaining(usdc_balance: float, amount_per_run: float, interval_hours: int) -> int:
    if amount_per_run <= 0 or interval_hours <= 0:
        return 0
    runs_left = int((usdc_balance + 1e-9) / amount_per_run)
    return runs_left * interval_hours


def should_low_balance_alert(usdc_balance: float, amount_per_run: float, interval_hours: int, threshold_hours: int) -> bool:
    return projected_hours_remaining(usdc_balance, amount_per_run, interval_hours) < threshold_hours
