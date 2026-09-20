'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useWishlist } from '@/lib/wishlist-store'

export function WishlistHydrator() {
  const session = useSession()
  const fetchList = useWishlist((s) => s.fetch)
  const mergeOnLogin = useWishlist((s) => s.mergeOnLogin)
  const hydrated = useWishlist((s) => s.hydrated)
  const wasAuthed = useWishlist((s) => s.authed)

  useEffect(() => {
    const authed = session.status === 'authenticated'
    if (session.status === 'loading') return
    if (!hydrated) {
      /*
       * A cold load that is already signed in is what a Google sign-in looks
       * like from here - the redirect reloads the page, so there is no
       * signed-out render left to notice a transition against. Merge rather
       * than read, or anything saved before signing in stays stranded in local
       * storage. `mergeOnLogin` skips the write when there is nothing local
       * and reads either way, so this is safe on every load.
       */
      if (authed) mergeOnLogin()
      else fetchList(false)
      return
    }
    if (authed && !wasAuthed) {
      mergeOnLogin()
    } else if (!authed && wasAuthed) {
      fetchList(false)
    }
  }, [session.status, hydrated, wasAuthed, fetchList, mergeOnLogin])

  return null
}
