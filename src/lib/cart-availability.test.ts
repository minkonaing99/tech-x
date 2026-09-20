import { describe, expect, it } from 'vitest'
import {
  canOrderCart,
  lineProblem,
  problemCode,
  problemMessage,
  unorderableLines,
  type AvailabilityLine,
} from './cart-availability'

function line(qty: number, stockQty: number, isActive = true): AvailabilityLine {
  return {
    productId: 'keychron-k2-pro',
    qty,
    product: { stockQty, isActive },
  }
}

describe('lineProblem', () => {
  it('passes a line the shop can actually fill', () => {
    expect(lineProblem(line(2, 5))).toBeNull()
  })

  it('passes a line that takes the last of the stock', () => {
    expect(lineProblem(line(5, 5))).toBeNull()
  })

  it('calls out a product that has sold out', () => {
    expect(lineProblem(line(2, 0))).toEqual({ kind: 'out_of_stock' })
  })

  /*
   * The case the cart could never see before: enough left to be worth keeping,
   * but not enough for what was asked. The remaining count travels with the
   * reason so the fix can be offered as one button.
   */
  it('calls out a line that outruns the stock, and says what is left', () => {
    expect(lineProblem(line(5, 2))).toEqual({ kind: 'insufficient', available: 2 })
  })

  /*
   * `isActive` is checked when adding and nowhere afterwards, so a product
   * retired in /admin sat in existing carts and ordered fine.
   */
  it('calls out a product that has been retired', () => {
    expect(lineProblem(line(1, 10, false))).toEqual({ kind: 'unavailable' })
  })

  it('reports a retired product as retired even when it is also out of stock', () => {
    expect(lineProblem(line(1, 0, false))).toEqual({ kind: 'unavailable' })
  })

  it('treats negative stock as sold out rather than as a shortfall', () => {
    expect(lineProblem(line(1, -3))).toEqual({ kind: 'out_of_stock' })
  })
})

describe('unorderableLines', () => {
  it('finds nothing wrong with a cart that can be filled', () => {
    expect(unorderableLines([line(1, 5), line(2, 9)])).toEqual([])
  })

  /*
   * Every bad line, not the first. The order route used to return on the first
   * one, so a shopper with three dead lines fixed one, resubmitted, and met
   * the next.
   */
  it('reports every bad line, not just the first', () => {
    const lines = [
      { ...line(2, 0), productId: 'a' },
      { ...line(1, 5), productId: 'b' },
      { ...line(5, 2), productId: 'c' },
    ]

    expect(unorderableLines(lines)).toEqual([
      { productId: 'a', problem: { kind: 'out_of_stock' } },
      { productId: 'c', problem: { kind: 'insufficient', available: 2 } },
    ])
  })
})

describe('canOrderCart', () => {
  it('refuses an empty cart', () => {
    expect(canOrderCart([])).toBe(false)
  })

  it('allows a cart with nothing wrong', () => {
    expect(canOrderCart([line(1, 5)])).toBe(true)
  })

  it('refuses a cart with one bad line among good ones', () => {
    expect(canOrderCart([line(1, 5), line(4, 1), line(1, 2)])).toBe(false)
  })
})

describe('problemMessage', () => {
  it('says what is wrong in words a shopper can act on', () => {
    expect(problemMessage({ kind: 'out_of_stock' })).toBe('Out of stock')
    expect(problemMessage({ kind: 'unavailable' })).toBe('No longer available')
    expect(problemMessage({ kind: 'insufficient', available: 2 })).toBe('Only 2 left')
  })

  it('does not pluralise a single remaining unit', () => {
    expect(problemMessage({ kind: 'insufficient', available: 1 })).toBe('Only 1 left')
  })
})

describe('problemCode', () => {
  /*
   * The code is what a client branches on; the message is what a person reads.
   * The order route used to put `OUT_OF_STOCK:<id>` in the message field and
   * show it to the customer verbatim.
   */
  it('gives each reason its own code, separate from the wording', () => {
    expect(problemCode({ kind: 'out_of_stock' })).toBe('OUT_OF_STOCK')
    expect(problemCode({ kind: 'unavailable' })).toBe('UNAVAILABLE')
    expect(problemCode({ kind: 'insufficient', available: 2 })).toBe('INSUFFICIENT_STOCK')
  })

  it('carries no product id or count in the code', () => {
    expect(problemCode({ kind: 'insufficient', available: 7 })).not.toMatch(/7/)
  })
})
