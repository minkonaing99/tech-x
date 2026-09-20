'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search as SearchIcon } from 'lucide-react'
import { ProductCard } from '@/components/product/card'
import { buildSearchIndex, searchProducts } from '@/lib/search'
import type { Product } from '@/lib/types'

interface SearchInnerProps {
  products: readonly Product[]
}

function SearchBody({ products }: SearchInnerProps) {
  const router = useRouter()
  const params = useSearchParams()
  const initial = params.get('q') ?? ''
  const [query, setQuery] = useState(initial)

  useEffect(() => {
    setQuery(initial)
  }, [initial])

  const index = useMemo(() => buildSearchIndex(products), [products])
  const results = useMemo(() => searchProducts(index, query), [index, query])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search')
  }

  return (
    <section className="container-prose py-16 md:py-20">
      <div className="eyebrow">Search</div>
      <h1 className="mt-3 font-display text-[40px] leading-[1.05] text-ink md:text-[52px]">
        Find what you need.
      </h1>

      <form
        onSubmit={handleSubmit}
        className="mt-8 flex items-center gap-2 rounded-[var(--radius-pill)] border border-line bg-cream p-1.5"
      >
        <SearchIcon size={18} className="ml-3 text-muted" strokeWidth={1.5} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try “low profile keyboard” or “silent mouse”"
          autoFocus
          className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-[15px] placeholder:text-muted focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-[var(--radius-pill)] bg-ink px-5 py-2.5 text-[13px] font-medium text-cream transition-colors hover:bg-accent"
        >
          Search
        </button>
      </form>

      <div className="mt-10">
        {query.trim().length < 2 ? (
          <p className="text-[14px] text-muted">Type at least 2 characters to start.</p>
        ) : results.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-line bg-surface px-6 py-16 text-center">
            <p className="font-display text-[22px]">No products match your query.</p>
            <p className="mt-2 text-[14px] text-muted">
              Try a broader term, or browse the full shop.
            </p>
          </div>
        ) : (
          <>
            <p className="text-[13px] text-muted">
              {results.length} {results.length === 1 ? 'result' : 'results'} for &ldquo;{query}
              &rdquo;
            </p>
            <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export function SearchInner({ products }: SearchInnerProps) {
  return (
    <Suspense fallback={<div className="container-prose py-20 text-muted">Loading…</div>}>
      <SearchBody products={products} />
    </Suspense>
  )
}
