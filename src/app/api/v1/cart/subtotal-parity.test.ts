import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { orders } from '@/db/schema/orders'
import { resetBuckets } from '@/lib/rate-limit'

/**
 * The subtotal used to be a reduce copy-pasted across every cart surface and
 * the order writer. With a sale price in play, one stale copy means the cart
 * quotes a price the order does not charge - and six of seven screens would
 * still agree, so a per-route test would not notice.
 *
 * These two tests are the guard: the first proves every money path agrees on
 * one cart today, the second stops a new hand-rolled subtotal appearing later.
 */

/** One discounted line and one at full price, so a stale copy cannot coincide. */
const CART = [
  {
    productId: 'keychron-k2-pro',
    qty: 2,
    product: {
      id: 'keychron-k2-pro',
      slug: 'keychron-k2-pro',
      name: 'Keychron K2 Pro',
      tagline: '',
      priceMmk: 545_000,
      salePriceMmk: 490_000,
      swatch: '#3D342A',
      hasPhotos: true,
      stockQty: 10,
      isActive: true,
    },
  },
  {
    productId: 'premium-deskmat',
    qty: 3,
    product: {
      id: 'premium-deskmat',
      slug: 'premium-deskmat',
      name: 'Premium DeskMat',
      tagline: '',
      priceMmk: 60_000,
      salePriceMmk: null,
      swatch: '#4A3E33',
      hasPhotos: true,
      stockQty: 10,
      isActive: true,
    },
  },
]

/** 2 x 490,000 + 3 x 60,000. Full price would be 1,270,000. */
const EXPECTED_SUBTOTAL = 1_160_000

const ADDRESS_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7'
const inserts: [unknown, unknown][] = []

vi.mock('@/lib/cart-session', () => ({
  getCartLines: async () => CART,
  addCartItem: async () => {},
  setCartItemQty: async () => {},
  removeCartItem: async () => {},
  mergeGuestCartToUser: async () => {},
  clearCart: async () => {},
}))

vi.mock('@/lib/auth', () => ({
  auth: async () => ({ user: { id: 'u1', email: 'buyer@example.com' } }),
}))

vi.mock('@/lib/mail', () => ({ sendMail: async () => ({ delivered: true }) }))
vi.mock('@/lib/telegram', () => ({ sendTelegram: async () => {} }))
vi.mock('@emails/new-order-alert', () => ({ NewOrderAlert: () => null }))
vi.mock('@emails/order-placed', () => ({ OrderPlaced: () => null }))

const SAVED_ADDRESS = {
  id: ADDRESS_ID,
  userId: 'u1',
  recipient: 'Aung Aung',
  phone: '09765432100',
  divisionId: 'yangon',
  city: 'Yangon',
  township: 'Kamayut',
  street: '12 Pyay Road',
  landmark: null,
  telegramUsername: null,
  mapsUrl: null,
}
const YANGON = { id: 'yangon', name: 'Yangon', deliveryFeeMmk: 3000, codAllowed: true, isActive: true }
const WALLET = { id: 'kbz', name: 'KBZPay', kind: 'wallet', isActive: true }

let selects: unknown[][] = []

vi.mock('@/db', () => {
  function chain(result: unknown, onInsert?: (t: unknown, v: unknown) => void) {
    const c: Record<string, unknown> = {
      from: () => c,
      where: () => c,
      limit: () => c,
      orderBy: () => c,
      for: () => c,
      set: () => c,
      values: (v: unknown) => {
        onInsert?.(c.__table, v)
        return c
      },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
    }
    return c
  }
  const tx = {
    select: () => chain(selects.shift() ?? []),
    update: () => chain([{ affectedRows: 1 }]),
    insert: (table: unknown) => {
      const c = chain(undefined, (_t, v) => inserts.push([table, v])) as Record<string, unknown>
      c.__table = table
      return c
    },
  }
  return {
    db: {
      select: () => chain(selects.shift() ?? []),
      transaction: async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx),
    },
  }
})

const cartGet = (await import('./route')).GET
const itemsPost = (await import('./items/route')).POST
const itemPatch = (await import('./items/[productId]/route')).PATCH
const itemDelete = (await import('./items/[productId]/route')).DELETE
const mergePost = (await import('./merge/route')).POST
const ordersPost = (await import('../orders/route')).POST

let ip = 0
function req(path: string, method = 'GET', body?: unknown): Request {
  ip += 1
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json', 'x-forwarded-for': `10.20.0.${ip}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

async function subtotalOf(res: Response): Promise<number> {
  const json = (await res.json()) as { data: { subtotal: number } }
  return json.data.subtotal
}

beforeEach(() => {
  inserts.length = 0
  selects = []
  ip += 1
  resetBuckets()
})

describe('subtotal parity across every money path', () => {
  it('quotes the same subtotal everywhere and charges exactly that', async () => {
    const ctx = { params: Promise.resolve({ productId: 'keychron-k2-pro' }) }

    // The add and update routes each do a live stock read before answering.
    const IN_STOCK = [{ stockQty: 10, isActive: true }]
    selects = [IN_STOCK, IN_STOCK]

    const quoted = [
      await subtotalOf(await cartGet()),
      await subtotalOf(await itemsPost(req('/api/v1/cart/items', 'POST', { productId: 'premium-deskmat', qty: 1 }))),
      await subtotalOf(await itemPatch(req('/api/v1/cart/items/keychron-k2-pro', 'PATCH', { qty: 2 }), ctx)),
      await subtotalOf(await itemDelete(req('/api/v1/cart/items/keychron-k2-pro', 'DELETE'), ctx)),
      await subtotalOf(await mergePost()),
    ]

    // Every cart surface agrees, and agrees on the discounted figure.
    expect(quoted).toEqual([
      EXPECTED_SUBTOTAL,
      EXPECTED_SUBTOTAL,
      EXPECTED_SUBTOTAL,
      EXPECTED_SUBTOTAL,
      EXPECTED_SUBTOTAL,
    ])

    selects = [[SAVED_ADDRESS], [YANGON], [WALLET]]
    const placed = await ordersPost(
      req('/api/v1/orders', 'POST', { shippingAddressId: ADDRESS_ID, paymentMethodId: 'kbz' }),
    )
    expect(placed.status).toBe(200)

    const order = inserts.find(([t]) => t === orders)?.[1] as { subtotalMmk: number }
    // The charge equals the quote. This is the assertion the whole file exists for.
    expect(order.subtotalMmk).toBe(EXPECTED_SUBTOTAL)
  })

  it('leaves no hand-rolled subtotal in any money path', () => {
    // A lint rule wearing a test costume: `l.product.priceMmk * l.qty` stays a
    // valid number expression, so the compiler cannot reject an eighth copy.
    const files = [
      'src/app/api/v1/cart/route.ts',
      'src/app/api/v1/cart/items/route.ts',
      'src/app/api/v1/cart/items/[productId]/route.ts',
      'src/app/api/v1/cart/merge/route.ts',
      'src/app/api/v1/orders/route.ts',
      'src/app/checkout/page.tsx',
    ]
    for (const f of files) {
      expect(readFileSync(f, 'utf8'), `${f} computes its own subtotal`).not.toContain(
        'l.product.priceMmk * l.qty',
      )
    }
  })
})
