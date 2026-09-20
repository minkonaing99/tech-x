'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useCart } from '@/lib/cart-store'

export function CartHydrator() {
  const session = useSession()
  const status = session.status
  const fetchCart = useCart((s) => s.fetch)

  /*
   * Keyed on the session, not on mount alone. Signing in merges the guest cart
   * into the user's server-side, and signing out hands the browser back to a
   * cookie cart - both leave the store holding somebody else's basket until it
   * reads again.
   *
   * Waiting out `loading` costs a round trip on every page load, because
   * AuthProvider hands SessionProvider no initial session and so every load
   * starts there. Reading first and again on resolve would trade that for two
   * cart fetches on every load instead. The way out of the trade is to seed
   * SessionProvider with the server's session, which is a change to
   * AuthProvider, not to this file.
   */
  useEffect(() => {
    if (status === 'loading') return
    fetchCart()
  }, [status, fetchCart])

  return null
}
