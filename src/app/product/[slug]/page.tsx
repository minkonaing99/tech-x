import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Gallery } from '@/components/product/gallery'
import { ProductCard } from '@/components/product/card'
import { AddToCartButton } from '@/components/product/add-to-cart-button'
import { StockBadge } from '@/components/product/stock-badge'
import { SaleBadge } from '@/components/product/sale-badge'
import { Price } from '@/components/product/price'
import { HeartButton } from '@/components/wishlist/heart-button'
import { ReviewBlock } from '@/components/reviews/review-block'
import { ComparePicker } from '@/components/compare/compare-picker'
import {
  getCategoryById,
  getProductBySlug,
  getProductsByCategory,
  getRelatedProducts,
} from '@/lib/catalog'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) return { title: 'Not found' }
  return {
    title: product.name,
    description: product.tagline,
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getProductBySlug(slug)
  if (!product) notFound()

  const [category, related, siblings] = await Promise.all([
    getCategoryById(product.category),
    getRelatedProducts(slug, 3),
    getProductsByCategory(product.category),
  ])

  const comparable = siblings.filter((p) => p.slug !== slug)

  return (
    <article className="container-prose py-10 md:py-16">
      <Link
        href="/shop"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-accent"
      >
        <ArrowLeft size={14} />
        Back to shop
      </Link>

      <div className="mt-6 grid items-start gap-10 md:grid-cols-[1.1fr_1fr] md:gap-14">
        <div className="md:sticky md:top-24">
          <Gallery product={product} />
        </div>

        <div>
          <div className="eyebrow">{category?.name}</div>
          <h1 className="mt-3 font-display text-[40px] leading-[1.05] text-ink md:text-[52px]">
            {product.name}
          </h1>
          <p className="mt-3 text-[16px] text-ink-soft">{product.tagline}</p>

          <div className="mt-6 flex flex-wrap items-center gap-4 border-y border-line py-5">
            <Price
              priceMmk={product.price}
              salePriceMmk={product.salePrice}
              size="font-display text-[28px]"
            />
            <SaleBadge priceMmk={product.price} salePriceMmk={product.salePrice} />
            <StockBadge
              stockQty={product.stockQty ?? (product.inStock ? 10 : 0)}
              lowStockThreshold={product.lowStockThreshold ?? 3}
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <AddToCartButton
              productId={product.id}
              productName={product.name}
              disabled={(product.stockQty ?? 0) <= 0}
            />
            <HeartButton productId={product.id} productName={product.name} />
            <ComparePicker current={product} others={comparable} label="Compare" />
            <Link
              href="/cart"
              className="inline-flex items-center justify-center rounded-[var(--radius-pill)] border border-line bg-cream px-6 py-3.5 text-[14px] font-medium text-ink transition-colors hover:border-ink/40"
            >
              View cart
            </Link>
          </div>

          <div className="mt-10">
            <h2 className="font-display text-[22px] text-ink">About this product</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{product.description}</p>
          </div>

          <div className="mt-10">
            <h2 className="font-display text-[22px] text-ink">Specifications</h2>
            <dl className="mt-4 divide-y divide-line border-y border-line">
              {product.specs.map((s) => (
                <div key={s.label} className="grid grid-cols-[140px_1fr] gap-4 py-3.5">
                  <dt className="text-[13px] tracking-[0.06em] uppercase text-muted">{s.label}</dt>
                  <dd className="text-[14px] text-ink">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>

        </div>
      </div>

      <ReviewBlock slug={product.slug} />

      {related.length > 0 && (
        <section className="mt-20 border-t border-line pt-12">
          <div className="eyebrow">Also from this batch</div>
          <h2 className="mt-3 font-display text-[28px] text-ink md:text-[36px]">
            You might also like.
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </article>
  )
}
