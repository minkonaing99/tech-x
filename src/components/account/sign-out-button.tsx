'use client'

import { signOut } from 'next-auth/react'
import { useWishlist } from '@/lib/wishlist-store'

export function SignOutButton() {
  const resetToGuest = useWishlist((s) => s.resetToGuest)

  // The cart's guest cookie is dropped server-side in the NextAuth `signOut`
  // event. The wishlist lives in local storage, which only the browser can
  // reach, so it has to be cleared from here.
  function handle() {
    resetToGuest()
    return signOut({ callbackUrl: '/' })
  }

  return (
    <button
      onClick={handle}
      className="mt-2 rounded px-3 py-2 text-left text-[14px] text-muted hover:bg-line hover:text-error"
    >
      Sign out
    </button>
  )
}
