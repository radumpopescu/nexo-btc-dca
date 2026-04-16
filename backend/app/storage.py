import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from .logic import current_due_slot, floor_to_hour, next_due_slot, preview_runs, projected_hours_remaining, should_low_balance_alert
from .models import AppState, MockOrder, NotificationSettings, ScheduleSettings, SettingsUpdate


class Database:
    def __init__(self, path: Path, now_provider=None):
        self.path = Path(path)
        self.now_provider = now_provider or (lambda: datetime.now(timezone.utc))

    def initialize(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as connection:
            connection.execute(
                '''
                CREATE TABLE IF NOT EXISTS app_state (
                    id INTEGER PRIMARY KEY CHECK (id = 1),
                    mode TEXT NOT NULL,
                    usdc_balance REAL NOT NULL,
                    pair TEXT NOT NULL,
                    amount_per_run REAL NOT NULL,
                    interval_hours INTEGER NOT NULL,
                    notify_on_buy INTEGER NOT NULL,
                    daily_summary INTEGER NOT NULL,
                    low_balance_threshold_hours INTEGER NOT NULL,
                    schedule_anchor_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                '''
            )
            connection.execute(
                '''
                CREATE TABLE IF NOT EXISTS mock_runs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    scheduled_for TEXT NOT NULL UNIQUE,
                    executed_at TEXT NOT NULL,
                    pair TEXT NOT NULL,
                    side TEXT NOT NULL,
                    quote_amount REAL NOT NULL,
                    status TEXT NOT NULL,
                    message TEXT NOT NULL
                )
                '''
            )
            existing = connection.execute('SELECT COUNT(*) FROM app_state').fetchone()[0]
            if existing == 0:
                anchor = floor_to_hour(self.now_provider())
                updated_at = self.now_provider().isoformat()
                connection.execute(
                    '''
                    INSERT INTO app_state (
                        id, mode, usdc_balance, pair, amount_per_run, interval_hours,
                        notify_on_buy, daily_summary, low_balance_threshold_hours,
                        schedule_anchor_at, updated_at
                    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''',
                    (
                        'mock',
                        138.0,
                        'BTC/USDC',
                        6.9,
                        4,
                        1,
                        1,
                        24,
                        anchor.isoformat(),
                        updated_at,
                    ),
                )
            connection.commit()

    def load_state(self) -> AppState:
        self.initialize()
        with self._connect() as connection:
            row = connection.execute('SELECT * FROM app_state WHERE id = 1').fetchone()
        return self._state_from_row(row)

    def load_schedule_anchor(self) -> datetime:
        self.initialize()
        with self._connect() as connection:
            row = connection.execute('SELECT schedule_anchor_at FROM app_state WHERE id = 1').fetchone()
        return datetime.fromisoformat(row['schedule_anchor_at'])

    def update_settings(self, update: SettingsUpdate) -> AppState:
        self.initialize()
        with self._connect() as connection:
            anchor = connection.execute('SELECT schedule_anchor_at FROM app_state WHERE id = 1').fetchone()['schedule_anchor_at']
            connection.execute(
                '''
                UPDATE app_state
                SET usdc_balance = ?,
                    pair = ?,
                    amount_per_run = ?,
                    interval_hours = ?,
                    notify_on_buy = ?,
                    daily_summary = ?,
                    low_balance_threshold_hours = ?,
                    updated_at = ?,
                    schedule_anchor_at = ?
                WHERE id = 1
                ''',
                (
                    update.usdc_balance,
                    update.schedule.pair,
                    update.schedule.amount_per_run,
                    update.schedule.interval_hours,
                    int(update.notifications.notify_on_buy),
                    int(update.notifications.daily_summary),
                    update.notifications.low_balance_threshold_hours,
                    self.now_provider().isoformat(),
                    anchor,
                ),
            )
            connection.commit()
        return self.load_state()

    def has_run_for_slot(self, slot: datetime) -> bool:
        self.initialize()
        with self._connect() as connection:
            row = connection.execute('SELECT 1 FROM mock_runs WHERE scheduled_for = ?', (slot.isoformat(),)).fetchone()
        return row is not None

    def list_recent_orders(self, limit: int = 12) -> list[MockOrder]:
        self.initialize()
        with self._connect() as connection:
            rows = connection.execute(
                '''
                SELECT scheduled_for, executed_at, pair, side, quote_amount, status, message
                FROM mock_runs
                ORDER BY scheduled_for DESC
                LIMIT ?
                ''',
                (limit,),
            ).fetchall()
        return [self._order_from_row(row) for row in rows]

    def run_due_mock_buy(self, now: datetime) -> tuple[bool, MockOrder | None, str]:
        state = self.load_state()
        anchor = self.load_schedule_anchor()
        due_slot = current_due_slot(anchor, state.schedule.interval_hours, now)
        if due_slot is None:
            return False, None, 'No schedule slot is due yet.'
        if self.has_run_for_slot(due_slot):
            return False, None, 'Current schedule slot already recorded.'
        if state.usdc_balance + 1e-9 < state.schedule.amount_per_run:
            return False, None, 'Not enough USDC to cover the next buy.'

        order = MockOrder(
            scheduled_for=due_slot,
            executed_at=now,
            pair=state.schedule.pair,
            quote_amount=state.schedule.amount_per_run,
            status='mocked',
            message='Should buy now',
        )
        new_balance = round(state.usdc_balance - state.schedule.amount_per_run, 10)

        with self._connect() as connection:
            connection.execute(
                '''
                INSERT INTO mock_runs (scheduled_for, executed_at, pair, side, quote_amount, status, message)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    order.scheduled_for.isoformat(),
                    order.executed_at.isoformat(),
                    order.pair,
                    order.side,
                    order.quote_amount,
                    order.status,
                    order.message,
                ),
            )
            connection.execute(
                'UPDATE app_state SET usdc_balance = ?, updated_at = ? WHERE id = 1',
                (new_balance, now.isoformat()),
            )
            connection.commit()
        return True, order, 'Mock buy recorded.'

    def build_state_payload(self, now: datetime) -> dict:
        state = self.load_state()
        anchor = self.load_schedule_anchor()
        current_slot = current_due_slot(anchor, state.schedule.interval_hours, now)
        should_buy_now = current_slot is not None and not self.has_run_for_slot(current_slot)
        preview_start = current_slot if should_buy_now else next_due_slot(anchor, state.schedule.interval_hours, now)
        return {
            'state': state.model_dump(mode='json'),
            'schedule_preview': [slot.isoformat().replace('+00:00', 'Z') for slot in preview_runs(preview_start, state.schedule.interval_hours, 5)],
            'hours_remaining': projected_hours_remaining(
                state.usdc_balance,
                state.schedule.amount_per_run,
                state.schedule.interval_hours,
            ),
            'should_alert_low_balance': should_low_balance_alert(
                state.usdc_balance,
                state.schedule.amount_per_run,
                state.schedule.interval_hours,
                state.notifications.low_balance_threshold_hours,
            ),
            'should_buy_now': should_buy_now,
            'database_path': str(self.path),
            'recent_orders': [order.model_dump(mode='json') for order in self.list_recent_orders()],
        }

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        return connection

    def _state_from_row(self, row: sqlite3.Row) -> AppState:
        return AppState(
            mode=row['mode'],
            usdc_balance=row['usdc_balance'],
            schedule=ScheduleSettings(
                pair=row['pair'],
                amount_per_run=row['amount_per_run'],
                interval_hours=row['interval_hours'],
            ),
            notifications=NotificationSettings(
                notify_on_buy=bool(row['notify_on_buy']),
                daily_summary=bool(row['daily_summary']),
                low_balance_threshold_hours=row['low_balance_threshold_hours'],
            ),
            updated_at=datetime.fromisoformat(row['updated_at']),
        )

    def _order_from_row(self, row: sqlite3.Row) -> MockOrder:
        return MockOrder(
            scheduled_for=datetime.fromisoformat(row['scheduled_for']),
            executed_at=datetime.fromisoformat(row['executed_at']),
            pair=row['pair'],
            side=row['side'],
            quote_amount=row['quote_amount'],
            status=row['status'],
            message=row['message'],
        )
