// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { AddResult } from '@/lib/cart-store'
import { AddToCartButton } from './add-to-cart-button'

const { add, open, toast } = vi.hoisted(() => ({
  add: vi.fn(),
  open: vi.fn(),
  toast: Object.assign(vi.fn(), { error: vi.fn() }),
}))

vi.mock('@/lib/cart-store', () => ({
  useCart: (select: (s: { add: unknown; open: unknown }) => unknown) => select({ add, open }),
}))

vi.mock('sonner', () => ({ toast }))

/** A promise the test resolves by hand, so "still in flight" is observable. */
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

function button(): HTMLButtonElement {
  return screen.getByRole('button')
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

describe('AddToCartButton', () => {
  it('names the product and offers the cart once the server agrees', async () => {
    add.mockResolvedValue({ ok: true } satisfies AddResult)
    render(<AddToCartButton productId="vxe-r1" productName="VXE Dragonfly R1 SE+" />)

    fireEvent.click(button())

    await waitFor(() => expect(toast).toHaveBeenCalledOnce())
    expect(add).toHaveBeenCalledWith('vxe-r1', 1)
    expect(toast).toHaveBeenCalledWith(
      'Added - VXE Dragonfly R1 SE+',
      expect.objectContaining({ action: expect.objectContaining({ label: 'View cart' }) }),
    )
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('opens the drawer from the toast action rather than on the add itself', async () => {
    add.mockResolvedValue({ ok: true } satisfies AddResult)
    render(<AddToCartButton productId="vxe-r1" productName="VXE Dragonfly R1 SE+" />)

    fireEvent.click(button())
    await waitFor(() => expect(toast).toHaveBeenCalledOnce())

    expect(open).not.toHaveBeenCalled()

    const [, options] = toast.mock.calls[0] as [string, { action: { onClick: () => void } }]
    options.action.onClick()

    expect(open).toHaveBeenCalledOnce()
  })

  it('reports the server reason instead of claiming the add worked', async () => {
    add.mockResolvedValue({ ok: false, message: 'Out of stock.' } satisfies AddResult)
    render(<AddToCartButton productId="vxe-r1" productName="VXE Dragonfly R1 SE+" />)

    fireEvent.click(button())

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Out of stock.'))
    expect(toast).not.toHaveBeenCalled()
  })

  it('shuts the button while the request is in flight', async () => {
    const d = deferred<AddResult>()
    add.mockReturnValue(d.promise)
    render(<AddToCartButton productId="vxe-r1" productName="VXE Dragonfly R1 SE+" />)

    fireEvent.click(button())

    await waitFor(() => expect(button().disabled).toBe(true))
    expect(button().getAttribute('aria-busy')).toBe('true')

    d.resolve({ ok: true })
    await waitFor(() => expect(button().disabled).toBe(false))
  })

  it('reopens the button after a failure so the shopper can retry', async () => {
    const d = deferred<AddResult>()
    add.mockReturnValue(d.promise)
    render(<AddToCartButton productId="vxe-r1" productName="VXE Dragonfly R1 SE+" />)

    fireEvent.click(button())
    await waitFor(() => expect(button().disabled).toBe(true))

    d.resolve({ ok: false, message: 'Out of stock.' })

    await waitFor(() => expect(button().disabled).toBe(false))
  })

  it('does not fire a second add while the first is still going', async () => {
    const d = deferred<AddResult>()
    add.mockReturnValue(d.promise)
    render(<AddToCartButton productId="vxe-r1" productName="VXE Dragonfly R1 SE+" />)

    fireEvent.click(button())
    await waitFor(() => expect(button().disabled).toBe(true))
    fireEvent.click(button())
    fireEvent.click(button())

    expect(add).toHaveBeenCalledOnce()

    d.resolve({ ok: true })
    await waitFor(() => expect(toast).toHaveBeenCalledOnce())
  })

  it('says out of stock and stays inert', () => {
    render(<AddToCartButton productId="vxe-r1" productName="VXE Dragonfly R1 SE+" disabled />)

    expect(screen.getByText('Out of stock')).toBeTruthy()
    expect(button().disabled).toBe(true)

    fireEvent.click(button())

    expect(add).not.toHaveBeenCalled()
    expect(toast).not.toHaveBeenCalled()
  })
})
