import { beforeEach, describe, expect, it, vi } from 'vitest'
import { hashToken } from '@/lib/auth-tokens'
import { resetBuckets } from '@/lib/rate-limit'
import { verificationTokens } from '@/db/schema/auth'

interface UserRow {
  id: string
  email: string
  passwordHash: string | null
  emailVerified: Date | null
}

/** The row the email lookup finds, or null for an address nobody has used. */
let existing: UserRow | null = null

const inserts: [unknown, unknown][] = []
/** Every delete, in order, so supersession can be checked against the insert. */
const calls: string[] = []
const sendMail = vi.fn(async () => ({ delivered: true }))
/** The reset URL handed to the email template. */
let resetUrl = ''

vi.mock('@/lib/mail', () => ({ sendMail: () => sendMail() }))
vi.mock('@emails/password-reset', () => ({
  PasswordReset: ({ resetUrl: url }: { resetUrl: string }) => {
    resetUrl = url
    return null
  },
}))

vi.mock('@/db', () => {
  function chain(result: unknown, onWhere?: () => void) {
    const c: Record<string, unknown> = {
      from: () => c,
      where: () => {
        onWhere?.()
        return c
      },
      limit: () => c,
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
    }
    return c
  }
  return {
    db: {
      select: () => chain(existing ? [existing] : []),
      insert: (table: unknown) => ({
        values: async (v: unknown) => {
          calls.push('insert')
          inserts.push([table, v])
        },
      }),
      delete: () => chain({ affectedRows: 1 }, () => calls.push('delete')),
    },
  }
})

const { POST } = await import('./route')

/** Each test gets its own address so the per-IP limiter does not leak. */
let ip = 0
function request(body: unknown, from?: string): Request {
  ip += 1
  return new Request('http://localhost/api/v1/auth/forgot-password', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': from ?? `10.9.0.${ip}`,
    },
    body: JSON.stringify(body),
  })
}

const KNOWN: UserRow = {
  id: 'user-1',
  email: 'buyer@example.com',
  passwordHash: '$2b$12$hash',
  emailVerified: new Date('2026-01-01'),
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://shop.example'
  existing = KNOWN
  inserts.length = 0
  calls.length = 0
  resetUrl = ''
  sendMail.mockClear()
  resetBuckets()
})

describe('POST /api/v1/auth/forgot-password', () => {
  it('answers the same for a known and an unknown address', async () => {
    existing = KNOWN
    const known = await POST(request({ email: KNOWN.email }))
    const knownBody = await known.json()

    existing = null
    const unknown = await POST(request({ email: 'nobody@example.com' }))
    const unknownBody = await unknown.json()

    // Signup and sign-in are both deliberately mute about whether an address
    // is registered. This endpoint is the third, and the weakest one sets the
    // answer for all of them.
    expect(known.status).toBe(unknown.status)
    expect(knownBody).toEqual(unknownBody)
  })

  it('writes nothing and mails nobody for an unknown address', async () => {
    existing = null
    await POST(request({ email: 'nobody@example.com' }))

    expect(inserts).toHaveLength(0)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('stores the digest and mails the raw token', async () => {
    await POST(request({ email: KNOWN.email }))

    const row = inserts.find(([t]) => t === verificationTokens)?.[1] as Record<string, unknown>
    expect(row).toBeDefined()

    const raw = new URL(resetUrl).searchParams.get('token')
    expect(raw).toMatch(/^[0-9a-f]{64}$/)
    // What is mailed and what is stored must never be the same string: a
    // leaked row has to be useless to whoever reads it.
    expect(row.token).not.toBe(raw)
    expect(row.token).toBe(hashToken(raw as string))
  })

  it('marks the token as a reset, so the verify route cannot spend it', async () => {
    await POST(request({ email: KNOWN.email }))

    const row = inserts.find(([t]) => t === verificationTokens)?.[1] as Record<string, unknown>
    expect(row.purpose).toBe('reset')
  })

  it('carries the address alongside the token in the link', async () => {
    await POST(request({ email: KNOWN.email }))

    const url = new URL(resetUrl)
    expect(url.pathname).toBe('/reset-password')
    expect(url.searchParams.get('email')).toBe(KNOWN.email)
  })

  it('drops any earlier reset token before minting the new one', async () => {
    await POST(request({ email: KNOWN.email }))

    // One live link at a time: the newest mail must be the working one, so
    // the delete has to happen before the insert rather than after it.
    expect(calls).toEqual(['delete', 'insert'])
  })

  it('expires the token in fifteen minutes', async () => {
    const before = Date.now()
    await POST(request({ email: KNOWN.email }))
    const after = Date.now()
    const row = inserts.find(([t]) => t === verificationTokens)?.[1] as { expires: Date }

    // Bracketed by the clock either side of the call rather than measured from
    // one end: the route reads `Date.now()` itself, which has moved on by the
    // time it does, so a fixed bound is off by however long the await took.
    const expires = row.expires.getTime()
    expect(expires).toBeGreaterThanOrEqual(before + 15 * 60_000)
    expect(expires).toBeLessThanOrEqual(after + 15 * 60_000)
  })

  it('refuses a sixth request for the same address within the hour', async () => {
    // Deliberately from six different addresses: the email budget has to bite
    // on its own, or one host per request walks straight past it.
    for (let i = 0; i < 5; i += 1) {
      expect((await POST(request({ email: KNOWN.email }))).status).toBe(200)
    }
    const sixth = await POST(request({ email: KNOWN.email }))
    expect(sixth.status).toBe(429)
    expect(sixth.headers.get('Retry-After')).toBeTruthy()
  })

  it('refuses an eleventh request from one address, whatever it asks for', async () => {
    // The other half of the pair: without this, one host walks an address list
    // five requests at a time.
    for (let i = 0; i < 10; i += 1) {
      const res = await POST(request({ email: `person${i}@example.com` }, '10.9.9.9'))
      expect(res.status).toBe(200)
    }
    const eleventh = await POST(request({ email: 'person99@example.com' }, '10.9.9.9'))
    expect(eleventh.status).toBe(429)
  })

  it('refuses a body that is not an email address', async () => {
    expect((await POST(request({ email: 'not-an-email' }))).status).toBe(400)
    expect(inserts).toHaveLength(0)
  })
})
