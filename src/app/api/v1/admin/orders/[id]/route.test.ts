import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fail } from '@/lib/api-response'

const ORDER_ID = '3aa6e85b-1c2d-4e5f-8a9b-0c1d2e3f4a5b'

let admin = true
/** One entry per `db.select()` outside the transaction, in order. */
let selects: unknown[][] = []
/** One entry per `tx.select()` inside the transaction, in order. */
let txSelects: unknown[][] = []
/** `affectedRows` the next stock decrement reports. 0 means the guard held. */
let decrementAffects = 1

const updates: unknown[] = []
const revalidateTag = vi.fn()
const sendMail = vi.fn<(params: { subject: string }) => Promise<{ delivered: boolean }>>(
  async () => ({ delivered: true }),
)

/** Subjects of every mail the route sent, in order. */
function subjects(): string[] {
  return sendMail.mock.calls.map(([params]) => params.subject)
}

vi.mock('@/lib/admin-guard', () => ({
  requireAdmin: async () => (admin ? null : fail('FORBIDDEN', 'Admin only.', 403)),
}))
vi.mock('next/cache', () => ({ revalidateTag: (t: string) => revalidateTag(t) }))
vi.mock('@/lib/mail', () => ({ sendMail: (p: { subject: string }) => sendMail(p) }))
vi.mock('@emails/order-invoice', () => ({ OrderInvoice: () => null }))
vi.mock('@emails/order-delivered', () => ({ OrderDelivered: () => null }))
vi.mock('@emails/order-cancelled', () => ({ OrderCancelled: () => null }))
vi.mock('@emails/low-stock-alert', () => ({ LowStockAlert: () => null }))

vi.mock('@/db', () => {
  // Drizzle's builder is both chainable and awaitable, so every step returns the
  // same object and that object is a thenable.
  function chain(result: unknown, onSet?: (patch: unknown) => void) {
    const c: Record<string, unknown> = {
      from: () => c,
      where: () => c,
      limit: () => c,
      set: (patch: unknown) => {
        onSet?.(patch)
        return c
      },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
    }
    return c
  }
  const tx = {
    select: () => chain(txSelects.shift() ?? []),
    // mysql2 hands back [ResultSetHeader, FieldPacket[]], so the header the
    // route reads affectedRows off is res[0], not res.
    update: () => chain([{ affectedRows: decrementAffects }], (p) => updates.push(p)),
  }
  return {
    db: {
      select: () => chain(selects.shift() ?? []),
      transaction: async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx),
    },
  }
})

const { PATCH } = await import('./route')

const ORDER = {
  id: ORDER_ID,
  userId: 'u1',
  status: 'payment_submitted',
  paymentMethodId: 'kbz',
  subtotalMmk: '30000',
  deliveryFeeMmk: '3000',
  totalMmk: '33000',
  placedAt: new Date('2026-08-19T03:35:00.000Z'),
}
const WALLET = { id: 'kbz', name: 'KBZPay', kind: 'wallet' }
const CUSTOMER = { id: 'u1', email: 'buyer@example.com' }
const ITEM = { productId: 'p1', qty: 2 }
const STOCKED = { name: 'Signet', stockQty: 20, threshold: 3 }

function ctx(id: string = ORDER_ID) {
  return { params: Promise.resolve({ id }) }
}

function request(body: unknown): Request {
  return new Request(`http://localhost/api/v1/admin/orders/${ORDER_ID}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/**
 * The selects a commit performs: order, payment method, then (after the
 * transaction) the customer and the order items for the invoice.
 */
function commitSelects(order = ORDER, product = STOCKED) {
  selects = [[order], [WALLET], [CUSTOMER], [ITEM], [WALLET]]
  txSelects = [[ITEM], [product]]
}

beforeEach(() => {
  admin = true
  selects = []
  txSelects = []
  decrementAffects = 1
  updates.length = 0
  revalidateTag.mockClear()
  sendMail.mockClear()
})

describe('PATCH /api/v1/admin/orders/[id]', () => {
  it('passes the admin guard refusal straight through', async () => {
    admin = false
    const res = await PATCH(request({ status: 'confirmed' }), ctx())
    expect(res.status).toBe(403)
    expect(updates).toHaveLength(0)
  })

  it('refuses an id that is not a uuid', async () => {
    const res = await PATCH(request({ status: 'confirmed' }), ctx('../../products'))
    expect(res.status).toBe(400)
    expect(selects).toHaveLength(0)
  })

  it('refuses a status outside the enum', async () => {
    expect((await PATCH(request({ status: 'refunded' }), ctx())).status).toBe(400)
  })

  it('refuses notes past the length cap', async () => {
    const res = await PATCH(request({ status: 'cancelled', notes: 'x'.repeat(2001) }), ctx())
    expect(res.status).toBe(400)
  })

  it('answers 404 for an order that does not exist', async () => {
    selects = [[]]
    expect((await PATCH(request({ status: 'confirmed' }), ctx())).status).toBe(404)
  })

  it('refuses a transition the state machine does not allow', async () => {
    selects = [[{ ...ORDER, status: 'delivered' }], [WALLET]]
    const res = await PATCH(request({ status: 'pending_payment' }), ctx())
    expect(res.status).toBe(409)
    expect(updates).toHaveLength(0)
  })

  it('decrements stock when the order is confirmed', async () => {
    commitSelects()
    const res = await PATCH(request({ status: 'confirmed' }), ctx())

    expect(res.status).toBe(200)
    // One stock update for the line, one status update for the order.
    expect(updates).toHaveLength(2)
    expect(updates[1]).toMatchObject({ status: 'confirmed' })
    expect(revalidateTag).toHaveBeenCalledWith('products')
  })

  it('refuses the confirmation when the conditional decrement matched no row', async () => {
    // The decrement carries its own `stockQty >= qty` guard, so a sale that
    // raced another one reports zero affected rows rather than going negative.
    commitSelects()
    decrementAffects = 0

    const res = await PATCH(request({ status: 'confirmed' }), ctx())
    expect(res.status).toBe(409)
    const body = (await res.json()) as {
      error: { code: string; message: string; details?: { productId?: string } }
    }
    expect(body.error.code).toBe('OUT_OF_STOCK')
    // The id the client acts on rides in `details`. `message` stays a sentence
    // - it used to carry `OUT_OF_STOCK:<productId>` and two admin screens
    // parsed it back apart with `split(':')`.
    expect(body.error.details?.productId).toBe('p1')
    expect(body.error.message).not.toContain('OUT_OF_STOCK:')
  })

  it('restores stock when a confirmed order is cancelled', async () => {
    selects = [[{ ...ORDER, status: 'confirmed' }], [WALLET], [CUSTOMER]]
    txSelects = [[ITEM]]

    const res = await PATCH(request({ status: 'cancelled' }), ctx())
    expect(res.status).toBe(200)
    expect(updates).toHaveLength(2)
    expect(revalidateTag).toHaveBeenCalledWith('products')
  })

  it('leaves stock alone when an unconfirmed order is cancelled', async () => {
    // Pending orders never held physical inventory, so there is nothing to give
    // back and no catalog cache to bust.
    selects = [[ORDER], [WALLET], [CUSTOMER]]

    const res = await PATCH(request({ status: 'cancelled' }), ctx())
    expect(res.status).toBe(200)
    expect(updates).toHaveLength(1) // the status write only
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('alerts the owner when a confirmation takes a product to its threshold', async () => {
    commitSelects(ORDER, { name: 'Signet', stockQty: 3, threshold: 3 })
    await PATCH(request({ status: 'confirmed' }), ctx())

    expect(subjects().some((s) => s.startsWith('Low stock:'))).toBe(true)
  })

  it('sends no low-stock alert while the product is above its threshold', async () => {
    commitSelects(ORDER, { name: 'Signet', stockQty: 20, threshold: 3 })
    await PATCH(request({ status: 'confirmed' }), ctx())

    expect(subjects().some((s) => s.startsWith('Low stock:'))).toBe(false)
  })

  it('invoices the customer at confirmation', async () => {
    commitSelects()
    await PATCH(request({ status: 'confirmed' }), ctx())

    expect(subjects().some((s) => s.includes('payment confirmed'))).toBe(true)
  })

  it('notifies the customer on delivery', async () => {
    selects = [[{ ...ORDER, status: 'confirmed' }], [WALLET], [CUSTOMER]]
    await PATCH(request({ status: 'delivered' }), ctx())

    expect(subjects().some((s) => s.includes('delivered'))).toBe(true)
  })

  it('notifies the customer on cancellation', async () => {
    selects = [[ORDER], [WALLET], [CUSTOMER]]
    await PATCH(request({ status: 'cancelled', notes: 'Out of stock, sorry.' }), ctx())

    expect(subjects().some((s) => s.includes('cancelled'))).toBe(true)
  })

  it('does not try to mail a customer with no address on file', async () => {
    selects = [[ORDER], [WALLET], [{ id: 'u1', email: null }]]
    const res = await PATCH(request({ status: 'cancelled' }), ctx())

    expect(res.status).toBe(200)
    expect(sendMail).not.toHaveBeenCalled()
  })

  it('records the note the admin attached', async () => {
    selects = [[ORDER], [WALLET], [CUSTOMER]]
    await PATCH(request({ status: 'cancelled', notes: 'Customer asked to cancel.' }), ctx())

    expect(updates[0]).toMatchObject({ notes: 'Customer asked to cancel.' })
  })
})
