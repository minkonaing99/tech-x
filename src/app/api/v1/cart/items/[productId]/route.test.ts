import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetBuckets } from '@/lib/rate-limit'

const setCartItemQty = vi.fn(async () => {})
const removeCartItem = vi.fn(async () => {})

/** What the live product read answers. Null stands for "no such row". */
let product: { stockQty: number; isActive: boolean } | null = { stockQty: 10, isActive: true }

vi.mock('@/lib/cart-session', () => ({
  getCartLines: async () => [],
  setCartItemQty: () => setCartItemQty(),
  removeCartItem: () => removeCartItem(),
}))

vi.mock('@/db', () => {
  function chain(): Record<string, unknown> {
    const c: Record<string, unknown> = {
      from: () => c,
      where: () => c,
      limit: () => c,
      then: (resolve: (v: unknown) => unknown) =>
        Promise.resolve(product ? [product] : []).then(resolve),
    }
    return c
  }
  return { db: { select: () => chain() } }
})

const { DELETE, PATCH } = await import('./route')

function ctx(productId = 'signet-01') {
  return { params: Promise.resolve({ productId }) }
}

function req(method: string, body?: unknown, from = '10.10.0.1'): Request {
  return new Request('http://localhost/api/v1/cart/items/signet-01', {
    method,
    headers: { 'content-type': 'application/json', 'x-forwarded-for': from },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

beforeEach(() => {
  setCartItemQty.mockClear()
  removeCartItem.mockClear()
  product = { stockQty: 10, isActive: true }
  resetBuckets()
})

describe('cart item route', () => {
  it('updates a quantity', async () => {
    const res = await PATCH(req('PATCH', { qty: 3 }), ctx())
    expect(res.status).toBe(200)
    expect(setCartItemQty).toHaveBeenCalledOnce()
  })

  it('removes an item', async () => {
    expect((await DELETE(req('DELETE'), ctx())).status).toBe(200)
    expect(removeCartItem).toHaveBeenCalledOnce()
  })

  it('refuses an id outside the slug shape', async () => {
    const res = await PATCH(req('PATCH', { qty: 3 }), ctx('../../products'))
    expect(res.status).toBe(400)
    expect(setCartItemQty).not.toHaveBeenCalled()
  })

  it('refuses a quantity outside the allowed range', async () => {
    for (const qty of [-1, 100, 1.5]) {
      expect((await PATCH(req('PATCH', { qty }), ctx())).status).toBe(400)
    }
  })

  it('rate limits writes, not just additions', async () => {
    // These are unauthenticated and write to the database on every call, same as
    // the sibling POST that was already limited.
    for (let i = 0; i < 60; i += 1) {
      expect((await PATCH(req('PATCH', { qty: 1 }, '10.10.5.5'), ctx())).status).toBe(200)
    }

    const blocked = await PATCH(req('PATCH', { qty: 1 }, '10.10.5.5'), ctx())
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('Retry-After')).toBeTruthy()
  })

  it('shares one budget between updating and removing', async () => {
    for (let i = 0; i < 60; i += 1) {
      await PATCH(req('PATCH', { qty: 1 }, '10.10.6.6'), ctx())
    }
    expect((await DELETE(req('DELETE', undefined, '10.10.6.6'), ctx())).status).toBe(429)
  })

  /*
   * This route never looked at stock at all. The zod `max(99)` was the only
   * ceiling, so one unit in the warehouse and a quantity of 99 was accepted,
   * and the shopper found out at the last click of checkout.
   */
  it('refuses a quantity the shop cannot fill', async () => {
    product = { stockQty: 2, isActive: true }

    const res = await PATCH(req('PATCH', { qty: 5 }), ctx())

    expect(res.status).toBe(409)
    expect(setCartItemQty).not.toHaveBeenCalled()
    const body = await res.json()
    expect(body.error.code).toBe('INSUFFICIENT_STOCK')
    expect(body.error.message).toBe('Only 2 left')
  })

  it('allows a quantity that takes exactly the last of the stock', async () => {
    product = { stockQty: 2, isActive: true }

    expect((await PATCH(req('PATCH', { qty: 2 }), ctx())).status).toBe(200)
    expect(setCartItemQty).toHaveBeenCalledOnce()
  })

  it('refuses any quantity once the product has sold out', async () => {
    product = { stockQty: 0, isActive: true }

    const res = await PATCH(req('PATCH', { qty: 1 }), ctx())

    expect(res.status).toBe(409)
    expect((await res.json()).error.code).toBe('OUT_OF_STOCK')
  })

  it('refuses a quantity for a product that has been retired', async () => {
    product = { stockQty: 50, isActive: false }

    const res = await PATCH(req('PATCH', { qty: 1 }), ctx())

    expect(res.status).toBe(409)
    expect((await res.json()).error.code).toBe('UNAVAILABLE')
  })

  /*
   * Removing has to keep working whatever the stock says - it is the way out
   * of a cart that checkout is refusing, so it cannot be gated on the thing
   * being orderable.
   */
  it('still removes a sold-out line, since that is the way to fix the cart', async () => {
    product = { stockQty: 0, isActive: false }

    expect((await PATCH(req('PATCH', { qty: 0 }), ctx())).status).toBe(200)
    expect((await DELETE(req('DELETE'), ctx())).status).toBe(200)
    expect(removeCartItem).toHaveBeenCalled()
  })

  it('refuses a quantity for a product that no longer exists', async () => {
    product = null

    expect((await PATCH(req('PATCH', { qty: 1 }), ctx())).status).toBe(404)
    expect(setCartItemQty).not.toHaveBeenCalled()
  })
})
