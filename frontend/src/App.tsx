import { useEffect, useMemo, useState } from 'react'

import { AppView } from './AppView'
import { MOCK_STATE } from './mock'
import type { ApiState, FormState } from './types'

function toFormState(data: ApiState): FormState {
  return {
    usdc_balance: data.state.usdc_balance,
    pair: data.state.schedule.pair,
    amount_per_run: data.state.schedule.amount_per_run,
    interval_hours: data.state.schedule.interval_hours,
    notify_on_buy: data.state.notifications.notify_on_buy,
    daily_summary: data.state.notifications.daily_summary,
    low_balance_threshold_hours: data.state.notifications.low_balance_threshold_hours,
  }
}

export default function App() {
  const [data, setData] = useState<ApiState>(MOCK_STATE)
  const [formState, setFormState] = useState<FormState>(() => toFormState(MOCK_STATE))
  const [busy, setBusy] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  async function refreshState() {
    const response = await fetch('/api/state')
    const payload: ApiState = await response.json()
    setData(payload)
    setFormState(toFormState(payload))
  }

  useEffect(() => {
    refreshState().catch(() => setStatusMessage('Using fallback mock state because the API is unavailable.'))
  }, [])

  const viewData = useMemo(() => data, [data])

  function onFieldChange(field: keyof FormState, value: string | number | boolean) {
    setFormState((current) => ({ ...current, [field]: value }))
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
      setStatusMessage('Saved to SQLite.')
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
      setData(payload.state)
      setFormState(toFormState(payload.state))
      setStatusMessage(payload.message)
    } catch {
      setStatusMessage('Mock run failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppView
      data={viewData}
      formState={formState}
      onFieldChange={onFieldChange}
      onSave={onSave}
      onRunNow={onRunNow}
      busy={busy}
      statusMessage={statusMessage}
    />
  )
}
