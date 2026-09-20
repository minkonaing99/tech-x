import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetBuckets } from '@/lib/rate-limit'

const ORDER_ID = '3aa6e85b-1c2d-4e5f-8a9b-0c1d2e3f4a5b'
const PRIOR_SLIP = '11111111-2222-3333-4444-555555555555.webp'

interface Session {
  user?: { id?: string; email?: string; role?: 'customer' | 'admin' }
}

let session: Session | null = null
/** What the database says about the caller's role, independent of the token. */
let admin = false
/** One entry per `db.select()` the route makes, in order. */
let selects: unknown[][] = []
let sharpFails = false
let privateBytes: Buffer | null = Buffer.from('slip-bytes')

const setSpy = vi.fn()
const putPrivate = vi.fn<(key: string, body: Buffer, type: string) => Promise<void>>(
  async () => {},
)
const deletePrivate = vi.fn<(key: string) => Promise<void>>(async () => {})
const sendMail = vi.fn<(params: { to: string; subject: string }) => Promise<{ delivered: boolean }>>(
  async () => ({ delivered: true }),
)

/** Recipients of every mail the route sent, in order. */
function recipients(): string[] {
  return sendMail.mock.calls.map(([params]) => params.to)
}
const sendTelegram = vi.fn(async () => {})

vi.mock('@/lib/auth', () => ({ auth: async () => session }))
vi.mock('@/lib/admin-guard', () => ({ isAdmin: async () => admin }))

vi.mock('@/db', () => {
  // Drizzle's builder is both chainable and awaitable, so every step returns the
  // same object and that object is a thenable.
  function chain(result: unknown) {
    const c: Record<string, unknown> = {
      from: () => c,
      where: () => c,
      limit: () => c,
      set: (patch: unknown) => {
        setSpy(patch)
        return c
      },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
    }
    return c
  }
  return {
    db: {
      select: () => chain(selects.shift() ?? []),
      update: () => chain({ affectedRows: 1 }),
    },
  }
})

vi.mock('sharp', () => {
  const api: Record<string, unknown> = {
    rotate: () => api,
    resize: () => api,
    webp: () => api,
    toBuffer: async () => {
      if (sharpFails) throw new Error('unsupported image format')
      return Buffer.from('webp-bytes')
    },
  }
  return { default: () => api }
})

vi.mock('@/lib/r2', () => ({
  putPrivate: (key: string, body: Buffer, type: string) => putPrivate(key, body, type),
  deletePrivate: (key: string) => deletePrivate(key),
  getPrivateBytes: async () => privateBytes,
}))

vi.mock('@/lib/mail', () => ({ sendMail: (p: { to: string; subject: string }) => sendMail(p) }))
vi.mock('@/lib/telegram', () => ({ sendTelegram: () => sendTelegram() }))
vi.mock('@emails/slip-submitted-alert', () => ({ SlipSubmittedAlert: () => null }))
vi.mock('@emails/slip-received', () => ({ SlipReceived: () => null }))

const { GET, POST } = await import('./route')

interface OrderRow {
  id: string
  userId: string
  status: string
  paymentMethodId: string
  paymentProofUrl: string | null
  totalMmk: string
  placedAt: Date
}

function order(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    id: ORDER_ID,
    userId: 'u1',
    status: 'pending_payment',
    paymentMethodId: 'kbz',
    paymentProofUrl: null,
    totalMmk: '25000',
    placedAt: new Date('2026-08-19T03:35:00.000Z'),
    ...overrides,
  }
}

const WALLET = { id: 'kbz', name: 'KBZPay', kind: 'wallet' }
const COD = { id: 'cod', name: 'Cash on Delivery', kind: 'cod' }

/** Each test gets its own address so the 10/hour limiter does not leak. */
let ip = 0
function ctx(id: string = ORDER_ID) {
  return { params: Promise.resolve({ id }) }
}

function png(bytes = 32, type = 'image/png'): File {
  return new File([new Uint8Array(bytes)], 'slip.png', { type })
}

function upload(file: File | null, txRef?: string): Request {
  ip += 1
  const form = new FormData()
  if (file) form.set('slip', file)
  if (txRef !== undefined) form.set('txRef', txRef)
  return new Request(`http://localhost/api/v1/orders/${ORDER_ID}/slip`, {
    method: 'POST',
    headers: { 'x-forwarded-for': `10.7.0.${ip}` },
    body: form,
  })
}

function read(): Request {
  ip += 1
  return new Request(`http://localhost/api/v1/orders/${ORDER_ID}/slip`, {
    headers: { 'x-forwarded-for': `10.8.0.${ip}` },
  })
}

beforeEach(() => {
  session = { user: { id: 'u1', email: 'buyer@example.com', role: 'customer' } }
  admin = false
  selects = []
  sharpFails = false
  privateBytes = Buffer.from('slip-bytes')
  setSpy.mockClear()
  putPrivate.mockClear()
  deletePrivate.mockClear()
  sendMail.mockClear()
  sendTelegram.mockClear()
  resetBuckets()
})

describe('GET /api/v1/orders/[id]/slip', () => {
  it('refuses an anonymous reader', async () => {
    session = null
    expect((await GET(read(), ctx())).status).toBe(401)
  })

  it('refuses an id that is not a uuid before touching the database', async () => {
    const res = await GET(read(), ctx('../../etc/passwd'))
    expect(res.status).toBe(400)
    expect(selects.length).toBe(0)
  })

  it('answers 404 for an order that does not exist', async () => {
    selects = [[]]
    expect((await GET(read(), ctx())).status).toBe(404)
  })

  it('serves the slip to the order owner', async () => {
    selects = [[order({ paymentProofUrl: PRIOR_SLIP })]]
    const res = await GET(read(), ctx())

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/webp')
    // A payment slip is not something a shared cache may keep a copy of.
    expect(res.headers.get('Cache-Control')).toBe('private, no-store')
  })

  it('serves the slip to an admin who does not own the order', async () => {
    session = { user: { id: 'owner-of-nothing', role: 'admin' } }
    admin = true
    selects = [[order({ userId: 'someone-else', paymentProofUrl: PRIOR_SLIP })]]

    expect((await GET(read(), ctx())).status).toBe(200)
  })

  it('refuses a signed-in customer reading another customer order', async () => {
    selects = [[order({ userId: 'someone-else', paymentProofUrl: PRIOR_SLIP })]]
    expect((await GET(read(), ctx())).status).toBe(403)
  })

  it('refuses a token still claiming admin after the role was revoked', async () => {
    // The role in the session comes from a 30-day JWT. Only the database answer
    // may open someone else's slip.
    session = { user: { id: 'demoted', role: 'admin' } }
    admin = false
    selects = [[order({ userId: 'someone-else', paymentProofUrl: PRIOR_SLIP })]]

    expect((await GET(read(), ctx())).status).toBe(403)
  })

  it('answers 404 when the order carries no slip', async () => {
    selects = [[order({ paymentProofUrl: null })]]
    expect((await GET(read(), ctx())).status).toBe(404)
  })

  it('ignores a stored value that is not a slip basename', async () => {
    // The stored name is re-validated on the way out, so a value that somehow
    // got past the writer cannot be used to address another key in the bucket.
    selects = [[order({ paymentProofUrl: '../../../secrets/dump.webp' })]]
    expect((await GET(read(), ctx())).status).toBe(404)
  })

  it('answers 404 when the object is gone from storage', async () => {
    selects = [[order({ paymentProofUrl: PRIOR_SLIP })]]
    privateBytes = null
    expect((await GET(read(), ctx())).status).toBe(404)
  })
})

describe('POST /api/v1/orders/[id]/slip', () => {
  it('refuses an anonymous uploader', async () => {
    session = null
    expect((await POST(upload(png()), ctx())).status).toBe(401)
  })

  it('refuses an id that is not a uuid', async () => {
    expect((await POST(upload(png()), ctx('not-a-uuid'))).status).toBe(400)
  })

  it('answers 404 when the order is not the caller own', async () => {
    // The lookup is scoped to the session user, so another customer order reads
    // as absent rather than forbidden.
    selects = [[]]
    expect((await POST(upload(png()), ctx())).status).toBe(404)
    expect(putPrivate).not.toHaveBeenCalled()
  })

  it('refuses an order past the point where a slip is accepted', async () => {
    selects = [[order({ status: 'delivered' })]]
    expect((await POST(upload(png()), ctx())).status).toBe(409)
  })

  it('refuses a slip on a cash-on-delivery order', async () => {
    selects = [[order({ paymentMethodId: 'cod' })], [COD]]
    expect((await POST(upload(png()), ctx())).status).toBe(409)
  })

  it('rejects a request carrying no file', async () => {
    selects = [[order()], [WALLET]]
    expect((await POST(upload(null), ctx())).status).toBe(400)
  })

  it('rejects a file over the size cap', async () => {
    selects = [[order()], [WALLET]]
    const res = await POST(upload(png(9 * 1024 * 1024)), ctx())
    expect(res.status).toBe(413)
    expect(putPrivate).not.toHaveBeenCalled()
  })

  it('rejects a content type that is not an image we re-encode', async () => {
    selects = [[order()], [WALLET]]
    const res = await POST(upload(png(32, 'application/pdf')), ctx())
    expect(res.status).toBe(415)
    expect(putPrivate).not.toHaveBeenCalled()
  })

  it('rejects bytes that only claim to be an image', async () => {
    selects = [[order()], [WALLET]]
    sharpFails = true
    const res = await POST(upload(png()), ctx())
    expect(res.status).toBe(400)
    expect(putPrivate).not.toHaveBeenCalled()
  })

  it('reports upstream failure without advancing the order', async () => {
    selects = [[order()], [WALLET]]
    putPrivate.mockRejectedValueOnce(new Error('bucket down'))
    const res = await POST(upload(png()), ctx())
    expect(res.status).toBe(502)
    expect(setSpy).not.toHaveBeenCalled()
  })

  it('stores the slip under the order, advances the status, and mails both sides', async () => {
    selects = [[order()], [WALLET]]
    const res = await POST(upload(png()), ctx())

    expect(res.status).toBe(200)
    const [key, , contentType] = putPrivate.mock.calls[0] ?? []
    expect(key).toMatch(
      /^slips\/3aa6e85b-1c2d-4e5f-8a9b-0c1d2e3f4a5b\/[0-9a-f-]{36}\.webp$/i,
    )
    // Re-encoded to webp, so the stored bytes are never the uploaded ones.
    expect(contentType).toBe('image/webp')

    const patch = setSpy.mock.calls[0]?.[0] as { status: string; paymentProofUrl: string }
    expect(patch.status).toBe('payment_submitted')
    expect(patch.paymentProofUrl).toMatch(/^[0-9a-f-]{36}\.webp$/i)
    // The buyer is told their slip landed before the owner is told to check it.
    expect(recipients()[0]).toBe('buyer@example.com')
    expect(recipients()).toHaveLength(2)
    expect(sendTelegram).toHaveBeenCalledOnce()
  })

  it('removes the slip it replaces', async () => {
    selects = [[order({ status: 'payment_submitted', paymentProofUrl: PRIOR_SLIP })], [WALLET]]
    expect((await POST(upload(png()), ctx())).status).toBe(200)
    expect(deletePrivate).toHaveBeenCalledWith(`slips/${ORDER_ID}/${PRIOR_SLIP}`)
  })

  it('truncates an overlong transaction reference', async () => {
    selects = [[order()], [WALLET]]
    await POST(upload(png(), 'x'.repeat(500)), ctx())
    const patch = setSpy.mock.calls[0]?.[0] as { paymentTxRef: string }
    expect(patch.paymentTxRef).toHaveLength(120)
  })

  it('stores no reference when the field is blank', async () => {
    selects = [[order()], [WALLET]]
    await POST(upload(png(), ''), ctx())
    const patch = setSpy.mock.calls[0]?.[0] as { paymentTxRef: string | null }
    expect(patch.paymentTxRef).toBeNull()
  })

  it('rate limits after ten uploads from one caller', async () => {
    const send = () => {
      selects = [[order()], [WALLET]]
      return POST(
        new Request(`http://localhost/api/v1/orders/${ORDER_ID}/slip`, {
          method: 'POST',
          headers: { 'x-forwarded-for': '10.9.9.9' },
          body: (() => {
            const form = new FormData()
            form.set('slip', png())
            return form
          })(),
        }),
        ctx(),
      )
    }

    for (let i = 0; i < 10; i += 1) {
      expect((await send()).status).toBe(200)
    }

    const blocked = await send()
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('Retry-After')).toBeTruthy()
  })
})
