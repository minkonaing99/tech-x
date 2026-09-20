import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sendTelegram } from './telegram'

const fetchMock = vi.fn<(url: string, init: { body: string }) => Promise<Response>>(
  async () => new Response('{}'),
)

function sentBody(): Record<string, unknown> {
  return JSON.parse(fetchMock.mock.calls[0]?.[1].body ?? '{}')
}

beforeEach(() => {
  vi.stubEnv('TELEGRAM_BOT_TOKEN', 'test-token')
  vi.stubEnv('TELEGRAM_OWNER_CHAT_ID', '12345')
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
})

describe('sendTelegram', () => {
  it('sends as plain text, so an awkward character cannot make Telegram reject the alert', async () => {
    await sendTelegram('New order <KBZPay & Co>')
    const body = sentBody()
    expect(body.parse_mode).toBeUndefined()
    expect(body.text).toBe('New order <KBZPay & Co>')
  })

  it('marks up only when the caller asks', async () => {
    await sendTelegram('<b>Site error</b>', { html: true })
    expect(sentBody().parse_mode).toBe('HTML')
  })

  it('stays silent when no bot is configured', async () => {
    vi.stubEnv('TELEGRAM_BOT_TOKEN', '')
    await sendTelegram('nobody is listening')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('swallows an outage rather than failing the order it was reporting on', async () => {
    fetchMock.mockRejectedValueOnce(new Error('telegram down'))
    await expect(sendTelegram('still fine')).resolves.toBeUndefined()
  })
})
