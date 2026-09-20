import { beforeEach, describe, expect, it, vi } from 'vitest'

/** What the catalog read does when the sitemap asks for products. */
let products: (() => Promise<{ slug: string; updatedAt: string }[]>) | null = null

vi.mock('@/lib/catalog', () => ({
  getAllCategories: async () => [{ id: 'rings' }, { id: 'chains' }],
  getAllProducts: async () => products?.() ?? [],
}))

const sitemap = (await import('./sitemap')).default

describe('sitemap', () => {
  beforeEach(() => {
    products = async () => [{ slug: 'signet-01', updatedAt: '2026-01-01T00:00:00.000Z' }]
  })

  it('lists the static pages, the categories, and every product', async () => {
    const urls = (await sitemap()).map((e) => e.url)
    expect(urls).toContain('https://merxylab.example/shop')
    expect(urls).toContain('https://merxylab.example/shop/rings')
    expect(urls).toContain('https://merxylab.example/product/signet-01')
  })

  it('publishes both locales of a content page', async () => {
    const urls = (await sitemap()).map((e) => e.url)
    expect(urls).toContain('https://merxylab.example/contact')
    expect(urls).toContain('https://merxylab.example/my/contact')
  })

  it('still returns the static routes when the catalog read throws', async () => {
    // This route is statically generated, so the catalog read happens at build
    // time against whatever database the build environment can reach - none, in
    // CI. A throw here used to fail the whole build.
    products = async () => {
      throw new Error('Access denied for user')
    }

    const entries = await sitemap()
    const urls = entries.map((e) => e.url)
    expect(urls).toContain('https://merxylab.example/shop')
    expect(urls).toContain('https://merxylab.example/shop/rings')
    expect(urls.some((u) => u.includes('/product/'))).toBe(false)
  })
})
