'use client'

import { create } from 'zustand'
import { api } from './api-client'

export interface CartLine {
  productId: string
  qty: number
  product: {
    id: string
    slug: string
    name: string
    tagline: string
    priceMmk: number
    salePriceMmk: number | null
    swatch: string
    hasPhotos: boolean
    stockQty: number
    isActive: boolean
  }
}

/**
 * What `add` tells the caller. The button turns this straight into a toast, so
 * a failed add reads as a failure instead of a confirmation the cart contradicts.
 */
export type AddResult = { ok: true } | { ok: false; message: string }

interface CartStore {
  items: CartLine[]
  subtotal: number
  isOpen: boolean
  hydrated: boolean
  fetch: () => Promise<void>
  add: (productId: string, qty?: number) => Promise<AddResult>
  setQty: (productId: string, qty: number) => Promise<void>
  remove: (productId: string) => Promise<void>
  merge: () => Promise<void>
  open: () => void
  close: () => void
  toggle: () => void
}

interface CartPayload {
  items: CartLine[]
  subtotal: number
}

function call(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
) {
  return api<CartPayload>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export const useCart = create<CartStore>((set, get) => ({
  items: [],
  subtotal: 0,
  isOpen: false,
  hydrated: false,

  async fetch() {
    const res = await call('GET', '/api/v1/cart')
    if (res.data) set({ items: res.data.items, subtotal: res.data.subtotal, hydrated: true })
    else set({ hydrated: true })
  },

  /**
   * The catalog is cached but the route reads stock live, so a product can be
   * sold out between render and click. Report that rather than swallowing it -
   * the caller is the only thing standing between a 409 and a false "Added".
   */
  async add(productId, qty = 1) {
    const res = await call('POST', '/api/v1/cart/items', { productId, qty })
    if (res.data) {
      set({ items: res.data.items, subtotal: res.data.subtotal })
      return { ok: true }
    }
    await get().fetch()
    return { ok: false, message: res.error?.message ?? 'Could not add that. Try again.' }
  },

  async setQty(productId, qty) {
    const res = await call('PATCH', `/api/v1/cart/items/${encodeURIComponent(productId)}`, { qty })
    if (res.data) set({ items: res.data.items, subtotal: res.data.subtotal })
    else await get().fetch()
  },

  async remove(productId) {
    const res = await call('DELETE', `/api/v1/cart/items/${encodeURIComponent(productId)}`)
    if (res.data) set({ items: res.data.items, subtotal: res.data.subtotal })
    else await get().fetch()
  },

  async merge() {
    const res = await call('POST', '/api/v1/cart/merge')
    if (res.data) set({ items: res.data.items, subtotal: res.data.subtotal })
    else await get().fetch()
  },

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}))

export function useCartCount(): number {
  return useCart((s) => s.items.reduce((sum, i) => sum + i.qty, 0))
}

export function useCartSubtotal(): number {
  return useCart((s) => s.subtotal)
}
