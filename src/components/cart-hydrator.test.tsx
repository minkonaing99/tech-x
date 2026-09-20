// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { CartHydrator } from './cart-hydrator'

type Status = 'loading' | 'authenticated' | 'unauthenticated'

const { fetchCart, useSession } = vi.hoisted(() => ({
  fetchCart: vi.fn(),
  useSession: vi.fn<() => { status: Status }>(),
}))

vi.mock('next-auth/react', () => ({ useSession }))

vi.mock('@/lib/cart-store', () => ({
  useCart: (select: (s: { fetch: unknown }) => unknown) => select({ fetch: fetchCart }),
}))

function renderAt(status: Status) {
  useSession.mockReturnValue({ status })
  return render(<CartHydrator />)
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

describe('CartHydrator', () => {
  it('waits for the session before asking whose cart it wants', () => {
    renderAt('loading')

    expect(fetchCart).not.toHaveBeenCalled()
  })

  it('reads the cart once the session resolves signed out', () => {
    renderAt('unauthenticated')

    expect(fetchCart).toHaveBeenCalledOnce()
  })

  it('reads the cart once the session resolves signed in', () => {
    renderAt('authenticated')

    expect(fetchCart).toHaveBeenCalledOnce()
  })

  /*
   * The guest cart is merged into the user's server-side on the sign-in event.
   * The store still holds the pre-merge guest cart, so without this the shopper
   * signs in and watches their basket go stale or empty.
   */
  it('rereads the cart after signing in, to pick up the merged basket', () => {
    const view = renderAt('loading')
    expect(fetchCart).not.toHaveBeenCalled()

    useSession.mockReturnValue({ status: 'unauthenticated' })
    view.rerender(<CartHydrator />)
    expect(fetchCart).toHaveBeenCalledTimes(1)

    useSession.mockReturnValue({ status: 'authenticated' })
    view.rerender(<CartHydrator />)
    expect(fetchCart).toHaveBeenCalledTimes(2)
  })

  it('rereads the cart after signing out, so the last user’s items do not linger', () => {
    const view = renderAt('authenticated')
    expect(fetchCart).toHaveBeenCalledTimes(1)

    useSession.mockReturnValue({ status: 'unauthenticated' })
    view.rerender(<CartHydrator />)

    expect(fetchCart).toHaveBeenCalledTimes(2)
  })

  /*
   * The shape of a Google sign-in landing back on the site: the page is new, so
   * SessionProvider starts at `loading` and resolves straight to `authenticated`
   * with no signed-out step in between. This is the case the original bug hid
   * in - there is no unauthed-to-authed transition here to watch for.
   */
  it('reads the cart on a cold load that resolves straight to signed in', () => {
    const view = renderAt('loading')

    useSession.mockReturnValue({ status: 'authenticated' })
    view.rerender(<CartHydrator />)

    expect(fetchCart).toHaveBeenCalledOnce()
  })

  it('does not refetch on a rerender that changes nothing', () => {
    const view = renderAt('authenticated')
    expect(fetchCart).toHaveBeenCalledTimes(1)

    view.rerender(<CartHydrator />)
    view.rerender(<CartHydrator />)

    expect(fetchCart).toHaveBeenCalledTimes(1)
  })
})
