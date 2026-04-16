import { MOCK_STATE } from './mock'

function card(label: string, value: string, hint?: string) {
  return (
    <div className="card stat" key={label}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  )
}

export default function App() {
  const data = MOCK_STATE
  const amount = data.state.schedule.amount_per_run
  const interval = data.state.schedule.interval_hours

  return (
    <div className="shell">
      <header className="topbar card">
        <div>
          <div className="eyebrow">Nexo BTC DCA</div>
          <h1>Mock mode</h1>
          <p className="hint">UI + scheduling logic ready. Real Nexo buying adapter still needs verified private API request details.</p>
        </div>
        <div className="pill">No auth • VPN only</div>
      </header>

      <section className="grid two">
        <div className="card">
          <div className="section-title">Schedule</div>
          <div className="row between"><span>{data.state.schedule.pair}</span><strong>${amount.toFixed(2)}</strong></div>
          <div className="row between"><span>Cadence</span><strong>Every {interval}h</strong></div>
          <div className="row between"><span>Should buy now</span><strong>Yes</strong></div>
          <div className="row between"><span>Next runs</span><strong>{data.schedule_preview.length}</strong></div>
          <ul className="list">
            {data.schedule_preview.map((item) => (
              <li key={item}>{item.replace('T', ' ').replace('Z', ' UTC')}</li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="section-title">Notifications</div>
          <div className="row between"><span>Buy notifications</span><strong>{data.state.notifications.notify_on_buy ? 'On every buy' : 'Off'}</strong></div>
          <div className="row between"><span>Daily summary</span><strong>{data.state.notifications.daily_summary ? 'Enabled' : 'Disabled'}</strong></div>
          <div className="row between"><span>Alert if USDC cover &lt; {data.state.notifications.low_balance_threshold_hours}h</span><strong>{data.should_alert_low_balance ? 'Now' : 'OK'}</strong></div>
          <div className="row between"><span>Projected cover</span><strong>{data.hours_remaining}h</strong></div>
        </div>
      </section>

      <section className="grid four">
        {card('USDC balance', `$${data.state.usdc_balance.toFixed(2)}`)}
        {card('Amount per run', `$${amount.toFixed(2)}`)}
        {card('Interval', `Every ${interval}h`)}
        {card('Mode', 'Mocked live-buy flow')}
      </section>

      <section className="card">
        <div className="section-title">Recent mock orders</div>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Pair</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {data.recent_orders.map((order) => (
              <tr key={`${order.time}-${order.status}`}>
                <td>{order.time.replace('T', ' ').replace('Z', ' UTC')}</td>
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
