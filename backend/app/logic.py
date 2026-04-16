from datetime import datetime, timedelta


UTC_SUFFIX = 'Z'


def to_zulu(value: datetime) -> str:
    return value.isoformat().replace('+00:00', UTC_SUFFIX)


def floor_to_hour(value: datetime) -> datetime:
    return value.replace(minute=0, second=0, microsecond=0)


def current_due_slot(anchor: datetime, interval_hours: int, now: datetime) -> datetime | None:
    if interval_hours <= 0:
        return None
    if now < anchor:
        return None
    interval_seconds = interval_hours * 3600
    elapsed_seconds = int((now - anchor).total_seconds())
    slot_index = elapsed_seconds // interval_seconds
    return anchor + timedelta(hours=slot_index * interval_hours)


def next_due_slot(anchor: datetime, interval_hours: int, now: datetime) -> datetime:
    current_slot = current_due_slot(anchor, interval_hours, now)
    if current_slot is None:
        return anchor
    if current_slot == now:
        return current_slot
    return current_slot + timedelta(hours=interval_hours)


def preview_runs(start: datetime, interval_hours: int, count: int) -> list[datetime]:
    return [start + timedelta(hours=interval_hours * index) for index in range(count)]


def projected_hours_remaining(usdc_balance: float, amount_per_run: float, interval_hours: int) -> int:
    if amount_per_run <= 0 or interval_hours <= 0:
        return 0
    runs_left = int((usdc_balance + 1e-9) / amount_per_run)
    return runs_left * interval_hours


def should_low_balance_alert(usdc_balance: float, amount_per_run: float, interval_hours: int, threshold_hours: int) -> bool:
    return projected_hours_remaining(usdc_balance, amount_per_run, interval_hours) < threshold_hours
