import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetBuckets } from '@/lib/rate-limit'

const addCartItem = vi.fn(async () => {})

/** What the live product read answers. Null stands for "no such row". */
let product: { stockQty: number; isActive: boolean } | null = { stockQty: 10, isActive: true }
/** What the cart already holds, which the add is added to. */
let existingQty = 0

vi.mock('@/lib/cart-session', () => ({
  getCartLines: async () =>
    existingQty > 0
      ? [
          {
            productId: 'signet-01',
            qty: existingQty,
            product: {
              id: 'signet-01',
              slug: 'signet-01',
              name: 'Signet 01',
              tagline: '',
              priceMmk: 1000,
              salePriceMmk: null,
              swatch: '#000000',
              hasPhotos: false,
              stockQty: product?.stockQty ?? 0,
              isActive: product?.isActive ?? false,
            },
          },
        ]
      : [],
  addCartItem: () => addCartItem(),
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

const { POST } = await import('./route')

function req(body: unknown, from = '10.20.0.1'): Request {
  return new Request('http://localhost/api/v1/cart/items', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': from },
    body: JSON.stringify(body),
  })
}

function add(qty: number, from?: string) {
  return POST(req({ productId: 'signet-01', qty }, from))
}

beforeEach(() => {
  addCartItem.mockClear()
  product = { stockQty: 10, isActive: true }
  existingQty = 0
  resetBuckets()
})

describe('POST /api/v1/cart/items', () => {
  it('adds when the shop can fill it', async () => {
    expect((await add(2)).status).toBe(200)
    expect(addCartItem).toHaveBeenCalledOnce()
  })

  /*
   * The old check was `stockQty <= 0` alone, so two in the warehouse and a
   * request for five went straight in.
   */
  it('refuses more than the shop holds', async () => {
    product = { stockQty: 2, isActive: true }

    const res = await add(5)

    expect(res.status).toBe(409)
    expect(addCartItem).not.toHaveBeenCalled()
    const body = await res.json()
    expect(body.error.code).toBe('INSUFFICIENT_STOCK')
    expect(body.error.message).toBe('Only 2 left')
  })

  it('allows an add that takes exactly the last of the stock', async () => {
    product = { stockQty: 3, isActive: true }

    expect((await add(3)).status).toBe(200)
    expect(addCartItem).toHaveBeenCalledOnce()
  })

  /*
   * Adding sums into whatever the line already holds, so the check has to be
   * against the total the cart would end up with. Two at a time, three times
   * over, with two in stock, is the way past a check that only looks at the
   * quantity in the request.
   */
  it('counts what the cart already holds, not just what is being added', async () => {
    product = { stockQty: 3, isActive: true }
    existingQty = 2

    const res = await add(2)

    expect(res.status).toBe(409)
    expect(addCartItem).not.toHaveBeenCalled()
    expect((await res.json()).error.message).toBe('Only 3 left')
  })

  it('allows an add that brings the line exactly up to the stock', async () => {
    product = { stockQty: 3, isActive: true }
    existingQty = 2

    expect((await add(1)).status).toBe(200)
    expect(addCartItem).toHaveBeenCalledOnce()
  })

  it('refuses a sold-out product', async () => {
    product = { stockQty: 0, isActive: true }

    const res = await add(1)

    expect(res.status).toBe(409)
    expect((await res.json()).error.code).toBe('OUT_OF_STOCK')
  })

  it('refuses a retired product, saying so rather than calling it missing', async () => {
    product = { stockQty: 50, isActive: false }

    const res = await add(1)

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.code).toBe('UNAVAILABLE')
    expect(body.error.message).toBe('No longer available')
  })

  it('answers 404 for a product that does not exist', async () => {
    product = null

    expect((await add(1)).status).toBe(404)
    expect(addCartItem).not.toHaveBeenCalled()
  })

  it('refuses a quantity outside the allowed range', async () => {
    for (const qty of [0, -1, 100, 1.5]) {
      expect((await add(qty)).status).toBe(400)
    }
    expect(addCartItem).not.toHaveBeenCalled()
  })

  it('refuses an id outside the slug shape', async () => {
    const res = await POST(req({ productId: '../../etc/passwd', qty: 1 }))

    expect(res.status).toBe(400)
    expect(addCartItem).not.toHaveBeenCalled()
  })

  it('rate limits additions', async () => {
    for (let i = 0; i < 60; i += 1) {
      expect((await add(1, '10.20.9.9')).status).toBe(200)
    }

    const blocked = await add(1, '10.20.9.9')

    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('Retry-After')).toBeTruthy()
  })
})
