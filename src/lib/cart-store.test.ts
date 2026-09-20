import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCart, type CartLine } from './cart-store'

const LINE: CartLine = {
  productId: 'vxe-dragonfly-r1-se',
  qty: 1,
  product: {
    id: 'vxe-dragonfly-r1-se',
    slug: 'vxe-dragonfly-r1-se',
    name: 'VXE Dragonfly R1 SE+',
    tagline: 'Light where it counts.',
    priceMmk: 130_000,
    salePriceMmk: null,
    swatch: '#111111',
    hasPhotos: true,
    stockQty: 4,
    isActive: true,
  },
}

function mockFetch(impl: (path: string, init: RequestInit) => Response) {
  const spy = vi.fn((path: string, init: RequestInit) => Promise.resolve(impl(path, init)))
  vi.stubGlobal('fetch', spy)
  return spy
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function envelope(items: CartLine[], subtotal: number): Response {
  return jsonResponse({ data: { items, subtotal }, error: null })
}

function apiError(code: string, message: string, status: number): Response {
  return jsonResponse({ data: null, error: { code, message, status } }, status)
}

beforeEach(() => {
  useCart.setState({ items: [], subtotal: 0, isOpen: false, hydrated: false })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useCart.add', () => {
  it('reports success and takes the server cart', async () => {
    mockFetch(() => envelope([LINE], 130_000))

    const result = await useCart.getState().add(LINE.productId, 1)

    expect(result).toEqual({ ok: true })
    expect(useCart.getState().items).toEqual([LINE])
    expect(useCart.getState().subtotal).toBe(130_000)
  })

  it('never opens the drawer - the toast is the confirmation', async () => {
    mockFetch(() => envelope([LINE], 130_000))

    await useCart.getState().add(LINE.productId, 1)

    expect(useCart.getState().isOpen).toBe(false)
  })

  it('reports the stock conflict instead of claiming the add worked', async () => {
    mockFetch((path, init) =>
      init.method === 'POST'
        ? apiError('OUT_OF_STOCK', 'Out of stock.', 409)
        : envelope([], 0),
    )

    const result = await useCart.getState().add(LINE.productId, 1)

    expect(result).toEqual({ ok: false, message: 'Out of stock.' })
  })

  it('reports a product that went inactive between render and click', async () => {
    mockFetch((path, init) =>
      init.method === 'POST'
        ? apiError('NOT_FOUND', 'Product not found.', 404)
        : envelope([], 0),
    )

    const result = await useCart.getState().add(LINE.productId, 1)

    expect(result).toEqual({ ok: false, message: 'Product not found.' })
  })

  it('reports the rate limit', async () => {
    mockFetch((path, init) =>
      init.method === 'POST'
        ? apiError('RATE_LIMITED', 'Too many requests.', 429)
        : envelope([], 0),
    )

    const result = await useCart.getState().add(LINE.productId, 1)

    expect(result).toEqual({ ok: false, message: 'Too many requests.' })
  })

  it('reports a failure when the request never lands', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((path: string, init: RequestInit) =>
        init.method === 'POST'
          ? Promise.reject(new Error('offline'))
          : Promise.resolve(envelope([], 0)),
      ),
    )

    const result = await useCart.getState().add(LINE.productId, 1)

    expect(result.ok).toBe(false)
    expect(result.ok === false && result.message.length).toBeGreaterThan(0)
  })

  it('resyncs from the server after a failed add', async () => {
    const spy = mockFetch((path, init) =>
      init.method === 'POST'
        ? apiError('OUT_OF_STOCK', 'Out of stock.', 409)
        : envelope([LINE], 130_000),
    )

    await useCart.getState().add(LINE.productId, 1)

    expect(spy).toHaveBeenCalledTimes(2)
    expect(useCart.getState().items).toEqual([LINE])
  })
})

describe('useCart.fetch', () => {
  it('takes the server cart and marks itself hydrated', async () => {
    mockFetch(() => envelope([LINE], 130_000))

    await useCart.getState().fetch()

    expect(useCart.getState().items).toEqual([LINE])
    expect(useCart.getState().subtotal).toBe(130_000)
    expect(useCart.getState().hydrated).toBe(true)
  })

  it('still hydrates when the cart cannot be read, so the UI stops waiting', async () => {
    mockFetch(() => apiError('SERVER_ERROR', 'Nope.', 500))

    await useCart.getState().fetch()

    expect(useCart.getState().hydrated).toBe(true)
    expect(useCart.getState().items).toEqual([])
  })

  it('accepts an empty cart as a real answer', async () => {
    useCart.setState({ items: [LINE], subtotal: 130_000 })
    mockFetch(() => envelope([], 0))

    await useCart.getState().fetch()

    expect(useCart.getState().items).toEqual([])
    expect(useCart.getState().subtotal).toBe(0)
  })
})

/**
 * These four share one `call` helper, and this diff swapped its body for the
 * shared `api()` client. The point here is that a failed mutation still ends
 * with the store agreeing with the server rather than keeping a stale guess.
 */
describe.each([
  { name: 'setQty', run: () => useCart.getState().setQty(LINE.productId, 3), method: 'PATCH' },
  { name: 'remove', run: () => useCart.getState().remove(LINE.productId), method: 'DELETE' },
  { name: 'merge', run: () => useCart.getState().merge(), method: 'POST' },
])('useCart.$name', ({ run, method }) => {
  it('takes the server cart on success', async () => {
    mockFetch(() => envelope([LINE], 130_000))

    await run()

    expect(useCart.getState().items).toEqual([LINE])
    expect(useCart.getState().subtotal).toBe(130_000)
  })

  it('refetches instead of keeping a stale cart when the mutation fails', async () => {
    useCart.setState({ items: [], subtotal: 0 })
    const spy = mockFetch((path, init) =>
      init.method === method
        ? apiError('VALIDATION_ERROR', 'Invalid id.', 400)
        : envelope([LINE], 130_000),
    )

    await run()

    expect(spy).toHaveBeenCalledTimes(2)
    expect(useCart.getState().items).toEqual([LINE])
  })

  it('leaves the drawer alone', async () => {
    mockFetch(() => envelope([LINE], 130_000))

    await run()

    expect(useCart.getState().isOpen).toBe(false)
  })
})
