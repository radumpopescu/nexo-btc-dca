import type { ApiState, FormState, Order, PageId } from './types'

type DashboardFilters = {
  startDate: string
  endDate: string
}

type AppViewProps = {
  data: ApiState
  formState: FormState
  currentPage: PageId
  filteredOrders: Order[]
  filters: DashboardFilters
  onFieldChange: (field: keyof FormState, value: string | number | boolean) => void
  onSave: () => void
  onRunNow: () => void
  onPageChange: (page: PageId) => void
  onFilterChange: (field: keyof DashboardFilters, value: string) => void
  busy: boolean
  statusMessage: string
}

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
}

function number(value: number, digits = 6) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits })
}

function formatUtc(value: string) {
  return value.replace('T', ' ').replace('Z', ' UTC')
}

function statCard(label: string, value: string, hint?: string, accent = false) {
  return (
    <div className={`stat-card${accent ? ' accent' : ''}`} key={label}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {hint ? <div className="stat-hint">{hint}</div> : null}
    </div>
  )
}

function renderDashboard(data: ApiState, filteredOrders: Order[], onRunNow: () => void, busy: boolean) {
  return (
    <>
      <section className="hero card">
        <div>
          <div className="eyebrow">Nexo BTC DCA</div>
          <h1>Dashboard</h1>
          <p className="subtle">A cleaner view of your mock DCA activity, schedule, and tracked account value.</p>
        </div>
        <div className="hero-actions">
          <div className={`badge ${data.should_buy_now ? 'live' : ''}`}>{data.should_buy_now ? 'Buy due now' : 'Waiting for next slot'}</div>
          <button type="button" onClick={onRunNow} disabled={busy}>{busy ? 'Working…' : 'Run mock buy'}</button>
        </div>
      </section>

      <section className="stats-grid account-grid">
        {statCard('Tracked account value', money(data.account_value.total_usdc), `BTC mark: ${money(data.account_value.btc_price)}`, true)}
        {statCard('USDC available', money(data.account_value.usdc_balance), `${data.hours_remaining}h runway`)}
        {statCard('BTC holdings', `${number(data.account_value.btc_balance, 8)} BTC`, `${money(data.account_value.btc_position_value)} position value`)}
        {statCard('Next buy size', money(data.state.schedule.amount_per_run), `Every ${data.state.schedule.interval_hours}h on ${data.state.schedule.pair}`)}
      </section>

      <section className="grid two-columns">
        <div className="card panel">
          <div className="panel-header">
            <div>
              <div className="section-title">Schedule</div>
              <div className="section-subtitle">Current cadence and upcoming mock runs.</div>
            </div>
          </div>
          <div className="key-value-list">
            <div><span>Pair</span><strong>{data.state.schedule.pair}</strong></div>
            <div><span>Cadence</span><strong>Every {data.state.schedule.interval_hours} hours</strong></div>
            <div><span>Buy amount</span><strong>{money(data.state.schedule.amount_per_run)}</strong></div>
            <div><span>Low balance alert</span><strong>{data.should_alert_low_balance ? 'Attention now' : 'Healthy'}</strong></div>
          </div>
          <div className="mini-list">
            {data.schedule_preview.map((item) => (
              <div key={item} className="mini-list-row">
                <span>{formatUtc(item)}</span>
                <strong>Scheduled</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="card panel">
          <div className="panel-header">
            <div>
              <div className="section-title">Recent buys</div>
              <div className="section-subtitle">Last recorded execution and current filtered summary.</div>
            </div>
          </div>
          <div className="key-value-list">
            <div><span>Filtered buys</span><strong>{data.activity_summary.order_count}</strong></div>
            <div><span>Quote deployed</span><strong>{money(data.activity_summary.quote_spent)}</strong></div>
            <div><span>BTC bought</span><strong>{number(data.activity_summary.btc_bought, 8)} BTC</strong></div>
            <div><span>Latest execution</span><strong>{filteredOrders[0] ? formatUtc(filteredOrders[0].executed_at) : 'No buys yet'}</strong></div>
          </div>
        </div>
      </section>
    </>
  )
}

function renderActivity(data: ApiState, filteredOrders: Order[], filters: DashboardFilters, onFilterChange: (field: keyof DashboardFilters, value: string) => void) {
  return (
    <section className="card panel">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Activity</div>
          <h1>Buy history</h1>
          <div className="section-subtitle">Filter recent buys by date and inspect the recorded fills.</div>
        </div>
      </div>

      <div className="filters-row">
        <label>
          <span>Date from</span>
          <input type="date" value={filters.startDate} onChange={(event) => onFilterChange('startDate', event.target.value)} />
        </label>
        <label>
          <span>Date to</span>
          <input type="date" value={filters.endDate} onChange={(event) => onFilterChange('endDate', event.target.value)} />
        </label>
      </div>

      <div className="stats-grid compact-stats">
        {statCard('Current account value', money(data.account_value.total_usdc), 'Tracked account value')}
        {statCard('Filtered buys', String(data.activity_summary.order_count), 'Date range')}
        {statCard('Spent', money(data.activity_summary.quote_spent))}
        {statCard('BTC bought', `${number(data.activity_summary.btc_bought, 8)} BTC`)}
      </div>

      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Scheduled</th>
              <th>Executed</th>
              <th>Quote</th>
              <th>BTC</th>
              <th>Price</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length > 0 ? filteredOrders.map((order) => (
              <tr key={`${order.scheduled_for}-${order.executed_at}`}>
                <td>{formatUtc(order.scheduled_for)}</td>
                <td>{formatUtc(order.executed_at)}</td>
                <td>{money(order.quote_amount)}</td>
                <td>{number(order.base_amount, 8)} BTC</td>
                <td>{money(order.price_usdc)}</td>
                <td>{order.status}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="empty-state">No buys in this date range yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function renderSettings(formState: FormState, onFieldChange: (field: keyof FormState, value: string | number | boolean) => void, onSave: () => void, busy: boolean, statusMessage: string) {
  return (
    <section className="card panel settings-panel">
      <div className="panel-header">
        <div>
          <div className="eyebrow">Configuration</div>
          <h1>Bot settings</h1>
          <div className="section-subtitle">Edit the tracked schedule, balance, and notification preferences.</div>
        </div>
      </div>
      <div className="settings-grid">
        <label>
          <span>Pair</span>
          <input value={formState.pair} onChange={(event) => onFieldChange('pair', event.target.value)} />
        </label>
        <label>
          <span>Tracked USDC balance</span>
          <input type="number" step="0.01" value={formState.usdc_balance} onChange={(event) => onFieldChange('usdc_balance', Number(event.target.value))} />
        </label>
        <label>
          <span>Tracked BTC balance</span>
          <input type="number" step="0.00000001" value={formState.btc_balance} onChange={(event) => onFieldChange('btc_balance', Number(event.target.value))} />
        </label>
        <label>
          <span>BTC price</span>
          <input type="number" step="0.01" value={formState.btc_price} onChange={(event) => onFieldChange('btc_price', Number(event.target.value))} />
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
        <label className="toggle-card">
          <input type="checkbox" checked={formState.notify_on_buy} onChange={(event) => onFieldChange('notify_on_buy', event.target.checked)} />
          <div>
            <strong>Notify on every buy</strong>
            <span>Keep buy pings enabled.</span>
          </div>
        </label>
        <label className="toggle-card">
          <input type="checkbox" checked={formState.daily_summary} onChange={(event) => onFieldChange('daily_summary', event.target.checked)} />
          <div>
            <strong>Daily summary</strong>
            <span>Send one recap per day.</span>
          </div>
        </label>
      </div>
      <div className="settings-actions">
        <button type="button" onClick={onSave} disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button>
        <span className="subtle">{statusMessage}</span>
      </div>
    </section>
  )
}

export function AppView({ data, formState, currentPage, filteredOrders, filters, onFieldChange, onSave, onRunNow, onPageChange, onFilterChange, busy, statusMessage }: AppViewProps) {
  return (
    <div className="shell">
      <nav className="menu-bar card">
        <div className="menu-brand">
          <div className="brand-mark">₿</div>
          <div>
            <div className="menu-title">Nexo BTC DCA</div>
            <div className="menu-subtitle">Mock-first control panel</div>
          </div>
        </div>
        <div className="menu-links">
          <button type="button" className={currentPage === 'dashboard' ? 'active' : ''} onClick={() => onPageChange('dashboard')}>Dashboard</button>
          <button type="button" className={currentPage === 'activity' ? 'active' : ''} onClick={() => onPageChange('activity')}>Activity</button>
          <button type="button" className={currentPage === 'settings' ? 'active' : ''} onClick={() => onPageChange('settings')}>Settings</button>
        </div>
      </nav>

      {currentPage === 'dashboard' ? renderDashboard(data, filteredOrders, onRunNow, busy) : null}
      {currentPage === 'activity' ? renderActivity(data, filteredOrders, filters, onFilterChange) : null}
      {currentPage === 'settings' ? renderSettings(formState, onFieldChange, onSave, busy, statusMessage) : null}
    </div>
  )
}
