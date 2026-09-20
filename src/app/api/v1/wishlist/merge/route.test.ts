import { beforeEach, describe, expect, it, vi } from 'vitest'

let userId: string | null = 'u1'
/** Rows passed to each `db.insert().values()`, one entry per statement. */
const insertBatches: unknown[][] = []
let failInsert = false

vi.mock('@/lib/auth', () => ({
  auth: async () => (userId ? { user: { id: userId } } : null),
}))

vi.mock('@/db', () => {
  function chain() {
    const c: Record<string, unknown> = {
      values: (v: unknown) => {
        insertBatches.push(Array.isArray(v) ? v : [v])
        return c
      },
      onDuplicateKeyUpdate: () => c,
      then: (resolve: (value: unknown) => unknown, reject: (e: unknown) => unknown) =>
        failInsert
          ? Promise.reject(new Error('FK violation')).then(resolve, reject)
          : Promise.resolve([]).then(resolve),
    }
    return c
  }
  return { db: { insert: () => chain() } }
})

const { POST } = await import('./route')

function post(body: unknown): Request {
  return new Request('http://localhost/api/v1/wishlist/merge', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  userId = 'u1'
  insertBatches.length = 0
  failInsert = false
})

describe('POST /api/v1/wishlist/merge', () => {
  it('refuses a caller with no session', async () => {
    userId = null

    const res = await POST(post({ productIds: ['keychron-k2-pro'] }))

    expect(res.status).toBe(401)
    expect(insertBatches).toEqual([])
  })

  it('attaches the ids to the session user, never to an id from the body', async () => {
    const res = await POST(
      post({ productIds: ['keychron-k2-pro'], userId: 'someone-else' }),
    )

    expect(res.status).toBe(200)
    expect(insertBatches).toEqual([[{ userId: 'u1', productId: 'keychron-k2-pro' }]])
  })

  it('writes the whole list in one statement', async () => {
    const ids = Array.from({ length: 30 }, (_, i) => `product-${i}`)

    await POST(post({ productIds: ids }))

    expect(insertBatches).toHaveLength(1)
    expect(insertBatches[0]).toHaveLength(30)
  })

  it('writes nothing for an empty list', async () => {
    const res = await POST(post({ productIds: [] }))

    expect(res.status).toBe(200)
    expect(insertBatches).toEqual([])
  })

  it('rejects an id that is not slug shaped', async () => {
    const res = await POST(post({ productIds: ['../../etc/passwd'] }))

    expect(res.status).toBe(400)
    expect(insertBatches).toEqual([])
  })

  it('rejects a list longer than the cap', async () => {
    const res = await POST(
      post({ productIds: Array.from({ length: 201 }, (_, i) => `product-${i}`) }),
    )

    expect(res.status).toBe(400)
    expect(insertBatches).toEqual([])
  })

  /*
   * The old shape wrapped each insert in a bare `catch {}` for the duplicate
   * case, which meant a stale product id or a database blip was discarded just
   * as quietly - and the route still answered `ok`, so the browser cleared its
   * local list against a merge that had not happened.
   */
  it('does not answer ok when the write actually failed', async () => {
    failInsert = true

    await expect(POST(post({ productIds: ['keychron-k2-pro'] }))).rejects.toThrow('FK violation')
  })
})
