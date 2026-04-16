from datetime import datetime, timezone
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import create_app
from app.storage import Database


DEFAULT_NOW = datetime(2026, 4, 16, 8, 0, tzinfo=timezone.utc)


def make_client(tmp_path: Path) -> TestClient:
    db = Database(tmp_path / 'data' / 'nexo-dca.sqlite3')
    app = create_app(db=db, now_provider=lambda: DEFAULT_NOW)
    return TestClient(app)


def test_state_is_persisted_in_sqlite_and_not_env(tmp_path: Path):
    client = make_client(tmp_path)

    updated = {
        'usdc_balance': 222.5,
        'btc_balance': 0.014,
        'btc_price': 65000,
        'schedule': {
            'pair': 'ETH/USDC',
            'amount_per_run': 12.25,
            'interval_hours': 6,
        },
        'notifications': {
            'notify_on_buy': False,
            'daily_summary': False,
            'low_balance_threshold_hours': 48,
        },
    }
    save_response = client.put('/api/settings', json=updated)
    assert save_response.status_code == 200

    follow_up = client.get('/api/state')
    payload = follow_up.json()

    assert payload['state']['usdc_balance'] == 222.5
    assert payload['state']['btc_balance'] == 0.014
    assert payload['state']['btc_price'] == 65000
    assert payload['state']['schedule'] == updated['schedule']
    assert payload['state']['notifications'] == updated['notifications']
    assert payload['database_path'].endswith('data/nexo-dca.sqlite3')
    assert (tmp_path / 'data' / 'nexo-dca.sqlite3').exists()


def test_running_mock_buy_records_run_time_and_reduces_balance(tmp_path: Path):
    client = make_client(tmp_path)

    run_response = client.post('/api/mock/run')
    assert run_response.status_code == 200
    run_payload = run_response.json()

    assert run_payload['executed'] is True
    assert run_payload['order']['scheduled_for'] == '2026-04-16T08:00:00Z'
    assert run_payload['order']['executed_at'] == '2026-04-16T08:00:00Z'
    assert run_payload['order']['base_amount'] > 0
    assert run_payload['order']['price_usdc'] == 100000.0

    state_payload = client.get('/api/state').json()
    assert state_payload['should_buy_now'] is False
    assert state_payload['state']['usdc_balance'] == 131.1
    assert state_payload['state']['btc_balance'] > 0
    assert state_payload['account_value']['total_usdc'] == 138.0
    assert state_payload['account_value']['btc_position_value'] == 6.9
    assert state_payload['recent_orders'][0]['scheduled_for'] == '2026-04-16T08:00:00Z'
    assert state_payload['recent_orders'][0]['executed_at'] == '2026-04-16T08:00:00Z'
    assert state_payload['recent_orders'][0]['base_amount'] > 0


def test_state_supports_dashboard_date_filters_for_orders(tmp_path: Path):
    client = make_client(tmp_path)

    client.post('/api/mock/run')

    filtered_payload = client.get('/api/state?date_from=2026-04-16&date_to=2026-04-16').json()
    empty_payload = client.get('/api/state?date_from=2026-04-17&date_to=2026-04-17').json()

    assert filtered_payload['filters'] == {
        'date_from': '2026-04-16',
        'date_to': '2026-04-16',
    }
    assert filtered_payload['activity_summary']['order_count'] == 1
    assert filtered_payload['activity_summary']['quote_spent'] == 6.9
    assert filtered_payload['recent_orders'][0]['scheduled_for'] == '2026-04-16T08:00:00Z'
    assert empty_payload['activity_summary']['order_count'] == 0
    assert empty_payload['recent_orders'] == []
