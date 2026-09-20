import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { ProductCard } from '../product/card'
import type { Product } from '@/lib/types'

interface ProductGridProps {
  products: readonly Product[]
}

export function ProductGrid({ products }: ProductGridProps) {
  return (
    <section className="container-prose py-20 md:py-28">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="eyebrow">Tech X</div>
          <h2 className="mt-3 font-display text-[36px] leading-[1.05] text-ink md:text-[48px]">
            Your next upgrade.
          </h2>
        </div>
        <Link
          href="/shop"
          className="hidden items-center gap-2 text-[14px] font-medium text-ink underline underline-offset-[6px] decoration-[1.5px] hover:text-accent md:inline-flex"
        >
          See all
          <ArrowRight size={16} strokeWidth={1.75} />
        </Link>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 md:gap-10 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      <div className="mt-10 flex justify-center md:hidden">
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 text-[14px] font-medium text-ink underline underline-offset-[6px]"
        >
          See all
          <ArrowRight size={16} strokeWidth={1.75} />
        </Link>
      </div>
    </section>
  )
}
