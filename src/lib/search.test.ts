import { describe, expect, it } from 'vitest'
import { buildSearchIndex, searchProducts } from './search'
import type { Product } from './types'

function product(over: Partial<Product> & Pick<Product, 'id' | 'name'>): Product {
  return {
    slug: over.id,
    category: 'keyboards',
    price: 100_000,
    salePrice: null,
    tagline: '',
    description: '',
    specs: [],
    swatch: '#000000',
    inStock: true,
    hasPhotos: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

const CATALOG: readonly Product[] = [
  product({ id: 'k2', name: 'Keychron K2 Pro', tagline: '75% hot-swap with tri-mode wireless.' }),
  product({ id: 'mx', name: 'Logitech MX Master 3S', category: 'mice', tagline: 'Silent clicks.' }),
  product({
    id: 'mat',
    name: 'Desk Mat Large',
    category: 'accessories',
    specs: [{ label: 'Material', value: 'Vegan leather' }],
  }),
]

describe('searchProducts', () => {
  const index = buildSearchIndex(CATALOG)

  it('finds a product by name', () => {
    expect(searchProducts(index, 'keychron').map((p) => p.id)).toEqual(['k2'])
  })

  it('tolerates a typo', () => {
    expect(searchProducts(index, 'logitec').map((p) => p.id)).toContain('mx')
  })

  it('matches on a spec value', () => {
    expect(searchProducts(index, 'vegan').map((p) => p.id)).toContain('mat')
  })

  it('returns nothing under two characters', () => {
    expect(searchProducts(index, 'k')).toEqual([])
    expect(searchProducts(index, '  ')).toEqual([])
  })

  it('indexes whatever catalog it is given, not a fixed list', () => {
    const empty = buildSearchIndex([])
    expect(searchProducts(empty, 'keychron')).toEqual([])
  })
})
