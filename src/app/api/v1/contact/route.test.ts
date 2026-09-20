import { beforeEach, describe, expect, it, vi } from 'vitest'

interface MailArgs {
  to: string
  subject: string
  text: string
}

const sendMail = vi.fn<(params: MailArgs) => Promise<{ delivered: boolean }>>(async () => ({
  delivered: true,
}))
vi.mock('@/lib/mail', () => ({ sendMail: (p: MailArgs) => sendMail(p) }))
vi.mock('@/lib/site-info', () => ({ contactInbox: () => 'owner@example.com' }))

const { POST } = await import('./route')

/** Each test gets its own IP so the 5/hour limiter does not leak between them. */
let ip = 0
function request(body: unknown): Request {
  ip += 1
  return new Request('http://localhost/api/v1/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.0.0.${ip}` },
    body: JSON.stringify(body),
  })
}

const valid = {
  name: 'Min Ko Naing',
  email: 'buyer@example.com',
  topic: 'order',
  message: 'My order has not arrived yet, can you check?',
}

describe('POST /api/v1/contact', () => {
  beforeEach(() => sendMail.mockClear())

  it('accepts a valid message and sends exactly one mail', async () => {
    const res = await POST(request(valid))
    expect(res.status).toBe(200)
    expect(sendMail).toHaveBeenCalledOnce()
  })

  it('includes the topic and order number in the subject', async () => {
    await POST(request({ ...valid, orderId: '3aa6e85b' }))
    const arg = sendMail.mock.calls[0]?.[0]
    expect(arg?.subject).toContain('order')
    expect(arg?.subject).toContain('3aa6e85b')
    expect(arg?.text).toContain('buyer@example.com')
  })

  it('refuses an order reference carrying header-control characters', async () => {
    // The value lands in the mail Subject. Nodemailer encodes headers, so this
    // is not injectable today - but the route should not be relying on a
    // library's escaping for input it can simply refuse.
    for (const orderId of ['3aa6\r\nBcc: victim@example.com', 'a\nb', 'id with spaces', 'a;b']) {
      const res = await POST(request({ ...valid, orderId }))
      expect(res.status).toBe(400)
    }
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('still accepts a real order id', async () => {
    const res = await POST(request({ ...valid, orderId: '3aa6e85b-1c2d-4e5f-8a9b-0c1d2e3f4a5b' }))
    expect(res.status).toBe(200)
  })

  it('rejects a message shorter than a sentence', async () => {
    const res = await POST(request({ ...valid, message: 'hi' }))
    expect(res.status).toBe(400)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('rejects a bad email', async () => {
    const res = await POST(request({ ...valid, email: 'not-an-email' }))
    expect(res.status).toBe(400)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('rejects an unknown topic, so the enum cannot be widened from outside', async () => {
    const res = await POST(request({ ...valid, topic: 'refund-everything' }))
    expect(res.status).toBe(400)
  })

  it('rejects a message past the length cap', async () => {
    const res = await POST(request({ ...valid, message: 'x'.repeat(4001) }))
    expect(res.status).toBe(400)
  })

  it('rejects a malformed body without throwing', async () => {
    const res = await POST(
      new Request('http://localhost/api/v1/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.9.9.9' },
        body: 'not json',
      }),
    )
    expect(res.status).toBe(400)
  })

  it('swallows honeypot hits silently - 200, but no mail sent', async () => {
    const res = await POST(request({ ...valid, website: 'http://spam.example' }))
    expect(res.status).toBe(400)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('rate limits after 5 messages from one address', async () => {
    const from = '10.5.5.5'
    const send = () =>
      POST(
        new Request('http://localhost/api/v1/contact', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-forwarded-for': from },
          body: JSON.stringify(valid),
        }),
      )

    for (let i = 0; i < 5; i += 1) {
      expect((await send()).status).toBe(200)
    }
    const blocked = await send()
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('Retry-After')).toBeTruthy()
    expect(sendMail).toHaveBeenCalledTimes(5)
  })
})
