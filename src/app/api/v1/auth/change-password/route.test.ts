import { beforeEach, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcryptjs'
import { resetBuckets } from '@/lib/rate-limit'
import { users } from '@/db/schema/auth'

interface UserRow {
  id: string
  email: string
  passwordHash: string | null
  emailVerified: Date | null
}

let session: { user: { id: string; email: string } } | null = null
let userRow: UserRow | null = null

const updates: [unknown, unknown][] = []
const sendMail = vi.fn(async () => ({ delivered: true }))

vi.mock('@/lib/auth', () => ({ auth: async () => session }))
vi.mock('@/lib/mail', () => ({ sendMail: () => sendMail() }))
vi.mock('@emails/password-changed', () => ({ PasswordChanged: () => null }))

vi.mock('@/db', () => {
  function chain(result: unknown) {
    const c: Record<string, unknown> = {
      from: () => c,
      where: () => c,
      limit: () => c,
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
    }
    return c
  }
  return {
    db: {
      select: () => chain(userRow ? [userRow] : []),
      update: (table: unknown) => ({
        set: (patch: unknown) => {
          updates.push([table, patch])
          return chain({ affectedRows: 1 })
        },
      }),
    },
  }
})

const { PATCH } = await import('./route')

const CURRENT = 'Curr3ntPassphrase'
const NEXT = 'N3wStrongPassphrase'

let ip = 0
function request(body: unknown, from?: string): Request {
  ip += 1
  return new Request('http://localhost/api/v1/auth/change-password', {
    method: 'PATCH',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': from ?? `10.12.0.${ip}`,
    },
    body: JSON.stringify(body),
  })
}

const body = (over: Record<string, unknown> = {}) => ({
  currentPassword: CURRENT,
  newPassword: NEXT,
  ...over,
})

function updated(table: unknown): Record<string, unknown> | undefined {
  return updates.find(([t]) => t === table)?.[1] as Record<string, unknown> | undefined
}

beforeEach(async () => {
  process.env.NEXT_PUBLIC_SITE_URL = 'https://shop.example'
  session = { user: { id: 'user-1', email: 'buyer@example.com' } }
  userRow = {
    id: 'user-1',
    email: 'buyer@example.com',
    passwordHash: await bcrypt.hash(CURRENT, 10),
    emailVerified: new Date('2026-01-01'),
  }
  updates.length = 0
  sendMail.mockClear()
  resetBuckets()
})

describe('PATCH /api/v1/auth/change-password', () => {
  it('refuses an anonymous caller', async () => {
    session = null
    const res = await PATCH(request(body()))

    expect(res.status).toBe(401)
    expect(updates).toHaveLength(0)
  })

  it('writes the new hash when the current password is right', async () => {
    const res = await PATCH(request(body()))
    expect(res.status).toBe(200)

    const patch = updated(users) as { passwordHash: string }
    expect(await bcrypt.compare(NEXT, patch.passwordHash)).toBe(true)
  })

  it('refuses a wrong current password', async () => {
    const res = await PATCH(request(body({ currentPassword: 'Wr0ngPassphrase' })))

    // Holding the session is not enough. An unlocked laptop must not be a
    // password change.
    expect(res.status).toBe(403)
    expect(updates).toHaveLength(0)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('stamps password_changed_at, which is what evicts the other devices', async () => {
    const before = Date.now()
    await PATCH(request(body()))

    const patch = updated(users) as { passwordChangedAt: Date }
    expect(patch.passwordChangedAt).toBeInstanceOf(Date)
    expect(patch.passwordChangedAt.getTime()).toBeGreaterThanOrEqual(before)
  })

  it('hands back the stamp so the caller can re-mint its own session', async () => {
    const res = await PATCH(request(body()))
    const json = (await res.json()) as { data: { passwordChangedAt: number } }

    // Without re-authenticating, the device that just changed the password is
    // the first one the stamp signs out.
    expect(typeof json.data.passwordChangedAt).toBe('number')
  })

  it('leaves email_verified alone', async () => {
    // Unlike a reset, nothing here proves anything about the inbox.
    await PATCH(request(body()))
    expect(updated(users)).not.toHaveProperty('emailVerified')
  })

  it('refuses when the new password matches the old one', async () => {
    const res = await PATCH(request(body({ newPassword: CURRENT })))

    expect(res.status).toBe(400)
    expect(updates).toHaveLength(0)
  })

  it('refuses a new password the sign-in rules would not accept', async () => {
    for (const weak of ['short', 'alllowercase1', 'ALLUPPERCASE1', 'NoDigitsHere']) {
      const res = await PATCH(request(body({ newPassword: weak })))
      expect(res.status, weak).toBe(400)
    }
    expect(updates).toHaveLength(0)
  })

  it('sends an OAuth-only account to the reset flow instead', async () => {
    userRow = { ...(userRow as UserRow), passwordHash: null }
    const res = await PATCH(request(body()))
    const json = (await res.json()) as { error: { code: string } }

    // There is no current password to prove, and the session alone is a weaker
    // claim than the emailed link the reset flow uses.
    expect(res.status).toBe(409)
    expect(json.error.code).toBe('NO_PASSWORD_SET')
    expect(updates).toHaveLength(0)
  })

  it('tells the account holder their password moved', async () => {
    await PATCH(request(body()))
    expect(sendMail).toHaveBeenCalledTimes(1)
  })

  it('still answers 200 when the notice email fails', async () => {
    sendMail.mockRejectedValueOnce(new Error('smtp down'))
    expect((await PATCH(request(body()))).status).toBe(200)
  })

  it('rations guesses at the current password', async () => {
    // The check is a credential oracle for anyone holding a stolen session,
    // and it is not behind the sign-in limiter.
    for (let i = 0; i < 10; i += 1) {
      const res = await PATCH(request(body({ currentPassword: 'Wr0ngPassphrase' }), '10.12.9.9'))
      expect(res.status).toBe(403)
    }
    const res = await PATCH(request(body(), '10.12.9.9'))
    expect(res.status).toBe(429)
    expect(updates).toHaveLength(0)
  })
})
