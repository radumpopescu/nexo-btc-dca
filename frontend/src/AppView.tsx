import type { ApiState, FormState } from './types'

function card(label: string, value: string, hint?: string) {
  return (
    <div className="card stat" key={label}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  )
}

function formatUtc(value: string) {
  return value.replace('T', ' ').replace('Z', ' UTC')
}

type AppViewProps = {
  data: ApiState
  formState: FormState
  onFieldChange: (field: keyof FormState, value: string | number | boolean) => void
  onSave: () => void
  onRunNow: () => void
  busy: boolean
  statusMessage: string
}

export function AppView({ data, formState, onFieldChange, onSave, onRunNow, busy, statusMessage }: AppViewProps) {
  const amount = data.state.schedule.amount_per_run
  const interval = data.state.schedule.interval_hours

  return (
    <div className="shell">
      <header className="topbar card">
        <div>
          <div className="eyebrow">Nexo BTC DCA</div>
          <h1>Persisted mock mode</h1>
          <p className="hint">Settings and run history are stored in SQLite under the data folder next to compose.yml.</p>
        </div>
        <div className="pill">One port • No auth • VPN only</div>
      </header>

      <section className="grid two">
        <div className="card">
          <div className="section-title">Schedule</div>
          <div className="row between"><span>{data.state.schedule.pair}</span><strong>${amount.toFixed(2)}</strong></div>
          <div className="row between"><span>Cadence</span><strong>Every {interval}h</strong></div>
          <div className="row between"><span>Should buy now</span><strong>{data.should_buy_now ? 'Yes' : 'No'}</strong></div>
          <div className="row between"><span>Next runs</span><strong>{data.schedule_preview.length}</strong></div>
          <ul className="list">
            {data.schedule_preview.map((item) => (
              <li key={item}>{formatUtc(item)}</li>
            ))}
          </ul>
          <div className="button-row compact-top">
            <button type="button" onClick={onRunNow} disabled={busy}>{busy ? 'Working…' : 'Run due mock buy now'}</button>
          </div>
        </div>

        <div className="card">
          <div className="section-title">Notifications</div>
          <div className="row between"><span>Buy notifications</span><strong>{data.state.notifications.notify_on_buy ? 'On every buy' : 'Off'}</strong></div>
          <div className="row between"><span>Daily summary</span><strong>{data.state.notifications.daily_summary ? 'Enabled' : 'Disabled'}</strong></div>
          <div className="row between"><span>Alert if USDC cover &lt; {data.state.notifications.low_balance_threshold_hours}h</span><strong>{data.should_alert_low_balance ? 'Now' : 'OK'}</strong></div>
          <div className="row between"><span>Projected cover</span><strong>{data.hours_remaining}h</strong></div>
          <div className="row between"><span>Storage</span><strong>{data.database_path}</strong></div>
        </div>
      </section>

      <section className="grid four">
        {card('USDC balance', `$${data.state.usdc_balance.toFixed(2)}`)}
        {card('Amount per run', `$${amount.toFixed(2)}`)}
        {card('Interval', `Every ${interval}h`)}
        {card('Mode', 'Mocked live-buy flow')}
      </section>

      <section className="card">
        <div className="section-title">Persisted settings</div>
        <div className="form-grid">
          <label>
            <span>Pair</span>
            <input value={formState.pair} onChange={(event) => onFieldChange('pair', event.target.value)} />
          </label>
          <label>
            <span>USDC balance</span>
            <input type="number" step="0.01" value={formState.usdc_balance} onChange={(event) => onFieldChange('usdc_balance', Number(event.target.value))} />
          </label>
          <label>
            <span>Amount per run</span>
            <input type="number" step="0.01" value={formState.amount_per_run} onChange={(event) => onFieldChange('amount_per_run', Number(event.target.value))} />
          </label>
          <label>
            <span>Interval hours</span>
            <input type="number" step="1" min="1" value={formState.interval_hours} onChange={(event) => onFieldChange('interval_hours', Number(event.target.value))} />
          </label>
          <label>
            <span>Low-balance alert hours</span>
            <input type="number" step="1" min="1" value={formState.low_balance_threshold_hours} onChange={(event) => onFieldChange('low_balance_threshold_hours', Number(event.target.value))} />
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={formState.notify_on_buy} onChange={(event) => onFieldChange('notify_on_buy', event.target.checked)} />
            <span>Notify on every buy</span>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={formState.daily_summary} onChange={(event) => onFieldChange('daily_summary', event.target.checked)} />
            <span>Daily summary</span>
          </label>
        </div>
        <div className="button-row">
          <button type="button" onClick={onSave} disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
          <span className="hint">{statusMessage}</span>
        </div>
      </section>

      <section className="card">
        <div className="section-title">Recent mock orders</div>
        <table>
          <thead>
            <tr>
              <th>Scheduled</th>
              <th>Executed</th>
              <th>Pair</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {data.recent_orders.map((order) => (
              <tr key={`${order.scheduled_for}-${order.executed_at}`}>
                <td>{formatUtc(order.scheduled_for)}</td>
                <td>{formatUtc(order.executed_at)}</td>
                <td>{order.pair}</td>
                <td>${order.quote_amount.toFixed(2)}</td>
                <td>{order.status}</td>
                <td>{order.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
