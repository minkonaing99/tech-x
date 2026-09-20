'use client'

import { create } from 'zustand'
import { api } from './api-client'

const LS_KEY = 'merxylab-wishlist'

function loadLocal(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((s) => typeof s === 'string')
  } catch {
    return []
  }
}

function saveLocal(ids: string[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(ids))
  } catch {
    // ignore quota
  }
}

interface WishlistStore {
  ids: Set<string>
  authed: boolean
  hydrated: boolean
  fetch: (authed: boolean) => Promise<void>
  add: (productId: string) => Promise<void>
  remove: (productId: string) => Promise<void>
  has: (productId: string) => boolean
  mergeOnLogin: () => Promise<void>
  resetToGuest: () => void
}

export const useWishlist = create<WishlistStore>((set, get) => ({
  ids: new Set(),
  authed: false,
  hydrated: false,

  async fetch(authed) {
    if (authed) {
      const res = await api<{ productId: string }[]>('/api/v1/wishlist')
      if (res.ok) {
        set({
          ids: new Set(res.data?.map((r) => r.productId) ?? []),
          authed: true,
          hydrated: true,
        })
        return
      }
    }
    set({ ids: new Set(loadLocal()), authed: false, hydrated: true })
  },

  async add(productId) {
    const next = new Set(get().ids)
    next.add(productId)
    set({ ids: next })
    if (get().authed) {
      await api(`/api/v1/wishlist/${encodeURIComponent(productId)}`, { method: 'POST' })
    } else {
      saveLocal([...next])
    }
  },

  async remove(productId) {
    const next = new Set(get().ids)
    next.delete(productId)
    set({ ids: next })
    if (get().authed) {
      await api(`/api/v1/wishlist/${encodeURIComponent(productId)}`, { method: 'DELETE' })
    } else {
      saveLocal([...next])
    }
  },

  has(productId) {
    return get().ids.has(productId)
  },

  /**
   * Clearing is conditional on the server having taken them. `fetch` resolves
   * just as happily for a 500 as for a 200, so clearing unconditionally means
   * a refused merge leaves the list held by nobody - not the account, not the
   * browser. A failure here keeps what was saved and reads the account list
   * anyway, so a bad merge costs a stale view rather than the list itself.
   */
  async mergeOnLogin() {
    const local = loadLocal()
    if (local.length > 0) {
      // `api` swallows the network error itself and reports `ok: false`, so a
      // refused merge leaves the local list alone - the try/catch this
      // replaced existed for exactly that.
      const res = await api('/api/v1/wishlist/merge', {
        method: 'POST',
        body: JSON.stringify({ productIds: local }),
      })
      if (res.ok) saveLocal([])
    }
    await get().fetch(true)
  },

  /**
   * Signing out has to take the local list with it. It is keyed to the browser,
   * not to anyone, so anything left here is merged into whichever account signs
   * in next - the departing user's saved items would follow the next person
   * into their wishlist.
   */
  resetToGuest() {
    saveLocal([])
    set({ ids: new Set(), authed: false, hydrated: false })
  },
}))
