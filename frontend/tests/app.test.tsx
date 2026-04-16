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

describe('App shell', () => {
  it('renders the dashboard hero and account cards', () => {
    const html = renderToStaticMarkup(
      <AppView
        data={MOCK_STATE}
        formState={baseFormState}
        currentPage="dashboard"
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

    expect(html).toContain('Dashboard')
    expect(html).toContain('Tracked account value')
    expect(html).toContain('Recent buys')
    expect(html).toContain('Run mock buy')
  })
})
