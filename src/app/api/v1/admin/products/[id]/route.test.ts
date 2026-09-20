import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fail } from '@/lib/api-response'

const PRODUCT_ID = 'keychron-k2-pro'

let admin = true
/** One entry per `db.select()` outside the transaction, in order. */
let selects: unknown[][] = []
/** How many selects the route actually performed. */
let selectCount = 0
const updates: unknown[] = []

vi.mock('@/lib/admin-guard', () => ({
  requireAdmin: async () => (admin ? null : fail('FORBIDDEN', 'Admin only.', 403)),
}))
vi.mock('next/cache', () => ({ revalidateTag: () => {} }))

vi.mock('@/db', () => {
  function chain(result: unknown, onSet?: (patch: unknown) => void) {
    const c: Record<string, unknown> = {
      from: () => c,
      where: () => c,
      limit: () => c,
      set: (patch: unknown) => {
        onSet?.(patch)
        return c
      },
      values: () => c,
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
    }
    return c
  }
  const tx = {
    update: () => chain(undefined, (p) => updates.push(p)),
    delete: () => chain(undefined),
    insert: () => chain(undefined),
  }
  return {
    db: {
      select: () => {
        selectCount += 1
        return chain(selects.shift() ?? [])
      },
      transaction: async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx),
    },
  }
})

const { PATCH } = await import('./route')

/** The product as the database holds it: on sale at 80,000 from 100,000. */
const STORED = { priceMmk: 100_000, salePriceMmk: 80_000 }

function ctx(id = PRODUCT_ID) {
  return { params: Promise.resolve({ id }) }
}

function req(body: unknown): Request {
  return new Request(`http://localhost/api/v1/admin/products/${PRODUCT_ID}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function message(res: Response): Promise<string> {
  const json = (await res.json()) as { error?: { message?: string } }
  return json.error?.message ?? ''
}

beforeEach(() => {
  admin = true
  selects = [[STORED]]
  selectCount = 0
  updates.length = 0
})

describe('PATCH /api/v1/admin/products/[id] - sale price', () => {
  it('rejects lowering the normal price to the active sale price', async () => {
    const res = await PATCH(req({ priceMmk: 80_000 }), ctx())
    expect(res.status).toBe(400)
    expect(await message(res)).toContain('80000')
    expect(updates).toHaveLength(0)
  })

  it('rejects lowering the normal price below the active sale price', async () => {
    const res = await PATCH(req({ priceMmk: 70_000 }), ctx())
    expect(res.status).toBe(400)
    expect(updates).toHaveLength(0)
  })

  it('accepts lowering the normal price while clearing the sale in the same write', async () => {
    // `fields.salePriceMmk ?? stored` would read the explicit null as "absent"
    // and re-check against the stored 80,000, making this impossible.
    const res = await PATCH(req({ priceMmk: 70_000, salePriceMmk: null }), ctx())
    expect(res.status).toBe(200)
    expect(updates[0]).toMatchObject({ priceMmk: 70_000, salePriceMmk: null })
  })

  it('accepts clearing the sale on its own', async () => {
    const res = await PATCH(req({ salePriceMmk: null }), ctx())
    expect(res.status).toBe(200)
    expect(updates[0]).toMatchObject({ salePriceMmk: null })
  })

  it('rejects a sale price at or above the stored normal price', async () => {
    const res = await PATCH(req({ salePriceMmk: 100_000 }), ctx())
    expect(res.status).toBe(400)
    expect(updates).toHaveLength(0)
  })

  it('accepts a sale price below the stored normal price', async () => {
    const res = await PATCH(req({ salePriceMmk: 90_000 }), ctx())
    expect(res.status).toBe(200)
    expect(updates[0]).toMatchObject({ salePriceMmk: 90_000 })
  })

  it('reads no extra row for a patch that touches neither price', async () => {
    const res = await PATCH(req({ featured: true }), ctx())
    expect(res.status).toBe(200)
    expect(selectCount).toBe(0)
  })

  it('answers 404 when a price patch targets a product that does not exist', async () => {
    selects = [[]]
    expect((await PATCH(req({ priceMmk: 70_000 }), ctx())).status).toBe(404)
    expect(updates).toHaveLength(0)
  })
})
