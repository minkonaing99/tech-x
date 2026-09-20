import type { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema/auth'
import { auth } from './auth'
import { fail } from './api-response'

export type Role = 'customer' | 'admin'

/**
 * The caller's role as the database holds it now, or null when nobody is signed
 * in.
 *
 * Deliberately not `session.user.role`: the role is stamped into the JWT at
 * sign-in and the token lives for 30 days (`session.maxAge` in ./auth), so
 * demoting an admin would leave their existing token asserting `admin` until it
 * expired. One lookup on the primary key, only on the admin surfaces, is worth
 * having revocation take effect on the next request.
 *
 * A session with no matching row - a deleted account whose token outlived it -
 * reads as signed out.
 */
export async function currentRole(): Promise<{ userId: string; role: Role } | null> {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return null

  const [row] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  if (!row) return null

  return { userId, role: row.role }
}

/** True when the caller is an admin according to the database. */
export async function isAdmin(): Promise<boolean> {
  return (await currentRole())?.role === 'admin'
}

/** The refusal response when the caller is not an admin, or null when they are. */
export async function requireAdmin(): Promise<NextResponse | null> {
  const actor = await currentRole()
  if (!actor) return fail('UNAUTHENTICATED', 'Sign in required.', 401)
  if (actor.role !== 'admin') return fail('FORBIDDEN', 'Admin only.', 403)
  return null
}
