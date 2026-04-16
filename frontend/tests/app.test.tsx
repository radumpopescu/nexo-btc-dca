import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

import App from '../src/App'

describe('App', () => {
  it('renders schedule, mock exchange status, and notification controls', () => {
    const html = renderToStaticMarkup(<App />)

    expect(html).toContain('Mock mode')
    expect(html).toContain('$6.90')
    expect(html).toContain('Every 4h')
    expect(html).toContain('Alert if USDC cover &lt; 24h')
    expect(html).toContain('Buy notifications')
    expect(html).toContain('Daily summary')
    expect(html).toContain('Should buy now')
    expect(html).toContain('Recent mock orders')
  })
})
