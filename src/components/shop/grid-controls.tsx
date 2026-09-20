'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ProductCard } from '../product/card'
import { cn } from '@/lib/utils'
import type { Product } from '@/lib/types'
import { CATEGORIES } from '@/lib/categories'
import { effectiveUnitPrice } from '@/lib/pricing'

type Sort = 'featured' | 'price-asc' | 'price-desc' | 'name-asc'

function paid(p: Product): number {
  return effectiveUnitPrice(p.price, p.salePrice)
}

interface GridControlsProps {
  all: readonly Product[]
  activeCategory?: string
}

export function GridControls({ all, activeCategory }: GridControlsProps) {
  const [sort, setSort] = useState<Sort>('featured')

  const sorted = useMemo(() => {
    const arr = [...all]
    switch (sort) {
      // Sorts on what the card shows, so a discounted product does not sit in
      // the position its pre-sale price would give it.
      case 'price-asc':
        return arr.sort((a, b) => paid(a) - paid(b))
      case 'price-desc':
        return arr.sort((a, b) => paid(b) - paid(a))
      case 'name-asc':
        return arr.sort((a, b) => a.name.localeCompare(b.name))
      default:
        return arr.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)))
    }
  }, [all, sort])

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href="/shop"
            className={cn(
              'rounded-[var(--radius-pill)] border px-3.5 py-1.5 text-[13px] transition-colors',
              !activeCategory
                ? 'border-ink bg-ink text-cream'
                : 'border-line bg-cream text-ink-soft hover:border-ink/40',
            )}
          >
            All
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href={`/shop/${c.id}`}
              className={cn(
                'rounded-[var(--radius-pill)] border px-3.5 py-1.5 text-[13px] transition-colors',
                activeCategory === c.id
                  ? 'border-ink bg-ink text-cream'
                  : 'border-line bg-cream text-ink-soft hover:border-ink/40',
              )}
            >
              {c.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="sort" className="text-[12px] text-muted">
            Sort
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-[var(--radius-pill)] border border-line bg-cream px-3 py-1.5 text-[13px] focus:outline-none"
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price · low to high</option>
            <option value="price-desc">Price · high to low</option>
            <option value="name-asc">Name · A→Z</option>
          </select>
        </div>
      </div>

      <p className="mt-6 text-[13px] text-muted">
        {sorted.length} {sorted.length === 1 ? 'product' : 'products'}
      </p>

      <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2 md:gap-10 lg:grid-cols-3">
        {sorted.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {sorted.length === 0 && (
        <div className="rounded-[var(--radius)] border border-line bg-surface px-6 py-16 text-center">
          <p className="font-display text-[22px]">Nothing here yet.</p>
          <p className="mt-2 text-[14px] text-muted">This batch is empty. Check back next month.</p>
        </div>
      )}
    </>
  )
}
