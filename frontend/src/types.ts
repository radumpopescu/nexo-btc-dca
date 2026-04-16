export type Order = {
  scheduled_for: string
  executed_at: string
  pair: string
  side: string
  quote_amount: number
  base_amount: number
  price_usdc: number
  status: string
  message: string
}

export type Filters = {
  date_from: string
  date_to: string
}

export type DashboardFilters = {
  startDate: string
  endDate: string
}

export type PageId = 'dashboard' | 'activity' | 'settings'
export type Page = PageId

export type FormState = {
  usdc_balance: number
  btc_balance: number
  btc_price: number
  pair: string
  amount_per_run: number
  interval_hours: number
  notify_on_buy: boolean
  daily_summary: boolean
  low_balance_threshold_hours: number
}

export type ApiState = {
  state: {
    mode: string
    usdc_balance: number
    btc_balance: number
    btc_price: number
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
  filters: Filters
  activity_summary: {
    order_count: number
    quote_spent: number
    btc_bought: number
  }
  account_value: {
    usdc_balance: number
    btc_balance: number
    btc_price: number
    btc_position_value: number
    total_usdc: number
  }
}
