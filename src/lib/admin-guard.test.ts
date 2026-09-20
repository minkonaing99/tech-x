import { beforeEach, describe, expect, it, vi } from 'vitest'

interface Session {
  user?: { id?: string; role?: 'customer' | 'admin' }
}

let session: Session | null = null
/** What the `users` row says right now, as opposed to what the token claims. */
let dbRole: 'customer' | 'admin' | null = null

vi.mock('./auth', () => ({ auth: async () => session }))
vi.mock('@/db', () => {
  // Drizzle's builder is both chainable and awaitable, so every step returns
  // the same object and that object is a thenable.
  const chain = {
    from: () => chain,
    where: () => chain,
    limit: () => chain,
    then: (resolve: (rows: unknown[]) => unknown) =>
      Promise.resolve(dbRole === null ? [] : [{ role: dbRole }]).then(resolve),
  }
  return { db: { select: () => chain } }
})

const { currentRole, isAdmin, requireAdmin } = await import('./admin-guard')

describe('requireAdmin', () => {
  beforeEach(() => {
    session = null
    dbRole = null
  })

  it('refuses an anonymous caller with 401', async () => {
    const denied = await requireAdmin()
    expect(denied?.status).toBe(401)
  })

  it('refuses a signed-in customer with 403', async () => {
    session = { user: { id: 'u1', role: 'customer' } }
    dbRole = 'customer'
    const denied = await requireAdmin()
    expect(denied?.status).toBe(403)
  })

  it('admits an admin', async () => {
    session = { user: { id: 'u1', role: 'admin' } }
    dbRole = 'admin'
    expect(await requireAdmin()).toBeNull()
  })

  it('refuses a token still claiming admin after the role was revoked in the database', async () => {
    // The role is stamped into the JWT at sign-in and the token lives 30 days.
    // Trusting the claim means a demoted admin keeps admin access until it
    // expires, so the row is what decides.
    session = { user: { id: 'u1', role: 'admin' } }
    dbRole = 'customer'

    const denied = await requireAdmin()
    expect(denied?.status).toBe(403)
    expect(await isAdmin()).toBe(false)
  })

  it('honours a promotion the token predates', async () => {
    session = { user: { id: 'u1', role: 'customer' } }
    dbRole = 'admin'
    expect(await requireAdmin()).toBeNull()
  })

  it('refuses a session whose user row no longer exists', async () => {
    session = { user: { id: 'deleted', role: 'admin' } }
    dbRole = null

    const denied = await requireAdmin()
    expect(denied?.status).toBe(401)
    expect(await currentRole()).toBeNull()
  })
})
