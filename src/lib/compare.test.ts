import { describe, expect, it } from 'vitest'
import { compareRows, isComparablePair } from './compare'
import type { Product, Spec } from './types'

function product(over: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    slug: 'p1',
    name: 'Product One',
    category: 'mice',
    price: 100_000,
    salePrice: null,
    tagline: 'A mouse.',
    description: 'A mouse, described.',
    specs: [],
    swatch: '#1C1B19',
    inStock: true,
    hasPhotos: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

function specs(...pairs: [string, string][]): readonly Spec[] {
  return pairs.map(([label, value]) => ({ label, value }))
}

describe('compareRows', () => {
  it('renders a label both products carry as one row with both values', () => {
    const rows = compareRows(specs(['Sensor', 'HERO 2']), specs(['Sensor', 'PAW3395']))
    expect(rows).toEqual([{ label: 'Sensor', a: 'HERO 2', b: 'PAW3395' }])
  })

  it("keeps A's order and appends B-only labels after it", () => {
    const rows = compareRows(
      specs(['Sensor', 'HERO 2'], ['Weight', '< 60 g'], ['Battery', '95 hours']),
      specs(['Weight', '54 g'], ['Polling rate', '8000 Hz'], ['Sensor', 'PAW3395']),
    )
    expect(rows.map((r) => r.label)).toEqual([
      'Sensor',
      'Weight',
      'Battery',
      'Polling rate',
    ])
  })

  it('leaves the side that lacks a label null rather than blank', () => {
    const rows = compareRows(specs(['Battery', '95 hours']), specs(['Polling rate', '8000 Hz']))
    expect(rows).toEqual([
      { label: 'Battery', a: '95 hours', b: null },
      { label: 'Polling rate', a: null, b: '8000 Hz' },
    ])
  })

  it('handles a product with no specs at all', () => {
    expect(compareRows([], specs(['Size', '900 x 400 mm']))).toEqual([
      { label: 'Size', a: null, b: '900 x 400 mm' },
    ])
    expect(compareRows([], [])).toEqual([])
  })

  it('collapses a label repeated on one product to its first value', () => {
    // Nothing stops an admin adding `Weight` twice. Two rows with the same
    // label would collide as React keys and read as a contradiction.
    const rows = compareRows(specs(['Weight', '< 60 g'], ['Weight', '59 g']), [])
    expect(rows).toEqual([{ label: 'Weight', a: '< 60 g', b: null }])
  })

  it('does not mutate either spec list', () => {
    const a = specs(['Sensor', 'HERO 2'])
    const b = specs(['Weight', '54 g'])
    compareRows(a, b)
    expect(a).toEqual([{ label: 'Sensor', value: 'HERO 2' }])
    expect(b).toEqual([{ label: 'Weight', value: '54 g' }])
  })
})

describe('isComparablePair', () => {
  const mouse = product({ slug: 'superlight-2', category: 'mice' })

  it('accepts two different products from the same category', () => {
    expect(isComparablePair(mouse, product({ slug: 'viper-v3', category: 'mice' }))).toBe(true)
  })

  it('rejects a missing side', () => {
    expect(isComparablePair(undefined, mouse)).toBe(false)
    expect(isComparablePair(mouse, undefined)).toBe(false)
    expect(isComparablePair(undefined, undefined)).toBe(false)
  })

  it('rejects a product compared against itself', () => {
    expect(isComparablePair(mouse, mouse)).toBe(false)
  })

  it('rejects two products from different categories', () => {
    expect(isComparablePair(mouse, product({ slug: 'k2-pro', category: 'keyboards' }))).toBe(false)
  })
})
