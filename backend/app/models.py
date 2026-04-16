from datetime import datetime, timezone

from pydantic import BaseModel, Field


class ScheduleSettings(BaseModel):
    amount_per_run: float = Field(default=6.9, gt=0)
    interval_hours: int = Field(default=4, ge=1)
    pair: str = Field(default='BTC/USDC', min_length=3)


class NotificationSettings(BaseModel):
    notify_on_buy: bool = True
    daily_summary: bool = True
    low_balance_threshold_hours: int = Field(default=24, ge=1)


class AppState(BaseModel):
    mode: str = 'mock'
    usdc_balance: float = Field(default=138.0, ge=0)
    schedule: ScheduleSettings = Field(default_factory=ScheduleSettings)
    notifications: NotificationSettings = Field(default_factory=NotificationSettings)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SettingsUpdate(BaseModel):
    usdc_balance: float = Field(ge=0)
    schedule: ScheduleSettings
    notifications: NotificationSettings


class MockOrder(BaseModel):
    scheduled_for: datetime
    executed_at: datetime
    pair: str
    side: str = 'buy'
    quote_amount: float
    status: str
    message: str
