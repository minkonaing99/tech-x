import { Suspense } from 'react'
import { GridControls } from '@/components/shop/grid-controls'
import { ShopGridSkeleton } from '@/components/shop/grid-skeleton'
import { getAllProducts } from '@/lib/catalog'

export const metadata = {
  title: 'Shop',
  description: 'Every peripheral on the bench. Keyboards, mice, monitors, audio, accessories.',
}

export const dynamic = 'force-dynamic'

/**
 * The only part of this page that waits on the database, split out so the
 * heading paints immediately and the catalog streams in behind it.
 */
async function ShopGrid() {
  const products = await getAllProducts()
  return <GridControls all={products} />
}

export default function ShopPage() {
  return (
    <section className="container-prose py-16 md:py-20">
      <div className="eyebrow">Shop</div>
      <h1 className="mt-3 font-display text-[40px] leading-[1.05] text-ink md:text-[56px]">
        Every peripheral on the bench.
      </h1>
      <p className="mt-4 max-w-[52ch] text-[15px] text-ink-soft">
        Sorted by what we like best this week. Filter by category to narrow it down.
      </p>

      <div className="mt-10">
        <Suspense fallback={<ShopGridSkeleton />}>
          <ShopGrid />
        </Suspense>
      </div>
    </section>
  )
}
