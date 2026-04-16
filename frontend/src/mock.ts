import type { ApiState } from './types'

export const MOCK_STATE: ApiState = {
  state: {
    mode: 'mock',
    usdc_balance: 138,
    updated_at: '2026-04-16T08:00:00Z',
    schedule: { amount_per_run: 6.9, interval_hours: 4, pair: 'BTC/USDC' },
    notifications: { notify_on_buy: true, daily_summary: true, low_balance_threshold_hours: 24 },
  },
  schedule_preview: [
    '2026-04-16T08:00:00Z',
    '2026-04-16T12:00:00Z',
    '2026-04-16T16:00:00Z',
  ],
  hours_remaining: 80,
  should_alert_low_balance: false,
  should_buy_now: true,
  database_path: '/app/data/nexo-dca.sqlite3',
  recent_orders: [
    {
      scheduled_for: '2026-04-16T04:00:00Z',
      executed_at: '2026-04-16T04:00:00Z',
      pair: 'BTC/USDC',
      side: 'buy',
      quote_amount: 6.9,
      status: 'mocked',
      message: 'Should buy now',
    },
  ],
}
