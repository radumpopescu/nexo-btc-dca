import sqlite3
from datetime import date, datetime, timezone
from pathlib import Path

from .logic import current_due_slot, floor_to_hour, next_due_slot, preview_runs, projected_hours_remaining, should_low_balance_alert
from .models import ActivitySummary, AppState, MockOrder, NotificationSettings, ScheduleSettings, SettingsUpdate


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
            self._ensure_column(connection, 'app_state', 'btc_balance', 'REAL NOT NULL DEFAULT 0')
            self._ensure_column(connection, 'app_state', 'btc_price', 'REAL NOT NULL DEFAULT 100000')
            self._ensure_column(connection, 'mock_runs', 'base_amount', 'REAL NOT NULL DEFAULT 0')
            self._ensure_column(connection, 'mock_runs', 'price_usdc', 'REAL NOT NULL DEFAULT 0')
            existing = connection.execute('SELECT COUNT(*) FROM app_state').fetchone()[0]
            if existing == 0:
                anchor = floor_to_hour(self.now_provider())
                updated_at = self.now_provider().isoformat()
                connection.execute(
                    '''
                    INSERT INTO app_state (
                        id, mode, usdc_balance, btc_balance, btc_price, pair, amount_per_run, interval_hours,
                        notify_on_buy, daily_summary, low_balance_threshold_hours,
                        schedule_anchor_at, updated_at
                    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''',
                    (
                        'mock',
                        138.0,
                        0.0,
                        100000.0,
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
                    btc_balance = ?,
                    btc_price = ?,
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
                    update.btc_balance,
                    update.btc_price,
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

    def list_recent_orders(self, date_from: date | None = None, date_to: date | None = None, limit: int = 200) -> list[MockOrder]:
        self.initialize()
        clauses: list[str] = []
        params: list[object] = []
        if date_from is not None:
            clauses.append('substr(scheduled_for, 1, 10) >= ?')
            params.append(date_from.isoformat())
        if date_to is not None:
            clauses.append('substr(scheduled_for, 1, 10) <= ?')
            params.append(date_to.isoformat())
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ''
        query = f'''
            SELECT scheduled_for, executed_at, pair, side, quote_amount, base_amount, price_usdc, status, message
            FROM mock_runs
            {where}
            ORDER BY scheduled_for DESC
            LIMIT ?
        '''
        params.append(limit)
        with self._connect() as connection:
            rows = connection.execute(query, tuple(params)).fetchall()
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

        base_amount = round(state.schedule.amount_per_run / state.btc_price, 12)
        order = MockOrder(
            scheduled_for=due_slot,
            executed_at=now,
            pair=state.schedule.pair,
            quote_amount=state.schedule.amount_per_run,
            base_amount=base_amount,
            price_usdc=state.btc_price,
            status='mocked',
            message='Should buy now',
        )
        new_balance = round(state.usdc_balance - state.schedule.amount_per_run, 10)
        new_btc_balance = round(state.btc_balance + base_amount, 12)

        with self._connect() as connection:
            connection.execute(
                '''
                INSERT INTO mock_runs (scheduled_for, executed_at, pair, side, quote_amount, base_amount, price_usdc, status, message)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (
                    order.scheduled_for.isoformat(),
                    order.executed_at.isoformat(),
                    order.pair,
                    order.side,
                    order.quote_amount,
                    order.base_amount,
                    order.price_usdc,
                    order.status,
                    order.message,
                ),
            )
            connection.execute(
                'UPDATE app_state SET usdc_balance = ?, btc_balance = ?, updated_at = ? WHERE id = 1',
                (new_balance, new_btc_balance, now.isoformat()),
            )
            connection.commit()
        return True, order, 'Mock buy recorded.'

    def build_state_payload(self, now: datetime, date_from: date | None = None, date_to: date | None = None) -> dict:
        state = self.load_state()
        anchor = self.load_schedule_anchor()
        current_slot = current_due_slot(anchor, state.schedule.interval_hours, now)
        should_buy_now = current_slot is not None and not self.has_run_for_slot(current_slot)
        preview_start = current_slot if should_buy_now else next_due_slot(anchor, state.schedule.interval_hours, now)
        filtered_orders = self.list_recent_orders(date_from=date_from, date_to=date_to)
        btc_position_value = round(state.btc_balance * state.btc_price, 10)
        total_usdc = round(state.usdc_balance + btc_position_value, 10)
        activity_summary = ActivitySummary(
            order_count=len(filtered_orders),
            quote_spent=round(sum(order.quote_amount for order in filtered_orders), 10),
            btc_bought=round(sum(order.base_amount for order in filtered_orders), 12),
        )
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
            'account_value': {
                'usdc_balance': round(state.usdc_balance, 10),
                'btc_balance': round(state.btc_balance, 12),
                'btc_price': round(state.btc_price, 10),
                'btc_position_value': btc_position_value,
                'total_usdc': total_usdc,
            },
            'filters': {
                'date_from': date_from.isoformat() if date_from else '',
                'date_to': date_to.isoformat() if date_to else '',
            },
            'activity_summary': activity_summary.model_dump(mode='json'),
            'recent_orders': [order.model_dump(mode='json') for order in filtered_orders],
        }

    def _ensure_column(self, connection: sqlite3.Connection, table: str, column: str, definition: str) -> None:
        existing_columns = {row['name'] for row in connection.execute(f'PRAGMA table_info({table})').fetchall()}
        if column not in existing_columns:
            connection.execute(f'ALTER TABLE {table} ADD COLUMN {column} {definition}')

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        return connection

    def _state_from_row(self, row: sqlite3.Row) -> AppState:
        return AppState(
            mode=row['mode'],
            usdc_balance=row['usdc_balance'],
            btc_balance=row['btc_balance'],
            btc_price=row['btc_price'],
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
            base_amount=row['base_amount'],
            price_usdc=row['price_usdc'],
            status=row['status'],
            message=row['message'],
        )
