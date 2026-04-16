import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import { AppView } from '../src/AppView'
import { MOCK_STATE } from '../src/mock'

describe('AppView', () => {
  it('renders editable persisted settings and storage location', () => {
    const html = renderToStaticMarkup(
      <AppView
        data={MOCK_STATE}
        formState={{
          usdc_balance: MOCK_STATE.state.usdc_balance,
          pair: MOCK_STATE.state.schedule.pair,
          amount_per_run: MOCK_STATE.state.schedule.amount_per_run,
          interval_hours: MOCK_STATE.state.schedule.interval_hours,
          notify_on_buy: MOCK_STATE.state.notifications.notify_on_buy,
          daily_summary: MOCK_STATE.state.notifications.daily_summary,
          low_balance_threshold_hours: MOCK_STATE.state.notifications.low_balance_threshold_hours,
        }}
        onFieldChange={() => {}}
        onSave={() => {}}
        onRunNow={() => {}}
        busy={false}
        statusMessage="Saved"
      />,
    )

    expect(html).toContain('Persisted settings')
    expect(html).toContain('Save settings')
    expect(html).toContain('Run due mock buy now')
    expect(html).toContain('Storage')
    expect(html).toContain('data/nexo-dca.sqlite3')
  })
})
