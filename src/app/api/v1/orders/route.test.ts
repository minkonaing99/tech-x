import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetBuckets } from '@/lib/rate-limit'
import { addresses } from '@/db/schema/addresses'
import { orderItems, orders } from '@/db/schema/orders'

const ADDRESS_ID = '3aa6e85b-1c2d-4e5f-8a9b-0c1d2e3f4a5b'

interface Session {
  user?: { id?: string; email?: string }
}

let session: Session | null = null
/** One entry per `db.select()` the route makes, in order. */
let selects: unknown[][] = []
/** Every `tx.insert(table).values(v)` the transaction performed. */
let inserts: [unknown, unknown][] = []
let cartLines: CartLine[] = []
const clearCart = vi.fn(async () => {})
const sendMail = vi.fn<(params: { to: string; subject: string }) => Promise<{ delivered: boolean }>>(
  async () => ({ delivered: true }),
)

/** Recipients of every mail the route sent, in order. */
function recipients(): string[] {
  return sendMail.mock.calls.map(([params]) => params.to)
}
const sendTelegram = vi.fn<(text: string) => Promise<void>>(async () => {})

interface CartLine {
  productId: string
  qty: number
  product: {
    name: string
    priceMmk: number
    salePriceMmk: number | null
    stockQty: number
    isActive: boolean
  }
}

vi.mock('@/lib/auth', () => ({ auth: async () => session }))
vi.mock('@/lib/cart-session', () => ({
  getCartLines: async () => cartLines,
  clearCart: () => clearCart(),
}))
vi.mock('@/lib/mail', () => ({ sendMail: (p: { to: string; subject: string }) => sendMail(p) }))
vi.mock('@/lib/telegram', () => ({ sendTelegram: (text: string) => sendTelegram(text) }))
vi.mock('@emails/new-order-alert', () => ({ NewOrderAlert: () => null }))
vi.mock('@emails/order-placed', () => ({ OrderPlaced: () => null }))

vi.mock('@/db', () => {
  // Drizzle's builder is both chainable and awaitable, so every step returns the
  // same object and that object is a thenable.
  function chain(result: unknown) {
    const c: Record<string, unknown> = {
      from: () => c,
      where: () => c,
      limit: () => c,
      orderBy: () => c,
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
    }
    return c
  }
  const tx = {
    insert: (table: unknown) => ({
      values: async (v: unknown) => {
        inserts.push([table, v])
      },
    }),
  }
  return {
    db: {
      select: () => chain(selects.shift() ?? []),
      transaction: async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx),
    },
  }
})

const { POST } = await import('./route')

const SAVED_ADDRESS = {
  id: ADDRESS_ID,
  userId: 'u1',
  divisionId: 'yangon',
  recipient: 'Aung Aung',
  phone: '+959123456789',
  telegramUsername: null,
  city: 'Yangon',
  township: 'Kamayut',
  street: '12 Pyay Road',
  landmark: null,
  mapsUrl: null,
}

const YANGON = {
  id: 'yangon',
  name: 'Yangon',
  deliveryFeeMmk: 3000,
  codAllowed: true,
  isBlocked: false,
}

const WALLET = { id: 'kbz', name: 'KBZPay', kind: 'wallet', isActive: true }
const COD = { id: 'cod', name: 'Cash on Delivery', kind: 'cod', isActive: true }

const NEW_ADDRESS = {
  label: 'Home',
  recipient: 'Aung Aung',
  phone: '+959123456789',
  divisionId: 'yangon',
  city: 'Yangon',
  township: 'Kamayut',
  street: '12 Pyay Road',
}

function line(over: Partial<CartLine['product']> & { qty?: number } = {}): CartLine {
  const { qty = 2, ...product } = over
  return {
    productId: 'p1',
    qty,
    product: {
      name: 'Signet',
      priceMmk: 15_000,
      salePriceMmk: null,
      stockQty: 10,
      isActive: true,
      ...product,
    },
  }
}

/** Each test gets its own address so the 10/hour limiter does not leak. */
let ip = 0
function request(body: unknown, from?: string): Request {
  ip += 1
  return new Request('http://localhost/api/v1/orders', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': from ?? `10.4.0.${ip}`,
    },
    body: JSON.stringify(body),
  })
}

function inserted(table: unknown): unknown {
  return inserts.find(([t]) => t === table)?.[1]
}

beforeEach(() => {
  session = { user: { id: 'u1', email: 'buyer@example.com' } }
  selects = []
  inserts = []
  cartLines = [line()]
  clearCart.mockClear()
  sendMail.mockClear()
  sendTelegram.mockClear()
  resetBuckets()
})

describe('POST /api/v1/orders', () => {
  it('refuses an anonymous checkout', async () => {
    session = null
    expect((await POST(request({ shippingAddressId: ADDRESS_ID, paymentMethodId: 'kbz' }))).status).toBe(401)
  })

  it('prices the order from the catalog and the division, not from the request', async () => {
    // The customer controls the body. If any figure in it reached the order rows,
    // the shop could be told what to charge.
    selects = [[SAVED_ADDRESS], [YANGON], [WALLET]]
    const res = await POST(
      request({
        shippingAddressId: ADDRESS_ID,
        paymentMethodId: 'kbz',
        subtotalMmk: 1,
        deliveryFeeMmk: 0,
        totalMmk: 1,
      }),
    )

    expect(res.status).toBe(200)
    const order = inserted(orders) as Record<string, number>
    expect(order.subtotalMmk).toBe(30_000) // 2 x 15,000 from the cart
    expect(order.deliveryFeeMmk).toBe(3000) // from the division row
    expect(order.totalMmk).toBe(33_000)
  })

  it('snapshots the unit price on each line so a later price change cannot rewrite history', async () => {
    selects = [[SAVED_ADDRESS], [YANGON], [WALLET]]
    await POST(request({ shippingAddressId: ADDRESS_ID, paymentMethodId: 'kbz' }))

    const items = inserted(orderItems) as { unitPriceMmkSnapshot: number; nameSnapshot: string }[]
    expect(items).toHaveLength(1)
    expect(items[0]?.unitPriceMmkSnapshot).toBe(15_000)
    expect(items[0]?.nameSnapshot).toBe('Signet')
  })

  it('prices a discounted line at the sale price, not the list price', async () => {
    cartLines = [line({ priceMmk: 15_000, salePriceMmk: 10_000, qty: 2 })]
    selects = [[SAVED_ADDRESS], [YANGON], [WALLET]]
    await POST(request({ shippingAddressId: ADDRESS_ID, paymentMethodId: 'kbz' }))

    const order = inserted(orders) as Record<string, number>
    expect(order.subtotalMmk).toBe(20_000)
    expect(order.totalMmk).toBe(23_000)
  })

  it('snapshots what was paid and the list price it was discounted from', async () => {
    cartLines = [line({ priceMmk: 15_000, salePriceMmk: 10_000, qty: 2 })]
    selects = [[SAVED_ADDRESS], [YANGON], [WALLET]]
    await POST(request({ shippingAddressId: ADDRESS_ID, paymentMethodId: 'kbz' }))

    const items = inserted(orderItems) as {
      unitPriceMmkSnapshot: number
      listPriceMmkSnapshot: number | null
    }[]
    expect(items[0]?.unitPriceMmkSnapshot).toBe(10_000)
    expect(items[0]?.listPriceMmkSnapshot).toBe(15_000)
  })

  it('leaves the list-price snapshot null when the line was not discounted', async () => {
    selects = [[SAVED_ADDRESS], [YANGON], [WALLET]]
    await POST(request({ shippingAddressId: ADDRESS_ID, paymentMethodId: 'kbz' }))

    const items = inserted(orderItems) as { listPriceMmkSnapshot: number | null }[]
    expect(items[0]?.listPriceMmkSnapshot).toBeNull()
  })

  it('always stores a subtotal equal to the sum of its own line snapshots', async () => {
    // The subtotal and the per-line snapshot are computed by separate
    // expressions. If they ever disagree, an order stops adding up to itself
    // and no invoice can be trusted afterwards.
    cartLines = [
      line({ priceMmk: 15_000, salePriceMmk: 10_000, qty: 2 }),
      line({ priceMmk: 40_000, qty: 3 }),
    ]
    selects = [[SAVED_ADDRESS], [YANGON], [WALLET]]
    await POST(request({ shippingAddressId: ADDRESS_ID, paymentMethodId: 'kbz' }))

    const order = inserted(orders) as Record<string, number>
    const items = inserted(orderItems) as { unitPriceMmkSnapshot: number; qty: number }[]
    const fromItems = items.reduce((s, i) => s + i.unitPriceMmkSnapshot * i.qty, 0)
    expect(fromItems).toBe(order.subtotalMmk)
    expect(order.subtotalMmk).toBe(140_000)
  })

  it('lets a sale bring an order under the cash-on-delivery cap', async () => {
    // Mirror of the over-cap test above: COD risk is the cash the courier
    // collects, so the discounted total is the right thing to gate on.
    cartLines = [line({ priceMmk: 300_000, salePriceMmk: 200_000, qty: 2 })]
    selects = [[SAVED_ADDRESS], [YANGON], [COD]]
    const res = await POST(request({ shippingAddressId: ADDRESS_ID, paymentMethodId: 'cod' }))

    expect(res.status).toBe(200)
    const order = inserted(orders) as Record<string, number>
    expect(order.totalMmk).toBe(403_000)
  })

  it('charges the list price when the stored sale price is not below it', async () => {
    // The admin routes reject this, but a row that slipped through must never
    // charge more than the price the customer was shown.
    cartLines = [line({ priceMmk: 15_000, salePriceMmk: 20_000, qty: 2 })]
    selects = [[SAVED_ADDRESS], [YANGON], [WALLET]]
    await POST(request({ shippingAddressId: ADDRESS_ID, paymentMethodId: 'kbz' }))

    const order = inserted(orders) as Record<string, number>
    const items = inserted(orderItems) as { listPriceMmkSnapshot: number | null }[]
    expect(order.subtotalMmk).toBe(30_000)
    expect(items[0]?.listPriceMmkSnapshot).toBeNull()
  })

  it('copies the shipping fields onto the order rather than relying on the address row', async () => {
    // The address stays editable and deletable by the customer, so the parcel
    // destination has to be frozen on the order itself.
    selects = [[SAVED_ADDRESS], [YANGON], [WALLET]]
    await POST(request({ shippingAddressId: ADDRESS_ID, paymentMethodId: 'kbz' }))

    const order = inserted(orders) as Record<string, unknown>
    expect(order.shipStreet).toBe('12 Pyay Road')
    expect(order.shipDivisionName).toBe('Yangon')
    expect(order.status).toBe('pending_payment')
  })

  it('answers 404 for an address that is not the caller own', async () => {
    // The lookup is scoped to the session user, so another customer address
    // reads as absent.
    selects = [[], [YANGON], [WALLET]]
    const res = await POST(request({ shippingAddressId: ADDRESS_ID, paymentMethodId: 'kbz' }))
    expect(res.status).toBe(404)
    expect(inserts).toHaveLength(0)
  })

  it('refuses delivery to a blocked division', async () => {
    selects = [[SAVED_ADDRESS], [{ ...YANGON, isBlocked: true }], [WALLET]]
    expect((await POST(request({ shippingAddressId: ADDRESS_ID, paymentMethodId: 'kbz' }))).status).toBe(400)
  })

  it('refuses a division that does not exist', async () => {
    selects = [[SAVED_ADDRESS], [], [WALLET]]
    expect((await POST(request({ shippingAddressId: ADDRESS_ID, paymentMethodId: 'kbz' }))).status).toBe(400)
  })

  it('refuses a payment method that is not active', async () => {
    // The route filters on isActive in the query, so a retired method reads as
    // absent.
    selects = [[SAVED_ADDRESS], [YANGON], []]
    expect((await POST(request({ shippingAddressId: ADDRESS_ID, paymentMethodId: 'retired' }))).status).toBe(400)
  })

  it('refuses cash on delivery above the cap', async () => {
    cartLines = [line({ priceMmk: 300_000 })] // 600,000 + fee, over the 500,000 cap
    selects = [[SAVED_ADDRESS], [YANGON], [COD]]
    const res = await POST(request({ shippingAddressId: ADDRESS_ID, paymentMethodId: 'cod' }))
    expect(res.status).toBe(400)
    expect(inserts).toHaveLength(0)
  })

  it('refuses cash on delivery in a division that does not allow it', async () => {
    selects = [[SAVED_ADDRESS], [{ ...YANGON, codAllowed: false }], [COD]]
    expect((await POST(request({ shippingAddressId: ADDRESS_ID, paymentMethodId: 'cod' }))).status).toBe(400)
  })

  it('accepts cash on delivery under the cap in an allowed division', async () => {
    selects = [[SAVED_ADDRESS], [YANGON], [COD]]
    expect((await POST(request({ shippingAddressId: ADDRESS_ID, paymentMethodId: 'cod' }))).status).toBe(200)
  })

  it('refuses an empty cart', async () => {
    cartLines = []
    selects = [[SAVED_ADDRESS], [YANGON], [WALLET]]
    expect((await POST(request({ shippingAddressId: ADDRESS_ID, paymentMethodId: 'kbz' }))).status).toBe(400)
  })

  /*
   * The message used to be `OUT_OF_STOCK:p1`, and the checkout form put it in
   * front of the customer verbatim. The id belongs in `details`, where the
   * client can act on it; the message is for reading.
   */
  it('refuses a line the stock cannot cover, naming the product', async () => {
    cartLines = [line({ qty: 5, stockQty: 2 })]
    selects = [[SAVED_ADDRESS], [YANGON], [WALLET]]
    const res = await POST(request({ shippingAddressId: ADDRESS_ID, paymentMethodId: 'kbz' }))

    expect(res.status).toBe(409)
    const body = (await res.json()) as {
      error: { code: string; message: string; details: { lines: unknown[] } }
    }
    expect(body.error.code).toBe('CART_UNORDERABLE')
    expect(body.error.message).toBe('Only 2 of Signet left.')
    expect(body.error.details.lines).toEqual([
      { productId: 'p1', problem: { kind: 'insufficient', available: 2 } },
    ])
    expect(inserts).toHaveLength(0)
  })

  it('refuses a sold-out line in words a customer can read', async () => {
    cartLines = [line({ qty: 1, stockQty: 0 })]
    selects = [[SAVED_ADDRESS], [YANGON], [WALLET]]
    const res = await POST(request({ shippingAddressId: ADDRESS_ID, paymentMethodId: 'kbz' }))

    expect(res.status).toBe(409)
    expect((await res.json()).error.message).toBe('Signet just sold out.')
    expect(inserts).toHaveLength(0)
  })

  /*
   * `isActive` was checked when adding to the cart and nowhere afterwards, so
   * a product retired in /admin still ordered as long as stock remained.
   */
  it('refuses a product retired since it was added, even with stock on hand', async () => {
    cartLines = [line({ qty: 1, stockQty: 50, isActive: false })]
    selects = [[SAVED_ADDRESS], [YANGON], [WALLET]]
    const res = await POST(request({ shippingAddressId: ADDRESS_ID, paymentMethodId: 'kbz' }))

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.message).toBe('Signet is no longer available.')
    expect(body.error.details.lines).toEqual([
      { productId: 'p1', problem: { kind: 'unavailable' } },
    ])
    expect(inserts).toHaveLength(0)
  })

  /*
   * Every bad line in one answer. Returning only the first meant a customer
   * with three dead lines fixed one, resubmitted, and met the next.
   */
  it('reports every unorderable line at once, not just the first', async () => {
    cartLines = [
      { ...line({ qty: 5, stockQty: 2 }), productId: 'a' },
      { ...line({ qty: 1, stockQty: 9 }), productId: 'b' },
      { ...line({ qty: 1, stockQty: 0 }), productId: 'c' },
    ]
    selects = [[SAVED_ADDRESS], [YANGON], [WALLET]]
    const res = await POST(request({ shippingAddressId: ADDRESS_ID, paymentMethodId: 'kbz' }))

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error.details.lines).toEqual([
      { productId: 'a', problem: { kind: 'insufficient', available: 2 } },
      { productId: 'c', problem: { kind: 'out_of_stock' } },
    ])
    expect(body.error.message).toBe('2 items in your cart are no longer available.')
    expect(inserts).toHaveLength(0)
  })

  it('writes a new address alongside the order it was entered for', async () => {
    selects = [[YANGON], [WALLET]]
    const res = await POST(request({ newAddress: NEW_ADDRESS, paymentMethodId: 'kbz' }))

    expect(res.status).toBe(200)
    expect(inserted(addresses)).toMatchObject({ userId: 'u1', street: '12 Pyay Road' })
  })

  it('leaves no address behind when a later check rejects the checkout', async () => {
    // The address is held rather than written precisely so a rejected checkout
    // does not litter the customer's address book.
    selects = [[{ ...YANGON, isBlocked: true }], [WALLET]]
    const res = await POST(request({ newAddress: NEW_ADDRESS, paymentMethodId: 'kbz' }))

    expect(res.status).toBe(400)
    expect(inserted(addresses)).toBeUndefined()
  })

  it('labels a one-off address by date instead of storing the entered label', async () => {
    selects = [[YANGON], [WALLET]]
    await POST(
      request({ newAddress: { ...NEW_ADDRESS, saveToAccount: false }, paymentMethodId: 'kbz' }),
    )

    expect((inserted(addresses) as { label: string }).label).toMatch(/^Order \d{4}-\d{2}-\d{2}$/)
  })

  it('keeps the entered label when the customer asked to save it', async () => {
    selects = [[YANGON], [WALLET]]
    await POST(
      request({ newAddress: { ...NEW_ADDRESS, saveToAccount: true }, paymentMethodId: 'kbz' }),
    )

    expect((inserted(addresses) as { label: string }).label).toBe('Home')
  })

  it('refuses a body carrying both an existing and a new address', async () => {
    const res = await POST(
      request({ shippingAddressId: ADDRESS_ID, newAddress: NEW_ADDRESS, paymentMethodId: 'kbz' }),
    )
    expect(res.status).toBe(400)
  })

  it('refuses a body carrying neither', async () => {
    expect((await POST(request({ paymentMethodId: 'kbz' }))).status).toBe(400)
  })

  it('refuses a phone that is not a Myanmar mobile number', async () => {
    for (const phone of ['+1555551234', '09123456789', '+959', 'not a phone']) {
      const res = await POST(
        request({ newAddress: { ...NEW_ADDRESS, phone }, paymentMethodId: 'kbz' }),
      )
      expect(res.status).toBe(400)
    }
    expect(inserts).toHaveLength(0)
  })

  it('refuses a malformed body without throwing', async () => {
    const res = await POST(
      new Request('http://localhost/api/v1/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.4.9.9' },
        body: 'not json',
      }),
    )
    expect(res.status).toBe(400)
  })

  it('empties the cart, then mails the buyer before the owner', async () => {
    // The buyer's copy carries the payment details, so it goes out first: if
    // SMTP dies halfway, the customer-facing one is the one that got through.
    selects = [[SAVED_ADDRESS], [YANGON], [WALLET]]
    await POST(request({ shippingAddressId: ADDRESS_ID, paymentMethodId: 'kbz' }))

    expect(clearCart).toHaveBeenCalledOnce()
    expect(recipients()[0]).toBe('buyer@example.com')
    expect(recipients()).toHaveLength(2)
    expect(sendTelegram).toHaveBeenCalledOnce()
  })

  it('still writes the order when the buyer has no address on file to mail', async () => {
    // A session without an email must not cost the customer their order.
    session = { user: { id: 'u1' } }
    selects = [[SAVED_ADDRESS], [YANGON], [WALLET]]
    const res = await POST(request({ shippingAddressId: ADDRESS_ID, paymentMethodId: 'kbz' }))

    expect(res.status).toBe(200)
    expect(recipients()).toEqual([expect.not.stringContaining('buyer@example.com')])
  })

  it('keeps the customer address and raw email out of the Telegram alert', async () => {
    // Telegram is a third party. The alert is a nudge to go look at the order,
    // so it carries the reference and a masked address - never the address.
    selects = [[SAVED_ADDRESS], [YANGON], [WALLET]]
    await POST(request({ shippingAddressId: ADDRESS_ID, paymentMethodId: 'kbz' }))

    const text = sendTelegram.mock.calls[0]?.[0] ?? ''
    expect(text).not.toContain('12 Pyay Road')
    expect(text).not.toContain('buyer@example.com')
    expect(text).not.toContain('+959123456789')
  })

  it('rate limits after ten orders from one caller', async () => {
    const from = '10.4.5.5'
    const send = () => {
      selects = [[SAVED_ADDRESS], [YANGON], [WALLET]]
      return POST(request({ shippingAddressId: ADDRESS_ID, paymentMethodId: 'kbz' }, from))
    }

    for (let i = 0; i < 10; i += 1) {
      expect((await send()).status).toBe(200)
    }

    const blocked = await send()
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('Retry-After')).toBeTruthy()
  })
})
