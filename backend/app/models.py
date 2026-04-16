from datetime import datetime, timezone
from pydantic import BaseModel, Field


class ScheduleSettings(BaseModel):
    amount_per_run: float = Field(default=6.9)
    interval_hours: int = Field(default=4)
    pair: str = Field(default='BTC/USDC')


class NotificationSettings(BaseModel):
    notify_on_buy: bool = True
    daily_summary: bool = True
    low_balance_threshold_hours: int = 24


class AppState(BaseModel):
    mode: str = 'mock'
    usdc_balance: float = 138.0
    schedule: ScheduleSettings = Field(default_factory=ScheduleSettings)
    notifications: NotificationSettings = Field(default_factory=NotificationSettings)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
