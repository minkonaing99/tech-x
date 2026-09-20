// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { AddResult } from '@/lib/cart-store'
import type { Product } from '@/lib/types'
import { ProductCard } from './card'

const { add, open, toast } = vi.hoisted(() => ({
  add: vi.fn(),
  open: vi.fn(),
  toast: Object.assign(vi.fn(), { error: vi.fn() }),
}))

vi.mock('@/lib/cart-store', () => ({
  useCart: (select: (s: { add: unknown; open: unknown }) => unknown) => select({ add, open }),
}))

vi.mock('sonner', () => ({ toast }))

const PRODUCT: Product = {
  id: 'vxe-dragonfly-r1-se',
  slug: 'vxe-dragonfly-r1-se',
  name: 'VXE Dragonfly R1 SE+',
  category: 'mice',
  price: 130_000,
  salePrice: null,
  tagline: 'Light where it counts.',
  description: 'A featherweight wireless mouse.',
  specs: [],
  swatch: '#111111',
  inStock: true,
  hasPhotos: false,
  stockQty: 4,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

function quickAdd(): HTMLButtonElement {
  return screen.getByRole('button', { name: /add vxe dragonfly r1 se\+ to cart/i })
}

/**
 * The card animates itself in with `whileInView`, and framer-motion reaches
 * for an IntersectionObserver the moment it mounts. jsdom has none. Nothing
 * here asserts on the entrance, so an inert stub is enough.
 */
class NoopIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('IntersectionObserver', NoopIntersectionObserver)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('ProductCard quick add', () => {
  it('adds without leaving the grid', async () => {
    add.mockResolvedValue({ ok: true } satisfies AddResult)
    render(<ProductCard product={PRODUCT} />)

    fireEvent.click(quickAdd())

    await waitFor(() => expect(toast).toHaveBeenCalledOnce())
    expect(add).toHaveBeenCalledWith('vxe-dragonfly-r1-se', 1)
    expect(toast).toHaveBeenCalledWith(
      'Added - VXE Dragonfly R1 SE+',
      expect.objectContaining({ action: expect.objectContaining({ label: 'View cart' }) }),
    )
    // The whole card is a link to the product page - a quick add must not
    // navigate away from the grid the shopper is working through.
    expect(open).not.toHaveBeenCalled()
  })

  it('opens the drawer only when the toast action is taken', async () => {
    add.mockResolvedValue({ ok: true } satisfies AddResult)
    render(<ProductCard product={PRODUCT} />)

    fireEvent.click(quickAdd())
    await waitFor(() => expect(toast).toHaveBeenCalledOnce())

    const [, options] = toast.mock.calls[0] as [string, { action: { onClick: () => void } }]
    options.action.onClick()

    expect(open).toHaveBeenCalledOnce()
  })

  it('reports the server reason instead of a false confirmation', async () => {
    add.mockResolvedValue({ ok: false, message: 'Out of stock.' } satisfies AddResult)
    render(<ProductCard product={PRODUCT} />)

    fireEvent.click(quickAdd())

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Out of stock.'))
    expect(toast).not.toHaveBeenCalled()
  })

  it('collapses a burst of clicks into one add', async () => {
    const d = deferred<AddResult>()
    add.mockReturnValue(d.promise)
    render(<ProductCard product={PRODUCT} />)

    fireEvent.click(quickAdd())
    await waitFor(() => expect(quickAdd().disabled).toBe(true))
    fireEvent.click(quickAdd())
    fireEvent.click(quickAdd())

    expect(add).toHaveBeenCalledOnce()

    d.resolve({ ok: true })
    await waitFor(() => expect(quickAdd().disabled).toBe(false))
  })

  it('refuses the add when stock has run out', () => {
    render(<ProductCard product={{ ...PRODUCT, stockQty: 0, inStock: false }} />)

    const out = screen.getByRole('button', { name: /out of stock/i }) as HTMLButtonElement
    expect(out.disabled).toBe(true)

    fireEvent.click(out)

    expect(add).not.toHaveBeenCalled()
    expect(toast).not.toHaveBeenCalled()
  })
})
