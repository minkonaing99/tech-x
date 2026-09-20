import { describe, expect, it, vi } from 'vitest'
import type { Product } from '@/lib/types'

function product(over: Partial<Product> = {}): Product {
  return {
    id: over.slug ?? 'p1',
    slug: 'p1',
    name: 'Product One',
    category: 'mice',
    price: 100_000,
    salePrice: null,
    tagline: 'A mouse.',
    description: 'A mouse, described.',
    specs: [{ label: 'Sensor', value: 'HERO 2' }],
    swatch: '#1C1B19',
    inStock: true,
    hasPhotos: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

const CATALOG: readonly Product[] = [
  product({ id: 'a', slug: 'superlight-2', name: 'Superlight 2', category: 'mice' }),
  product({ id: 'b', slug: 'viper-v3', name: 'Viper V3', category: 'mice' }),
  product({ id: 'c', slug: 'k2-pro', name: 'K2 Pro', category: 'keyboards' }),
]

vi.mock('@/lib/catalog', () => ({
  getProductBySlug: async (slug: string) => CATALOG.find((p) => p.slug === slug),
  getProductsByCategory: async (id: string) => CATALOG.filter((p) => p.category === id),
  getCategoryById: async (id: string) => ({ id, name: 'Mice', description: '' }),
  getProductRatings: async () => ({}),
}))

/** Real `notFound` throws to unwind the render; the mock has to as well. */
class NotFound extends Error {}
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new NotFound('NEXT_NOT_FOUND')
  },
}))

const ComparePage = (await import('./page')).default

function render(search: Record<string, string | string[] | undefined>) {
  return ComparePage({ searchParams: Promise.resolve(search) })
}

describe('compare page', () => {
  it('renders when both slugs resolve to different products in one category', async () => {
    await expect(render({ a: 'superlight-2', b: 'viper-v3' })).resolves.toBeTruthy()
  })

  it('404s when a slug is missing', async () => {
    await expect(render({ a: 'superlight-2' })).rejects.toBeInstanceOf(NotFound)
    await expect(render({})).rejects.toBeInstanceOf(NotFound)
  })

  it('404s when a slug matches no active product', async () => {
    await expect(render({ a: 'superlight-2', b: 'retired-mouse' })).rejects.toBeInstanceOf(NotFound)
  })

  it('404s when both slugs are the same product', async () => {
    await expect(render({ a: 'superlight-2', b: 'superlight-2' })).rejects.toBeInstanceOf(NotFound)
  })

  it('404s when the two products sit in different categories', async () => {
    await expect(render({ a: 'superlight-2', b: 'k2-pro' })).rejects.toBeInstanceOf(NotFound)
  })

  it('404s when a slug is repeated in the query string', async () => {
    // `?a=x&a=y` arrives as an array, which is not a slug.
    await expect(
      render({ a: ['superlight-2', 'viper-v3'], b: 'viper-v3' }),
    ).rejects.toBeInstanceOf(NotFound)
  })
})

describe('compare metadata', () => {
  it('keeps the page out of the index but lets it pass link equity on', async () => {
    const { generateMetadata } = await import('./page')
    const meta = await generateMetadata({
      searchParams: Promise.resolve({ a: 'superlight-2', b: 'viper-v3' }),
    })
    expect(meta.robots).toEqual({ index: false, follow: true })
    expect(meta.title).toContain('Superlight 2')
    expect(meta.title).toContain('Viper V3')
  })
})
