import { NextResponse } from 'next/server'
import { fail, ok } from '@/lib/api-response'
import { mergeGuestCartToUser, getCartLines } from '@/lib/cart-session'
import { cartSubtotal } from '@/lib/pricing'
import { auth } from '@/lib/auth'

/**
 * No longer on the sign-in path. The merge now runs in the NextAuth `signIn`
 * event, which is the only place that catches every provider - the client call
 * this route used to serve sat after `await signIn()` in the password form and
 * never ran for Google, which is the bug that moved it.
 *
 * Kept deliberately. It is idempotent (`mergeGuestCartToUser` returns early
 * when there is no guest cart), so it stays available as a manual retry if a
 * merge is ever reported as failed, and `subtotal-parity.test.ts` uses it as
 * one of the money surfaces that have to agree on a single subtotal.
 */
export async function POST(): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return fail('UNAUTHENTICATED', 'Sign in required.', 401)
  }

  await mergeGuestCartToUser(session.user.id)
  const lines = await getCartLines()
  const subtotal = cartSubtotal(lines)
  return ok({ items: lines, subtotal })
}
