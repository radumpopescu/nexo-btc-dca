import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import { AppView } from '../src/AppView'
import { MOCK_STATE } from '../src/mock'

const baseFormState = {
  usdc_balance: MOCK_STATE.state.usdc_balance,
  btc_balance: MOCK_STATE.state.btc_balance,
  btc_price: MOCK_STATE.state.btc_price,
  pair: MOCK_STATE.state.schedule.pair,
  amount_per_run: MOCK_STATE.state.schedule.amount_per_run,
  interval_hours: MOCK_STATE.state.schedule.interval_hours,
  notify_on_buy: MOCK_STATE.state.notifications.notify_on_buy,
  daily_summary: MOCK_STATE.state.notifications.daily_summary,
  low_balance_threshold_hours: MOCK_STATE.state.notifications.low_balance_threshold_hours,
}

describe('AppView', () => {
  it('renders an activity page with menu navigation, account values, and date filters', () => {
    const html = renderToStaticMarkup(
      <AppView
        data={MOCK_STATE}
        formState={baseFormState}
        currentPage="activity"
        filteredOrders={MOCK_STATE.recent_orders.slice(0, 1)}
        filters={{ startDate: '2026-04-15', endDate: '2026-04-16' }}
        onFieldChange={() => {}}
        onSave={() => {}}
        onRunNow={() => {}}
        onPageChange={() => {}}
        onFilterChange={() => {}}
        busy={false}
        statusMessage="Saved"
      />,
    )

    expect(html).toContain('Dashboard')
    expect(html).toContain('Activity')
    expect(html).toContain('Settings')
    expect(html).toContain('Current account value')
    expect(html).toContain('BTC bought')
    expect(html).toContain('Date from')
    expect(html).toContain('Date to')
  })

  it('renders a dedicated settings page instead of showing buy history inline', () => {
    const html = renderToStaticMarkup(
      <AppView
        data={MOCK_STATE}
        formState={baseFormState}
        currentPage="settings"
        filteredOrders={MOCK_STATE.recent_orders}
        filters={{ startDate: '', endDate: '' }}
        onFieldChange={() => {}}
        onSave={() => {}}
        onRunNow={() => {}}
        onPageChange={() => {}}
        onFilterChange={() => {}}
        busy={false}
        statusMessage="Saved"
      />,
    )

    expect(html).toContain('Bot settings')
    expect(html).toContain('Save settings')
    expect(html).not.toContain('Buy history')
  })
})
