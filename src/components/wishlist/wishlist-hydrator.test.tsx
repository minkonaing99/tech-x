// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { WishlistHydrator } from './wishlist-hydrator'

type Status = 'loading' | 'authenticated' | 'unauthenticated'

const { fetchList, mergeOnLogin, useSession, state } = vi.hoisted(() => ({
  fetchList: vi.fn(),
  mergeOnLogin: vi.fn(),
  useSession: vi.fn<() => { status: Status }>(),
  state: { hydrated: false, authed: false },
}))

vi.mock('next-auth/react', () => ({ useSession }))

vi.mock('@/lib/wishlist-store', () => ({
  useWishlist: (select: (s: typeof state & { fetch: unknown; mergeOnLogin: unknown }) => unknown) =>
    select({ ...state, fetch: fetchList, mergeOnLogin }),
}))

function renderAt(status: Status) {
  useSession.mockReturnValue({ status })
  return render(<WishlistHydrator />)
}

beforeEach(() => {
  vi.clearAllMocks()
  state.hydrated = false
  state.authed = false
})

afterEach(() => {
  cleanup()
})

describe('WishlistHydrator', () => {
  it('waits for the session', () => {
    renderAt('loading')

    expect(fetchList).not.toHaveBeenCalled()
    expect(mergeOnLogin).not.toHaveBeenCalled()
  })

  it('reads local storage when the visitor is signed out', () => {
    renderAt('unauthenticated')

    expect(fetchList).toHaveBeenCalledWith(false)
    expect(mergeOnLogin).not.toHaveBeenCalled()
  })

  /*
   * The Google shape. The redirect reloads the page, so the store is fresh and
   * the session resolves straight to authenticated - there is no signed-out
   * render in between for a transition check to catch. Anything saved to local
   * storage before signing in has to be merged here or it is stranded.
   */
  it('merges local storage on a cold load that arrives already signed in', () => {
    renderAt('authenticated')

    expect(mergeOnLogin).toHaveBeenCalledOnce()
    expect(fetchList).not.toHaveBeenCalled()
  })

  it('merges when a signed-out visitor signs in without leaving the page', () => {
    state.hydrated = true
    state.authed = false
    const view = renderAt('unauthenticated')
    expect(mergeOnLogin).not.toHaveBeenCalled()

    useSession.mockReturnValue({ status: 'authenticated' })
    view.rerender(<WishlistHydrator />)

    expect(mergeOnLogin).toHaveBeenCalledOnce()
  })

  it('falls back to local storage on sign-out', () => {
    state.hydrated = true
    state.authed = true
    const view = renderAt('authenticated')

    useSession.mockReturnValue({ status: 'unauthenticated' })
    state.authed = true
    view.rerender(<WishlistHydrator />)

    expect(fetchList).toHaveBeenCalledWith(false)
  })

  it('does nothing on a rerender that changes nothing', () => {
    state.hydrated = true
    state.authed = true
    const view = renderAt('authenticated')
    vi.clearAllMocks()

    view.rerender(<WishlistHydrator />)
    view.rerender(<WishlistHydrator />)

    expect(fetchList).not.toHaveBeenCalled()
    expect(mergeOnLogin).not.toHaveBeenCalled()
  })
})
