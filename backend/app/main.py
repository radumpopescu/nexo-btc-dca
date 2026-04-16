from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .logic import next_runs, projected_hours_remaining, should_low_balance_alert
from .models import AppState

app = FastAPI(title='Nexo BTC DCA Mock App')
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_methods=['*'], allow_headers=['*'])

STATE = AppState()
MOCK_ORDERS = [
    {
        'time': '2026-04-16T08:00:00Z',
        'pair': 'BTC/USDC',
        'side': 'buy',
        'quote_amount': 6.9,
        'status': 'mocked',
        'message': 'Should buy now',
    },
    {
        'time': '2026-04-16T12:00:00Z',
        'pair': 'BTC/USDC',
        'side': 'buy',
        'quote_amount': 6.9,
        'status': 'scheduled',
        'message': 'Next scheduled mock buy',
    },
]


@app.get('/api/state')
def get_state():
    hours_remaining = projected_hours_remaining(
        STATE.usdc_balance,
        STATE.schedule.amount_per_run,
        STATE.schedule.interval_hours,
    )
    now = datetime(2026, 4, 16, 8, 0, tzinfo=timezone.utc)
    return {
        'state': STATE.model_dump(mode='json'),
        'schedule_preview': [dt.isoformat().replace('+00:00', 'Z') for dt in next_runs(now, STATE.schedule.interval_hours, 5)],
        'hours_remaining': hours_remaining,
        'should_alert_low_balance': should_low_balance_alert(
            STATE.usdc_balance,
            STATE.schedule.amount_per_run,
            STATE.schedule.interval_hours,
            STATE.notifications.low_balance_threshold_hours,
        ),
        'recent_orders': MOCK_ORDERS,
    }
