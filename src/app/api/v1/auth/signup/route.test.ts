import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { resetBuckets } from '@/lib/rate-limit'
import { users, verificationTokens } from '@/db/schema/auth'

interface UserRow {
  id: string
  email: string
  name: string | null
  passwordHash: string | null
  emailVerified: Date | null
}

/** The row the email lookup finds, or null for an address nobody has used. */
let existing: UserRow | null = null

const inserts: [unknown, unknown][] = []
const updates: [unknown, unknown][] = []
const deletes: unknown[] = []
const sendMail = vi.fn(async () => ({ delivered: true }))
/** The verification URL handed to the email template. */
let verifyUrl = ''

vi.mock('@/lib/mail', () => ({ sendMail: () => sendMail() }))
vi.mock('@emails/verify-email', () => ({
  VerifyEmail: ({ verifyUrl: url }: { verifyUrl: string }) => {
    verifyUrl = url
    return null
  },
}))

vi.mock('@/db', () => {
  // Drizzle's builder is both chainable and awaitable, so every step returns the
  // same object and that object is a thenable.
  function chain(result: unknown, record?: (arg: unknown) => void) {
    const c: Record<string, unknown> = {
      from: () => c,
      where: (w: unknown) => {
        record?.(w)
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
          inserts.push([table, v])
        },
      }),
      update: (table: unknown) => ({
        set: (patch: unknown) => {
          updates.push([table, patch])
          return chain({ affectedRows: 1 })
        },
      }),
      delete: (table: unknown) => chain({ affectedRows: 1 }, () => deletes.push(table)),
    },
  }
})

const { POST } = await import('./route')

const VALID = { email: 'Buyer@Example.com', password: 'Str0ngPassphrase', name: 'Aung Aung' }

/** Each test gets its own address so the 5/hour limiter does not leak. */
let ip = 0
function request(body: unknown, from?: string): Request {
  ip += 1
  return new Request('http://localhost/api/v1/auth/signup', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': from ?? `10.6.0.${ip}`,
    },
    body: JSON.stringify(body),
  })
}

function inserted(table: unknown): Record<string, unknown> | undefined {
  return inserts.find(([t]) => t === table)?.[1] as Record<string, unknown> | undefined
}

function updated(table: unknown): Record<string, unknown> | undefined {
  return updates.find(([t]) => t === table)?.[1] as Record<string, unknown> | undefined
}

beforeEach(() => {
  // The route reads the public URL to build the link it mails. Deployment docs
  // require it; without it the link would be built against `undefined`.
  vi.stubEnv('AUTH_URL', 'https://merxylab.test')
  existing = null
  inserts.length = 0
  updates.length = 0
  deletes.length = 0
  verifyUrl = ''
  sendMail.mockClear()
  resetBuckets()
})

describe('POST /api/v1/auth/signup', () => {
  it('creates an unverified account and mails a verification link', async () => {
    const res = await POST(request(VALID))

    expect(res.status).toBe(200)
    const row = inserted(users)
    expect(row?.email).toBe('buyer@example.com') // normalised
    expect(row?.role).toBe('customer')
    expect(sendMail).toHaveBeenCalledOnce()
  })

  it('never stores the password itself', async () => {
    await POST(request(VALID))

    const hash = inserted(users)?.passwordHash as string
    expect(hash).not.toContain('Str0ngPassphrase')
    expect(hash.startsWith('$2')).toBe(true)
    expect(await bcrypt.compare('Str0ngPassphrase', hash)).toBe(true)
  })

  it('stores the verification token hashed, not as it was mailed', async () => {
    // The row is what an attacker with read access to the database sees. If the
    // token were stored plainly, that read would be an account takeover.
    await POST(request(VALID))

    const mailed = new URL(verifyUrl).searchParams.get('token') ?? ''
    const stored = inserted(verificationTokens)?.token as string

    expect(mailed).toHaveLength(64)
    expect(stored).not.toBe(mailed)
    expect(stored).toBe(createHash('sha256').update(mailed).digest('hex'))
  })

  it('addresses the verification link to the account being claimed', async () => {
    await POST(request(VALID))
    expect(new URL(verifyUrl).searchParams.get('email')).toBe('buyer@example.com')
  })

  it('refuses a password missing a character class', async () => {
    for (const password of ['alllowercase1', 'ALLUPPERCASE1', 'NoDigitsHere', 'Sh0rt']) {
      const res = await POST(request({ ...VALID, password }))
      expect(res.status).toBe(400)
    }
    expect(inserts).toHaveLength(0)
  })

  it('refuses a malformed email', async () => {
    expect((await POST(request({ ...VALID, email: 'not-an-email' }))).status).toBe(400)
  })

  it('refuses a malformed body without throwing', async () => {
    const res = await POST(
      new Request('http://localhost/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.6.9.9' },
        body: 'not json',
      }),
    )
    expect(res.status).toBe(400)
  })

  it('leaves a verified account with a password untouched', async () => {
    // This endpoint is unauthenticated, so an account with a proven owner must
    // never be writable through it.
    existing = {
      id: 'u1',
      email: 'buyer@example.com',
      name: 'Aung Aung',
      passwordHash: '$2b$12$existinghash',
      emailVerified: new Date('2026-01-01'),
    }

    const res = await POST(request(VALID))
    expect(res.status).toBe(200)
    expect(updates).toHaveLength(0)
    expect(inserts).toHaveLength(0)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('answers a taken address exactly as it answers a fresh one', async () => {
    // A different status or message here would turn the endpoint into a check
    // for whether an address is registered.
    existing = {
      id: 'u1',
      email: 'buyer@example.com',
      name: null,
      passwordHash: '$2b$12$existinghash',
      emailVerified: new Date('2026-01-01'),
    }
    const taken = await POST(request(VALID))

    existing = null
    const fresh = await POST(request(VALID))

    expect(taken.status).toBe(fresh.status)
    expect(await taken.json()).toEqual(await fresh.json())
  })

  it('clears the verified flag when a password is added to an OAuth-only account', async () => {
    // Anyone can reach this endpoint, so the password it just wrote must not be
    // usable until whoever holds the inbox proves it.
    existing = {
      id: 'u1',
      email: 'buyer@example.com',
      name: 'Aung Aung',
      passwordHash: null,
      emailVerified: new Date('2026-01-01'),
    }

    const res = await POST(request(VALID))
    expect(res.status).toBe(200)
    expect(updated(users)?.emailVerified).toBeNull()
  })

  it('drops tokens issued against the password it just replaced', async () => {
    // An older link must not be able to verify a hash its recipient never chose.
    existing = {
      id: 'u1',
      email: 'buyer@example.com',
      name: null,
      passwordHash: null,
      emailVerified: null,
    }

    await POST(request(VALID))
    expect(deletes).toContain(verificationTokens)
  })

  it('keeps the existing name when the request omits one', async () => {
    existing = {
      id: 'u1',
      email: 'buyer@example.com',
      name: 'Aung Aung',
      passwordHash: null,
      emailVerified: null,
    }

    await POST(request({ email: VALID.email, password: VALID.password }))
    expect(updated(users)?.name).toBe('Aung Aung')
  })

  it('rate limits after five signups from one address', async () => {
    const from = '10.6.5.5'
    for (let i = 0; i < 5; i += 1) {
      expect((await POST(request(VALID, from))).status).toBe(200)
    }

    const blocked = await POST(request(VALID, from))
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('Retry-After')).toBeTruthy()
  })
})
