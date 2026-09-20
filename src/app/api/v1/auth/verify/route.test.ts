import { beforeEach, describe, expect, it, vi } from 'vitest'

/** Rows the pending-token lookup finds. Empty means no such token. */
let tokenRows: { identifier: string }[] = []
const updates = vi.fn()
const deletes = vi.fn()

vi.mock('@/db', () => {
  // Drizzle's builder is both chainable and awaitable, so every step returns
  // the same object and that object is a thenable.
  function chain(result: unknown, onWhere?: () => void) {
    const c: Record<string, unknown> = {
      from: () => c,
      set: () => c,
      limit: () => c,
      where: () => {
        onWhere?.()
        return c
      },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
    }
    return c
  }
  return {
    db: {
      select: () => chain(tokenRows),
      update: () => chain({ affectedRows: 1 }, updates),
      delete: () => chain({ affectedRows: 1 }, deletes),
    },
  }
})

const { POST } = await import('./route')

const TOKEN = 'a'.repeat(64)

/** Each test gets its own address so the limiter does not leak between them. */
let ip = 0
function request(body: unknown, from?: string): Request {
  ip += 1
  return new Request('http://localhost/api/v1/auth/verify', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': from ?? `10.1.0.${ip}`,
    },
    body: JSON.stringify(body),
  })
}

describe('POST /api/v1/auth/verify', () => {
  beforeEach(() => {
    tokenRows = []
    updates.mockClear()
    deletes.mockClear()
  })

  it('marks the account verified when the token matches', async () => {
    tokenRows = [{ identifier: 'buyer@example.com' }]
    const res = await POST(request({ email: 'buyer@example.com', token: TOKEN }))
    expect(res.status).toBe(200)
    expect(updates).toHaveBeenCalledOnce()
    expect(deletes).toHaveBeenCalledOnce()
  })

  it('answers 404 for an unknown or expired token without writing anything', async () => {
    const res = await POST(request({ email: 'buyer@example.com', token: TOKEN }))
    expect(res.status).toBe(404)
    expect(updates).not.toHaveBeenCalled()
  })

  it('rejects a token that is not the expected length', async () => {
    const res = await POST(request({ email: 'buyer@example.com', token: 'short' }))
    expect(res.status).toBe(400)
  })

  it('rejects a malformed body without throwing', async () => {
    const res = await POST(
      new Request('http://localhost/api/v1/auth/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.2.0.1' },
        body: 'not json',
      }),
    )
    expect(res.status).toBe(400)
  })

  it('rate limits repeated attempts from one address', async () => {
    // Unauthenticated and DB-backed. The token is 256-bit so guessing is out,
    // but nothing should be able to spend queries here without a ceiling.
    const from = '10.3.3.3'
    const send = () => POST(request({ email: 'buyer@example.com', token: TOKEN }, from))

    for (let i = 0; i < 10; i += 1) {
      expect((await send()).status).toBe(404)
    }

    const blocked = await send()
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('Retry-After')).toBeTruthy()
  })
})
