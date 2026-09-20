import type { MetadataRoute } from 'next'
import { getAllCategories, getAllProducts } from '@/lib/catalog'
import { localePath } from '@/lib/i18n'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://merxylab.example'

/** Content pages published in both English and Burmese. */
const CONTENT_PATHS = [
  '/contact',
  '/shipping',
  '/returns',
  '/faq',
] as const

/**
 * The catalog, or nothing at all if it cannot be reached.
 *
 * This route is statically generated, so the read happens at build time against
 * whatever database the build environment can reach - which in CI is none, and
 * an unhandled throw there fails the entire build over a file that only lists
 * URLs. The catalog read is cached with a 60-second revalidate, so a sitemap
 * built without products fills them in on the first request that can reach the
 * database.
 */
async function productsOrNone(): Promise<Awaited<ReturnType<typeof getAllProducts>>> {
  try {
    return await getAllProducts()
  } catch (error: unknown) {
    // The message alone (the failed query) is enough to diagnose this. Logging
    // the error object instead prints the driver's `cause` chain, and a
    // connection fault carries the database username in it.
    console.warn(
      '[sitemap] catalog unreachable; product URLs omitted.',
      error instanceof Error ? error.message : String(error),
    )
    return []
  }
}

/**
 * Reads the live catalog, not the legacy `src/data/*.json`. The JSON drifts
 * from the database the moment a product is added or retired in /admin, which
 * had this file advertising four products that 404 and omitting two that sell.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products] = await Promise.all([getAllCategories(), productsOrNone()])
  const now = new Date()
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, priority: 1 },
    { url: `${SITE}/shop`, lastModified: now, priority: 0.9 },
    { url: `${SITE}/search`, lastModified: now, priority: 0.4 },
    { url: `${SITE}/cart`, lastModified: now, priority: 0.3 },
    { url: `${SITE}/about`, lastModified: now, priority: 0.5 },
    { url: `${SITE}/privacy`, lastModified: now, priority: 0.3 },
    ...CONTENT_PATHS.flatMap((path) => [
      {
        url: `${SITE}${path}`,
        lastModified: now,
        priority: 0.5,
        alternates: {
          languages: { en: `${SITE}${path}`, my: `${SITE}${localePath('my', path)}` },
        },
      },
      {
        url: `${SITE}${localePath('my', path)}`,
        lastModified: now,
        priority: 0.5,
        alternates: {
          languages: { en: `${SITE}${path}`, my: `${SITE}${localePath('my', path)}` },
        },
      },
    ]),
  ]

  const categoryRoutes = categories.map((c) => ({
    url: `${SITE}/shop/${c.id}`,
    lastModified: now,
    priority: 0.8,
  }))

  const productRoutes = products.map((p) => ({
    url: `${SITE}/product/${p.slug}`,
    lastModified: new Date(p.updatedAt),
    priority: 0.7,
  }))

  return [...staticRoutes, ...categoryRoutes, ...productRoutes]
}
