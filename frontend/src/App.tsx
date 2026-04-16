import { useEffect, useMemo, useState } from 'react'

import { AppView } from './AppView'
import { MOCK_STATE } from './mock'
import type { ApiState, Filters, FormState, PageId } from './types'

function toFormState(data: ApiState): FormState {
  return {
    usdc_balance: data.state.usdc_balance,
    btc_balance: data.state.btc_balance,
    btc_price: data.state.btc_price,
    pair: data.state.schedule.pair,
    amount_per_run: data.state.schedule.amount_per_run,
    interval_hours: data.state.schedule.interval_hours,
    notify_on_buy: data.state.notifications.notify_on_buy,
    daily_summary: data.state.notifications.daily_summary,
    low_balance_threshold_hours: data.state.notifications.low_balance_threshold_hours,
  }
}

function buildStateUrl(filters: Filters) {
  const params = new URLSearchParams()
  if (filters.date_from) {
    params.set('date_from', filters.date_from)
  }
  if (filters.date_to) {
    params.set('date_to', filters.date_to)
  }
  const query = params.toString()
  return query ? `/api/state?${query}` : '/api/state'
}

export default function App() {
  const [data, setData] = useState<ApiState>(MOCK_STATE)
  const [formState, setFormState] = useState<FormState>(() => toFormState(MOCK_STATE))
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard')
  const [filters, setFilters] = useState<Filters>(() => ({ ...MOCK_STATE.filters }))
  const [busy, setBusy] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  async function refreshState(nextFilters = filters) {
    const response = await fetch(buildStateUrl(nextFilters))
    const payload: ApiState = await response.json()
    setData(payload)
    setFormState(toFormState(payload))
  }

  useEffect(() => {
    refreshState(filters).catch(() => setStatusMessage('Using fallback mock state because the API is unavailable.'))
  }, [filters.date_from, filters.date_to])

  const filteredOrders = useMemo(() => data.recent_orders, [data.recent_orders])

  function onFieldChange(field: keyof FormState, value: string | number | boolean) {
    setFormState((current) => ({ ...current, [field]: value }))
  }

  function onFilterChange(field: keyof Filters, value: string) {
    setFilters((current) => ({ ...current, [field]: value }))
  }

  async function onSave() {
    setBusy(true)
    setStatusMessage('Saving settings…')
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usdc_balance: formState.usdc_balance,
          btc_balance: formState.btc_balance,
          btc_price: formState.btc_price,
          schedule: {
            pair: formState.pair,
            amount_per_run: formState.amount_per_run,
            interval_hours: formState.interval_hours,
          },
          notifications: {
            notify_on_buy: formState.notify_on_buy,
            daily_summary: formState.daily_summary,
            low_balance_threshold_hours: formState.low_balance_threshold_hours,
          },
        }),
      })
      const payload: ApiState = await response.json()
      setData(payload)
      setFormState(toFormState(payload))
      setStatusMessage('Saved settings.')
    } catch {
      setStatusMessage('Save failed.')
    } finally {
      setBusy(false)
    }
  }

  async function onRunNow() {
    setBusy(true)
    setStatusMessage('Recording mock buy…')
    try {
      const response = await fetch('/api/mock/run', { method: 'POST' })
      const payload = await response.json()
      setStatusMessage(payload.message)
      await refreshState(filters)
    } catch {
      setStatusMessage('Mock run failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppView
      data={data}
      formState={formState}
      currentPage={currentPage}
      filteredOrders={filteredOrders}
      filters={{ startDate: filters.date_from, endDate: filters.date_to }}
      onFieldChange={onFieldChange}
      onFilterChange={(field, value) => onFilterChange(field === 'startDate' ? 'date_from' : 'date_to', value)}
      onPageChange={setCurrentPage}
      onSave={onSave}
      onRunNow={onRunNow}
      busy={busy}
      statusMessage={statusMessage}
    />
  )
}
