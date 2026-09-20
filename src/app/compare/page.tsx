import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { CompareTable } from '@/components/compare/compare-table'
import { ComparePicker } from '@/components/compare/compare-picker'
import {
  getCategoryById,
  getProductBySlug,
  getProductRatings,
  getProductsByCategory,
} from '@/lib/catalog'
import { isComparablePair } from '@/lib/compare'
import type { Product } from '@/lib/types'

export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

/** `?a=x&a=y` arrives as an array, which is not a slug anyone can have. */
function slug(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/**
 * Both products, or nothing. The slugs come from a query string, so the pair
 * has to earn the render: both must resolve to an active product, they must
 * differ, and they must share a category.
 */
async function resolvePair(
  searchParams: SearchParams,
): Promise<{ a: Product; b: Product } | undefined> {
  const [slugA, slugB] = [slug(searchParams.a), slug(searchParams.b)]
  if (!slugA || !slugB) return undefined

  const [a, b] = await Promise.all([getProductBySlug(slugA), getProductBySlug(slugB)])
  if (!isComparablePair(a, b)) return undefined
  return { a: a as Product, b: b as Product }
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const pair = await resolvePair(await searchParams)
  // Every pair is spec text that already lives on two product pages, and the
  // URLs multiply with the square of the catalog. Crawl it, follow it through
  // to the products, do not index it.
  const robots = { index: false, follow: true }
  if (!pair) return { title: 'Compare', robots }

  return {
    title: `${pair.a.name} vs ${pair.b.name}`,
    description: `Specifications, price and rating for ${pair.a.name} and ${pair.b.name}, side by side.`,
    robots,
  }
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const pair = await resolvePair(await searchParams)
  if (!pair) notFound()
  const { a, b } = pair

  const [category, siblings, ratings] = await Promise.all([
    getCategoryById(a.category),
    getProductsByCategory(a.category),
    getProductRatings([a.id, b.id]),
  ])

  const others = siblings.filter((p) => p.slug !== a.slug && p.slug !== b.slug)

  return (
    <div className="container-prose py-10 md:py-16">
      <Link
        href={`/product/${a.slug}`}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-accent"
      >
        <ArrowLeft size={14} />
        Back to {a.name}
      </Link>

      <div className="eyebrow mt-6">{category?.name}</div>
      <h1 className="mt-3 font-display text-[32px] leading-[1.05] text-ink md:text-[44px]">
        {a.name} vs {b.name}
      </h1>

      <div className="mt-8">
        <CompareTable a={a} b={b} ratings={ratings} />
      </div>

      <div className="mt-10">
        <ComparePicker current={a} others={others} label="Compare with another" />
      </div>
    </div>
  )
}
