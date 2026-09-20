import { beforeEach, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import { newToken } from '@/lib/auth-tokens'
import { resetBuckets } from '@/lib/rate-limit'
import { users } from '@/db/schema/auth'

interface TokenRow {
  identifier: string
  token: string
  purpose: 'verify' | 'reset'
  expires: Date
}

interface UserRow {
  id: string
  email: string
  passwordHash: string | null
  emailVerified: Date | null
}

/**
 * What the token lookup finds. The route's where-clause is what decides this
 * in production; here the test states the row it is meant to have matched, and
 * `matchedWhere` records that the clause was built at all.
 */
let tokenRow: TokenRow | null = null
let userRow: UserRow | null = null

const updates: [unknown, unknown][] = []
const calls: string[] = []
const sendMail = vi.fn(async () => ({ delivered: true }))

vi.mock('@/lib/mail', () => ({ sendMail: () => sendMail() }))
vi.mock('@emails/password-changed', () => ({ PasswordChanged: () => null }))

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
  let selectCall = 0
  return {
    db: {
      select: () => {
        // Two lookups in order: the token, then the user it names.
        selectCall += 1
        const first = selectCall % 2 === 1
        return chain(first ? (tokenRow ? [tokenRow] : []) : userRow ? [userRow] : [])
      },
      update: (table: unknown) => ({
        set: (patch: unknown) => {
          calls.push('update')
          updates.push([table, patch])
          return chain({ affectedRows: 1 })
        },
      }),
      delete: () => chain({ affectedRows: 1 }, () => calls.push('delete')),
    },
  }
})

const { POST } = await import('./route')

let ip = 0
function request(body: unknown): Request {
  ip += 1
  return new Request('http://localhost/api/v1/auth/reset-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.11.0.${ip}` },
    body: JSON.stringify(body),
  })
}

const RAW = newToken()
const EMAIL = 'buyer@example.com'
const NEW_PASSWORD = 'Str0ngPassphrase'

function body(over: Record<string, unknown> = {}) {
  return { email: EMAIL, token: RAW, password: NEW_PASSWORD, ...over }
}

function updated(table: unknown): Record<string, unknown> | undefined {
  return updates.find(([t]) => t === table)?.[1] as Record<string, unknown> | undefined
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://shop.example'
  tokenRow = {
    identifier: EMAIL,
    token: 'digest',
    purpose: 'reset',
    expires: new Date(Date.now() + 10 * 60_000),
  }
  userRow = {
    id: 'user-1',
    email: EMAIL,
    passwordHash: '$2b$12$old',
    emailVerified: new Date('2026-01-01'),
  }
  updates.length = 0
  calls.length = 0
  sendMail.mockClear()
  resetBuckets()
})

describe('POST /api/v1/auth/reset-password', () => {
  it('stores a bcrypt hash of the new password, never the password', async () => {
    const res = await POST(request(body()))
    expect(res.status).toBe(200)

    const patch = updated(users) as { passwordHash: string }
    expect(patch.passwordHash).not.toBe(NEW_PASSWORD)
    expect(await bcrypt.compare(NEW_PASSWORD, patch.passwordHash)).toBe(true)
  })

  it('stamps password_changed_at, which is what evicts live sessions', async () => {
    const before = Date.now()
    await POST(request(body()))

    const patch = updated(users) as { passwordChangedAt: Date }
    // Without this the reset changes the credential and leaves any stolen
    // cookie working until it expires - up to 30 days.
    expect(patch.passwordChangedAt).toBeInstanceOf(Date)
    expect(patch.passwordChangedAt.getTime()).toBeGreaterThanOrEqual(before)
  })

  it('verifies the address, because opening the link proved the inbox', async () => {
    userRow = { ...(userRow as UserRow), emailVerified: null }
    await POST(request(body()))

    const patch = updated(users) as { emailVerified: Date | null }
    // A stalled signup resets its way out instead of needing the operator CLI.
    expect(patch.emailVerified).toBeInstanceOf(Date)
  })

  it('keeps the original verification date when there already is one', async () => {
    const original = new Date('2026-01-01')
    userRow = { ...(userRow as UserRow), emailVerified: original }
    await POST(request(body()))

    const patch = updated(users) as { emailVerified: Date }
    expect(patch.emailVerified.getTime()).toBe(original.getTime())
  })

  it('gives an OAuth-only account its first password', async () => {
    userRow = { ...(userRow as UserRow), passwordHash: null }
    const res = await POST(request(body()))

    expect(res.status).toBe(200)
    expect(updated(users)).toBeDefined()
  })

  it('burns the token before answering', async () => {
    await POST(request(body()))
    // Single use. The delete covers every reset row for the address, so a
    // second link still sitting in the inbox dies with the one just spent.
    expect(calls).toContain('delete')
  })

  it('refuses when no live token matches', async () => {
    tokenRow = null
    const res = await POST(request(body()))

    expect(res.status).toBe(404)
    expect(updates).toHaveLength(0)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('refuses a token whose account has since vanished', async () => {
    userRow = null
    const res = await POST(request(body()))

    expect(res.status).toBe(404)
    expect(updates).toHaveLength(0)
  })

  it('refuses a password the sign-in rules would not accept', async () => {
    // Same shape as signup: 10+ chars, upper, lower, digit. A reset that let a
    // weaker password through would produce an account that cannot be used.
    for (const weak of ['short', 'alllowercase1', 'ALLUPPERCASE1', 'NoDigitsHere']) {
      const res = await POST(request(body({ password: weak })))
      expect(res.status, weak).toBe(400)
    }
    expect(updates).toHaveLength(0)
  })

  it('refuses a token of the wrong shape without touching the database', async () => {
    const res = await POST(request(body({ token: 'nope' })))
    expect(res.status).toBe(400)
    expect(updates).toHaveLength(0)
  })

  it('tells the account holder their password moved', async () => {
    await POST(request(body()))
    // The one notice that reaches a victim whose inbox was used to take the
    // account over.
    expect(sendMail).toHaveBeenCalledTimes(1)
  })

  it('still answers 200 when the confirmation mail fails', async () => {
    sendMail.mockRejectedValueOnce(new Error('smtp down'))
    const res = await POST(request(body()))

    // The password is already changed. Reporting a mail failure here would
    // tell the customer the reset did not work when it did.
    expect(res.status).toBe(200)
  })

  it('refuses an eleventh attempt from one address within the hour', async () => {
    resetBuckets()
    const from = '10.11.9.9'
    function fixed(): Request {
      return new Request('http://localhost/api/v1/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': from },
        body: JSON.stringify(body()),
      })
    }
    for (let i = 0; i < 10; i += 1) {
      expect((await POST(fixed())).status).toBe(200)
    }
    expect((await POST(fixed())).status).toBe(429)
  })
})
