// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWishlist } from './wishlist-store'

const LS_KEY = 'merxylab-wishlist'

/**
 * jsdom under Vitest 4 ships no `localStorage`, and the store reads it
 * directly. This is the whole of the surface it touches.
 */
function memoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
  }
}

function local(): string[] {
  const raw = window.localStorage.getItem(LS_KEY)
  return raw ? (JSON.parse(raw) as string[]) : []
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

/**
 * The list read back after a merge. A fresh Response per call - a body can
 * only be consumed once, and these tests answer two requests.
 */
const emptyList = () => jsonResponse({ data: [], error: null })

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
  useWishlist.setState({ ids: new Set(), authed: false, hydrated: false })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useWishlist.mergeOnLogin', () => {
  it('sends what was saved while signed out, then clears it', async () => {
    localStorage.setItem(LS_KEY, JSON.stringify(['keychron-k2-pro']))
    const spy = vi.fn(async (path: string) =>
      path.endsWith('/merge') ? jsonResponse({ data: { ok: true }, error: null }) : emptyList(),
    )
    vi.stubGlobal('fetch', spy)

    await useWishlist.getState().mergeOnLogin()

    expect(spy.mock.calls[0]?.[0]).toBe('/api/v1/wishlist/merge')
    expect(local()).toEqual([])
  })

  /*
   * `fetch` resolves for a 500 as happily as for a 200. Clearing regardless
   * means the server holds none of these and neither does the browser - the
   * visitor's saved list is simply gone.
   */
  it('keeps the local list when the server refuses the merge', async () => {
    localStorage.setItem(LS_KEY, JSON.stringify(['keychron-k2-pro']))
    vi.stubGlobal(
      'fetch',
      vi.fn(async (path: string) =>
        path.endsWith('/merge') ? jsonResponse({ data: null, error: {} }, 500) : emptyList(),
      ),
    )

    await useWishlist.getState().mergeOnLogin()

    expect(local()).toEqual(['keychron-k2-pro'])
  })

  it('keeps the local list when the request never lands', async () => {
    localStorage.setItem(LS_KEY, JSON.stringify(['keychron-k2-pro']))
    vi.stubGlobal(
      'fetch',
      vi.fn(async (path: string) => {
        if (path.endsWith('/merge')) throw new Error('offline')
        return emptyList()
      }),
    )

    await useWishlist.getState().mergeOnLogin()

    expect(local()).toEqual(['keychron-k2-pro'])
  })

  it('still reads the account list after a failed merge', async () => {
    localStorage.setItem(LS_KEY, JSON.stringify(['keychron-k2-pro']))
    const spy = vi.fn(async (path: string) => {
      if (path.endsWith('/merge')) throw new Error('offline')
      return jsonResponse({ data: [{ productId: 'premium-deskmat' }], error: null })
    })
    vi.stubGlobal('fetch', spy)

    await useWishlist.getState().mergeOnLogin()

    expect(useWishlist.getState().authed).toBe(true)
    expect([...useWishlist.getState().ids]).toEqual(['premium-deskmat'])
  })

  it('leaves nothing behind for the next person to sign in on this browser', () => {
    localStorage.setItem(LS_KEY, JSON.stringify(['keychron-k2-pro']))
    useWishlist.setState({ ids: new Set(['keychron-k2-pro']), authed: true, hydrated: true })

    useWishlist.getState().resetToGuest()

    expect(local()).toEqual([])
    expect([...useWishlist.getState().ids]).toEqual([])
    expect(useWishlist.getState().authed).toBe(false)
  })

  it('sends nothing when there is nothing saved locally', async () => {
    const spy = vi.fn<(path: string) => Promise<Response>>(async () => emptyList())
    vi.stubGlobal('fetch', spy)

    await useWishlist.getState().mergeOnLogin()

    expect(spy.mock.calls.map(([path]) => path)).not.toContain('/api/v1/wishlist/merge')
  })
})
