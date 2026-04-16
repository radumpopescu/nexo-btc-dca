export type Order = {
  scheduled_for: string
  executed_at: string
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
    updated_at?: string
    schedule: { amount_per_run: number; interval_hours: number; pair: string }
    notifications: { notify_on_buy: boolean; daily_summary: boolean; low_balance_threshold_hours: number }
  }
  schedule_preview: string[]
  hours_remaining: number
  should_alert_low_balance: boolean
  should_buy_now: boolean
  database_path: string
  recent_orders: Order[]
}

export type FormState = {
  usdc_balance: number
  pair: string
  amount_per_run: number
  interval_hours: number
  notify_on_buy: boolean
  daily_summary: boolean
  low_balance_threshold_hours: number
}
