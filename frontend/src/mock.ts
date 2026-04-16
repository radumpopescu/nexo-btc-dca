export type Order = {
  time: string
  pair: string
  side: string
  quote_amount: number
  status: string
  message: string
}

export type ApiState = {
  state: {
    mode: string
    usdc_balance: number
    schedule: { amount_per_run: number; interval_hours: number; pair: string }
    notifications: { notify_on_buy: boolean; daily_summary: boolean; low_balance_threshold_hours: number }
  }
  schedule_preview: string[]
  hours_remaining: number
  should_alert_low_balance: boolean
  recent_orders: Order[]
}

export const MOCK_STATE: ApiState = {
  state: {
    mode: 'mock',
    usdc_balance: 138,
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
  recent_orders: [
    { time: '2026-04-16T08:00:00Z', pair: 'BTC/USDC', side: 'buy', quote_amount: 6.9, status: 'mocked', message: 'Should buy now' },
    { time: '2026-04-16T12:00:00Z', pair: 'BTC/USDC', side: 'buy', quote_amount: 6.9, status: 'scheduled', message: 'Next scheduled mock buy' },
  ],
}
