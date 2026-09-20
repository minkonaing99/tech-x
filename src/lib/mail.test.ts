import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('nodemailer', () => ({
  default: { createTransport: () => ({ sendMail: vi.fn() }) },
}))

const VERIFY_LINK = 'https://merxylab.com/verify?token=deadbeefcafe&email=buyer%40example.com'

/** Re-import per test so the module re-reads NODE_ENV at load. */
async function loadMail() {
  vi.resetModules()
  return import('./mail')
}

let warn: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  // No SMTP configured: this is the branch that logs.
  for (const key of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS']) {
    vi.stubEnv(key, '')
  }
})

afterEach(() => {
  warn.mockRestore()
  vi.unstubAllEnvs()
})

function logged(): string {
  return warn.mock.calls
    .map((call: unknown[]) => call.map((arg) => JSON.stringify(arg)).join(' '))
    .join('\n')
}

describe('sendMail with SMTP unconfigured', () => {
  it('never writes the message body to a production log', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { sendMail } = await loadMail()

    const res = await sendMail({
      to: 'buyer@example.com',
      subject: 'Verify your merxylab account',
      text: `Click here: ${VERIFY_LINK}`,
    })

    expect(res.delivered).toBe(false)
    expect(logged()).not.toContain('deadbeefcafe')
    expect(logged()).not.toContain(VERIFY_LINK)
  })

  it('masks the recipient in a production log', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { sendMail } = await loadMail()

    await sendMail({ to: 'buyer@example.com', subject: 'Hello', text: 'body' })

    expect(logged()).not.toContain('buyer@example.com')
    expect(logged()).toContain('buye***@example.com')
  })

  it('still records enough to diagnose the outage', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { sendMail } = await loadMail()

    await sendMail({ to: 'buyer@example.com', subject: 'Verify your account', text: 'body' })

    expect(logged()).toContain('SMTP not configured')
    expect(logged()).toContain('Verify your account')
  })

  it('prints the body in development, where that is the point', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const { sendMail } = await loadMail()

    await sendMail({
      to: 'buyer@example.com',
      subject: 'Verify',
      text: `Click here: ${VERIFY_LINK}`,
    })

    expect(logged()).toContain(VERIFY_LINK)
    expect(logged()).toContain('buyer@example.com')
  })
})
