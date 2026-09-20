import { describe, expect, it } from 'vitest'
import { isLowStock, rankForShowcase } from './merchandising'
import type { Product } from './types'

function product(name: string, over: Partial<Product> = {}): Product {
  return {
    id: name,
    slug: name,
    name,
    category: 'mice',
    price: 100_000,
    salePrice: null,
    tagline: '',
    description: '',
    specs: [],
    swatch: '#000',
    inStock: true,
    hasPhotos: false,
    stockQty: 10,
    lowStockThreshold: 3,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

const names = (list: readonly Product[]) => list.map((p) => p.name)

describe('isLowStock', () => {
  it('is true at or below the product threshold', () => {
    expect(isLowStock(product('a', { stockQty: 3, lowStockThreshold: 3 }))).toBe(true)
    expect(isLowStock(product('a', { stockQty: 1, lowStockThreshold: 3 }))).toBe(true)
  })

  it('is false above the threshold', () => {
    expect(isLowStock(product('a', { stockQty: 4, lowStockThreshold: 3 }))).toBe(false)
  })

  it('is false when sold out, which is a different state', () => {
    expect(isLowStock(product('a', { stockQty: 0 }))).toBe(false)
  })

  it('defaults the threshold to 3 when the product does not set one', () => {
    expect(isLowStock(product('a', { stockQty: 3, lowStockThreshold: undefined }))).toBe(true)
    expect(isLowStock(product('a', { stockQty: 4, lowStockThreshold: undefined }))).toBe(false)
  })

  it('falls back to the card fallback when stockQty is absent', () => {
    expect(isLowStock(product('a', { stockQty: undefined, inStock: true }))).toBe(false)
    expect(isLowStock(product('a', { stockQty: undefined, inStock: false }))).toBe(false)
  })
})

describe('rankForShowcase', () => {
  it('returns an empty list for no products', () => {
    expect(rankForShowcase([])).toEqual([])
  })

  it('does not mutate its input', () => {
    const input = [product('b'), product('a')]
    const before = names(input)
    rankForShowcase(input)
    expect(names(input)).toEqual(before)
  })

  it('puts sale items first, then low stock, then the rest', () => {
    const plain = product('plain')
    const low = product('low', { stockQty: 2 })
    const sale = product('sale', { salePrice: 90_000 })
    expect(names(rankForShowcase([plain, low, sale]))).toEqual(['sale', 'low', 'plain'])
  })

  it('orders sale items by deepest discount first', () => {
    const small = product('small', { salePrice: 90_000 })
    const big = product('big', { salePrice: 40_000 })
    const mid = product('mid', { salePrice: 70_000 })
    expect(names(rankForShowcase([small, big, mid]))).toEqual(['big', 'mid', 'small'])
  })

  it('keeps a low-stock sale item in the sale tier, ranked by discount', () => {
    const deep = product('deep', { salePrice: 40_000, stockQty: 10 })
    const scarce = product('scarce', { salePrice: 95_000, stockQty: 1 })
    expect(names(rankForShowcase([scarce, deep]))).toEqual(['deep', 'scarce'])
  })

  it('orders low-stock items by fewest units left', () => {
    const two = product('two', { stockQty: 2 })
    const one = product('one', { stockQty: 1 })
    const three = product('three', { stockQty: 3 })
    expect(names(rankForShowcase([two, three, one]))).toEqual(['one', 'two', 'three'])
  })

  it('drops sold-out products entirely', () => {
    const gone = product('gone', { stockQty: 0, inStock: false, salePrice: 10_000 })
    const here = product('here')
    expect(names(rankForShowcase([gone, here]))).toEqual(['here'])
  })

  it('breaks ties on featured, then sortOrder, then name', () => {
    const plain = product('plain', { sortOrder: 1 })
    const starred = product('starred', { featured: true, sortOrder: 9 })
    expect(names(rankForShowcase([plain, starred]))).toEqual(['starred', 'plain'])

    const second = product('second', { sortOrder: 2 })
    const first = product('first', { sortOrder: 1 })
    expect(names(rankForShowcase([second, first]))).toEqual(['first', 'second'])

    const bravo = product('bravo')
    const alpha = product('alpha')
    expect(names(rankForShowcase([bravo, alpha]))).toEqual(['alpha', 'bravo'])
  })

  it('applies the tiebreak inside the sale tier for equal discounts', () => {
    const plain = product('plain', { salePrice: 90_000, stockQty: 1 })
    const starred = product('starred', { salePrice: 90_000, featured: true, stockQty: 10 })
    expect(names(rankForShowcase([plain, starred]))).toEqual(['starred', 'plain'])
  })

  it('treats a missing sortOrder as 0 rather than dropping the product', () => {
    const none = product('none', { sortOrder: undefined })
    const later = product('later', { sortOrder: 5 })
    expect(names(rankForShowcase([later, none]))).toEqual(['none', 'later'])
  })
})
