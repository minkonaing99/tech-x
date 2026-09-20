import { describe, expect, it } from 'vitest'
import {
  cartSavings,
  cartSubtotal,
  discountPercent,
  effectiveUnitPrice,
  isOnSale,
  isValidSalePrice,
  lineTotal,
  type PricedLine,
} from './pricing'

function line(priceMmk: number, salePriceMmk: number | null, qty = 1): PricedLine {
  return { qty, product: { priceMmk, salePriceMmk } }
}

describe('isOnSale', () => {
  it('is false when no sale price is stored', () => {
    expect(isOnSale(100_000, null)).toBe(false)
  })

  it('is true only when the sale price is below the normal price', () => {
    expect(isOnSale(100_000, 90_000)).toBe(true)
  })

  it('is false when the sale price equals the normal price, which is not a discount', () => {
    expect(isOnSale(100_000, 100_000)).toBe(false)
  })

  it('is false when the stored sale price is above the normal price', () => {
    // The admin routes reject this, but the predicate is what the money path
    // trusts, so it must not treat a bad row as a sale.
    expect(isOnSale(100_000, 120_000)).toBe(false)
  })

  it('treats a free item as on sale', () => {
    expect(isOnSale(1, 0)).toBe(true)
  })
})

describe('effectiveUnitPrice', () => {
  it('is the normal price when nothing is on sale', () => {
    expect(effectiveUnitPrice(100_000, null)).toBe(100_000)
  })

  it('is the sale price when on sale', () => {
    expect(effectiveUnitPrice(100_000, 90_000)).toBe(90_000)
  })

  it('charges the normal price when the stored sale price is not below it', () => {
    // What the customer is shown and what they are charged come from the same
    // predicate, so a bad row can never charge more than the listed price.
    expect(effectiveUnitPrice(100_000, 120_000)).toBe(100_000)
    expect(effectiveUnitPrice(100_000, 100_000)).toBe(100_000)
  })
})

describe('discountPercent', () => {
  it('is zero when nothing is on sale', () => {
    expect(discountPercent(100_000, null)).toBe(0)
    expect(discountPercent(100_000, 100_000)).toBe(0)
  })

  it('reports a whole-number discount exactly', () => {
    expect(discountPercent(100_000, 80_000)).toBe(20)
  })

  it('rounds down so the badge never claims more than was given', () => {
    // 19.999%, not 20%.
    expect(discountPercent(100_000, 80_001)).toBe(19)
    // 10.09%.
    expect(discountPercent(545_000, 490_000)).toBe(10)
    // 20.08%.
    expect(discountPercent(249_000, 199_000)).toBe(20)
  })

  it('is zero for a zero-priced product rather than dividing by zero', () => {
    expect(discountPercent(0, 0)).toBe(0)
    expect(Number.isFinite(discountPercent(0, null))).toBe(true)
  })
})

describe('isValidSalePrice', () => {
  it('accepts null, which is how a product carries no sale', () => {
    expect(isValidSalePrice(100_000, null)).toBe(true)
  })

  it('accepts a sale price strictly below the normal price', () => {
    expect(isValidSalePrice(100_000, 99_999)).toBe(true)
  })

  it('accepts zero as a giveaway price', () => {
    expect(isValidSalePrice(100_000, 0)).toBe(true)
  })

  it('rejects a sale price equal to the normal price', () => {
    expect(isValidSalePrice(100_000, 100_000)).toBe(false)
  })

  it('rejects a sale price above the normal price', () => {
    expect(isValidSalePrice(100_000, 100_001)).toBe(false)
  })

  it('rejects a negative sale price', () => {
    expect(isValidSalePrice(100_000, -1)).toBe(false)
  })

  it('rejects any sale price on a zero-priced product', () => {
    expect(isValidSalePrice(0, 0)).toBe(false)
  })
})

describe('lineTotal', () => {
  it('multiplies the normal price by the quantity', () => {
    expect(lineTotal(line(100_000, null, 3))).toBe(300_000)
  })

  it('multiplies the sale price by the quantity', () => {
    expect(lineTotal(line(100_000, 90_000, 3))).toBe(270_000)
  })
})

describe('cartSubtotal', () => {
  it('is zero for an empty cart', () => {
    expect(cartSubtotal([])).toBe(0)
  })

  it('sums undiscounted lines', () => {
    expect(cartSubtotal([line(100_000, null, 2), line(50_000, null)])).toBe(250_000)
  })

  it('charges the sale price on discounted lines and the normal price on the rest', () => {
    expect(cartSubtotal([line(100_000, 90_000, 2), line(50_000, null)])).toBe(230_000)
  })
})

describe('cartSavings', () => {
  it('is zero for an empty cart', () => {
    expect(cartSavings([])).toBe(0)
  })

  it('is zero when nothing in the cart is discounted', () => {
    expect(cartSavings([line(100_000, null, 2)])).toBe(0)
  })

  it('counts only the discounted lines, multiplied by quantity', () => {
    expect(cartSavings([line(100_000, 90_000, 2), line(50_000, null, 4)])).toBe(20_000)
  })

  it('ignores a stored sale price that is not a discount', () => {
    expect(cartSavings([line(100_000, 120_000, 2)])).toBe(0)
  })

  it('always reconciles: subtotal plus savings equals the undiscounted total', () => {
    const lines = [line(100_000, 90_000, 2), line(50_000, null, 3), line(80_000, 60_000)]
    const listTotal = lines.reduce((sum, l) => sum + l.product.priceMmk * l.qty, 0)
    expect(cartSubtotal(lines) + cartSavings(lines)).toBe(listTotal)
  })
})
