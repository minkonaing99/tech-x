import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { GridControls } from '@/components/shop/grid-controls'
import { ShopGridSkeleton } from '@/components/shop/grid-skeleton'
import { getCategoryById, getProductsByCategory } from '@/lib/catalog'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  const cat = await getCategoryById(category)
  if (!cat) return { title: 'Not found' }
  return {
    title: cat.name,
    description: cat.description,
  }
}

async function CategoryGrid({ id }: { id: string }) {
  const items = await getProductsByCategory(id)
  return <GridControls all={items} activeCategory={id} />
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params

  // Resolved before anything streams. A `loading.tsx` here would send the 200
  // header first and turn every unknown slug into a soft 404 - the bug that
  // got the root loading file deleted. `getCategoryById` reads an in-memory
  // array, so this check costs nothing and the decision is made up front.
  const cat = await getCategoryById(category)
  if (!cat) notFound()

  return (
    <section className="container-prose py-16 md:py-20">
      <div className="eyebrow">Shop · {cat.name}</div>
      <h1 className="mt-3 font-display text-[40px] leading-[1.05] text-ink md:text-[56px]">
        {cat.name}.
      </h1>
      <p className="mt-4 max-w-[52ch] text-[15px] text-ink-soft">{cat.description}</p>

      <div className="mt-10">
        <Suspense fallback={<ShopGridSkeleton />}>
          <CategoryGrid id={cat.id} />
        </Suspense>
      </div>
    </section>
  )
}
