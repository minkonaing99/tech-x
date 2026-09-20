import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ADDRESS_LOCKED_MESSAGE } from '@/lib/address-lock'

const ADDRESS_ID = '3aa6e85b-1c2d-4e5f-8a9b-0c1d2e3f4a5b'

interface Session {
  user?: { id?: string }
}

let session: Session | null = null
/** A confirmed order pointing at this address freezes it. */
let lockingOrder: { id: string }[] = []

const updates: unknown[] = []
const deletes = vi.fn()

vi.mock('@/lib/auth', () => ({ auth: async () => session }))

vi.mock('@/db', () => {
  // Drizzle's builder is both chainable and awaitable, so every step returns the
  // same object and that object is a thenable.
  function chain(result: unknown, onWhere?: () => void) {
    const c: Record<string, unknown> = {
      from: () => c,
      limit: () => c,
      set: (patch: unknown) => {
        updates.push(patch)
        return c
      },
      where: () => {
        onWhere?.()
        return c
      },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
    }
    return c
  }
  return {
    db: {
      select: () => chain(lockingOrder),
      update: () => chain({ affectedRows: 1 }),
      delete: () => chain({ affectedRows: 1 }, () => deletes()),
    },
  }
})

const { DELETE, PATCH } = await import('./route')

function ctx(id: string = ADDRESS_ID) {
  return { params: Promise.resolve({ id }) }
}

function patch(body: unknown): Request {
  return new Request(`http://localhost/api/v1/addresses/${ADDRESS_ID}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function del(): Request {
  return new Request(`http://localhost/api/v1/addresses/${ADDRESS_ID}`, { method: 'DELETE' })
}

beforeEach(() => {
  session = { user: { id: 'u1' } }
  lockingOrder = []
  updates.length = 0
  deletes.mockClear()
})

describe('PATCH /api/v1/addresses/[id]', () => {
  it('refuses an anonymous caller', async () => {
    session = null
    expect((await PATCH(patch({ label: 'Home' }), ctx())).status).toBe(401)
  })

  it('refuses an id that is not a uuid', async () => {
    expect((await PATCH(patch({ label: 'Home' }), ctx('../../users'))).status).toBe(400)
  })

  it('applies a partial edit', async () => {
    const res = await PATCH(patch({ label: 'Office' }), ctx())
    expect(res.status).toBe(200)
    expect(updates[0]).toEqual({ label: 'Office' })
  })

  it('refuses an edit while a confirmed order is relying on the address', async () => {
    // The parcel is already with a courier working from this address, so the
    // address book must not be allowed to disagree with it.
    lockingOrder = [{ id: 'order-1' }]

    const res = await PATCH(patch({ street: '99 New Road' }), ctx())
    expect(res.status).toBe(409)
    const body = (await res.json()) as { error: { message: string } }
    expect(body.error.message).toBe(ADDRESS_LOCKED_MESSAGE)
    expect(updates).toHaveLength(0)
  })

  it('refuses a phone that is not a Myanmar mobile number', async () => {
    for (const phone of ['+1555551234', '09123456789', '+959']) {
      expect((await PATCH(patch({ phone }), ctx())).status).toBe(400)
    }
    expect(updates).toHaveLength(0)
  })

  it('refuses a telegram handle that is not a handle', async () => {
    const res = await PATCH(patch({ telegramUsername: 'no spaces allowed' }), ctx())
    expect(res.status).toBe(400)
  })

  it('normalises a pasted telegram link down to the handle', async () => {
    await PATCH(patch({ telegramUsername: 'https://t.me/aungaung' }), ctx())
    expect(updates[0]).toEqual({ telegramUsername: 'aungaung' })
  })

  it('stores a cleared optional field as null rather than an empty string', async () => {
    // The form sends '' for an untouched field; keeping that as a value would
    // make "no handle" and "blank handle" two different states.
    await PATCH(patch({ telegramUsername: '', mapsUrl: '' }), ctx())
    expect(updates[0]).toEqual({ telegramUsername: null, mapsUrl: null })
  })

  it('refuses a link that is not a Google Maps link', async () => {
    const res = await PATCH(patch({ mapsUrl: 'https://evil.example/track' }), ctx())
    expect(res.status).toBe(400)
  })

  it('refuses a malformed body without throwing', async () => {
    const res = await PATCH(
      new Request(`http://localhost/api/v1/addresses/${ADDRESS_ID}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: 'not json',
      }),
      ctx(),
    )
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/v1/addresses/[id]', () => {
  it('refuses an anonymous caller', async () => {
    session = null
    expect((await DELETE(del(), ctx())).status).toBe(401)
  })

  it('refuses an id that is not a uuid', async () => {
    expect((await DELETE(del(), ctx('not-a-uuid'))).status).toBe(400)
  })

  it('deletes an address no live order depends on', async () => {
    const res = await DELETE(del(), ctx())
    expect(res.status).toBe(200)
    expect(deletes).toHaveBeenCalledOnce()
  })

  it('refuses to delete an address a confirmed order points at', async () => {
    // Deleting it would blank the foreign key on a live delivery.
    lockingOrder = [{ id: 'order-1' }]

    const res = await DELETE(del(), ctx())
    expect(res.status).toBe(409)
    expect(deletes).not.toHaveBeenCalled()
  })
})
