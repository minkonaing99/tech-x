import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fail } from '@/lib/api-response'
import { products } from '@/db/schema/products'

let admin = true
/** One entry per `db.select()` the route makes, in order. */
let selects: unknown[][] = []
const inserts: [unknown, unknown][] = []

vi.mock('@/lib/admin-guard', () => ({
  requireAdmin: async () => (admin ? null : fail('FORBIDDEN', 'Admin only.', 403)),
}))
vi.mock('next/cache', () => ({ revalidateTag: () => {} }))

vi.mock('@/db', () => {
  function chain(result: unknown, table?: unknown) {
    const c: Record<string, unknown> = {
      from: () => c,
      where: () => c,
      limit: () => c,
      values: (v: unknown) => {
        inserts.push([table, v])
        return c
      },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
    }
    return c
  }
  const tx = { insert: (table: unknown) => chain(undefined, table) }
  return {
    db: {
      select: () => chain(selects.shift() ?? []),
      transaction: async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx),
    },
  }
})

const { POST } = await import('./route')

function body(over: Record<string, unknown> = {}) {
  return {
    slug: 'test-board',
    name: 'Test Board',
    categoryId: 'keyboards',
    priceMmk: 100_000,
    tagline: 'A board',
    description: 'A board for testing.',
    swatch: '#3D342A',
    stockQty: 5,
    lowStockThreshold: 3,
    isActive: true,
    featured: false,
    specs: [],
    ...over,
  }
}

function req(b: unknown): Request {
  return new Request('http://localhost/api/v1/admin/products', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(b),
  })
}

function insertedProduct(): Record<string, unknown> | undefined {
  return inserts.find(([t]) => t === products)?.[1] as Record<string, unknown> | undefined
}

async function message(res: Response): Promise<string> {
  const json = (await res.json()) as { error?: { message?: string } }
  return json.error?.message ?? ''
}

beforeEach(() => {
  admin = true
  selects = [[]] // slug uniqueness check finds nothing
  inserts.length = 0
})

describe('POST /api/v1/admin/products - sale price', () => {
  it('refuses a caller the database does not call an admin', async () => {
    admin = false
    expect((await POST(req(body()))).status).toBe(403)
  })

  it('creates a product with no sale price', async () => {
    const res = await POST(req(body()))
    expect(res.status).toBe(200)
    expect(insertedProduct()?.salePriceMmk).toBeNull()
  })

  it('accepts a sale price strictly below the normal price', async () => {
    const res = await POST(req(body({ salePriceMmk: 90_000 })))
    expect(res.status).toBe(200)
    expect(insertedProduct()?.salePriceMmk).toBe(90_000)
  })

  it('accepts zero as a giveaway price', async () => {
    expect((await POST(req(body({ salePriceMmk: 0 })))).status).toBe(200)
  })

  it('rejects a sale price equal to the normal price, naming both numbers', async () => {
    const res = await POST(req(body({ salePriceMmk: 100_000 })))
    expect(res.status).toBe(400)
    expect(await message(res)).toContain('100000')
    expect(inserts).toHaveLength(0)
  })

  it('rejects a sale price above the normal price', async () => {
    const res = await POST(req(body({ salePriceMmk: 100_001 })))
    expect(res.status).toBe(400)
    expect(inserts).toHaveLength(0)
  })

  it('rejects a negative sale price', async () => {
    expect((await POST(req(body({ salePriceMmk: -1 })))).status).toBe(400)
  })

  it('rejects any sale price on a zero-priced product', async () => {
    const res = await POST(req(body({ priceMmk: 0, salePriceMmk: 0 })))
    expect(res.status).toBe(400)
    expect(inserts).toHaveLength(0)
  })
})
