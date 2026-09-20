import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendTelegram = vi.fn<(text: string) => Promise<void>>(async () => {})
vi.mock('@/lib/telegram', () => ({ sendTelegram: (t: string) => sendTelegram(t) }))

const { reportError, resetErrorThrottle } = await import('./report-error')

describe('reportError', () => {
  beforeEach(() => {
    sendTelegram.mockClear()
    resetErrorThrottle()
  })

  it('sends the route, error and digest', async () => {
    await reportError(new Error('DB unreachable'), {
      path: '/admin/orders',
      method: 'GET',
      digest: 'abc123',
    })
    const text = sendTelegram.mock.calls[0]?.[0] ?? ''
    expect(text).toContain('GET /admin/orders')
    expect(text).toContain('DB unreachable')
    expect(text).toContain('abc123')
  })

  it('throttles a repeating fault to one alert', async () => {
    for (let i = 0; i < 5; i += 1) {
      await reportError(new Error('same fault'), { path: '/shop' })
    }
    expect(sendTelegram).toHaveBeenCalledOnce()
  })

  it('still reports a different fault during the throttle window', async () => {
    await reportError(new Error('first'), { path: '/shop' })
    await reportError(new Error('second'), { path: '/shop' })
    expect(sendTelegram).toHaveBeenCalledTimes(2)
  })

  it('escapes HTML so a crafted message cannot break the Telegram markup', async () => {
    await reportError(new Error('<b>bold</b> & <script>'), { path: '/shop' })
    const text = sendTelegram.mock.calls[0]?.[0] ?? ''
    expect(text).toContain('&lt;b&gt;bold&lt;/b&gt; &amp; &lt;script&gt;')
    expect(text).not.toContain('<script>')
  })

  it('accepts a non-Error throw', async () => {
    await reportError('just a string', { path: '/shop' })
    expect(sendTelegram).toHaveBeenCalledOnce()
    expect(sendTelegram.mock.calls[0]?.[0]).toContain('just a string')
  })

  it('never throws, even when the transport fails', async () => {
    sendTelegram.mockRejectedValueOnce(new Error('telegram down'))
    await expect(reportError(new Error('boom'), { path: '/shop' })).resolves.toBeUndefined()
  })
})
