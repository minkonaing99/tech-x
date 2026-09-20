import Link from 'next/link'
import { Tile } from '@/components/product/tile'
import { Price } from '@/components/product/price'
import { SaleBadge } from '@/components/product/sale-badge'
import { Stars } from '@/components/reviews/stars'
import { compareRows } from '@/lib/compare'
import type { Rating } from '@/lib/catalog'
import type { Product } from '@/lib/types'

interface CompareTableProps {
  a: Product
  b: Product
  /** Keyed by product id. A product with no approved reviews may be absent. */
  ratings: Record<string, Rating>
}

/** Free-form specs mean one side often has nothing to say for a row. */
function Value({ value }: { value: string | null }) {
  if (value !== null) return <>{value}</>
  return (
    <>
      <span aria-hidden className="text-muted">
        -
      </span>
      <span className="sr-only">Not listed</span>
    </>
  )
}

function RatingCell({ rating }: { rating: Rating | undefined }) {
  if (!rating || rating.count === 0) {
    return <span className="text-[13px] text-muted">No reviews yet</span>
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Stars value={rating.avg} size={14} />
      <span className="text-[13px] text-muted">
        {rating.avg.toFixed(1)} ({rating.count})
      </span>
    </span>
  )
}

function Head({ product }: { product: Product }) {
  return (
    <>
      <Tile product={product} ratio="square" showLabel={false} sizes="(min-width: 768px) 30vw, 45vw" />
      <Link
        href={`/product/${product.slug}`}
        className="mt-3 block font-display text-[16px] leading-tight text-ink hover:text-accent sm:text-[20px]"
      >
        {product.name}
      </Link>
    </>
  )
}

/**
 * Two products side by side, at every width.
 *
 * Stacking on mobile would be kinder to long values and would also destroy the
 * only thing the page is for, so the columns hold and the type shrinks.
 */
export function CompareTable({ a, b, ratings }: CompareTableProps) {
  const rows = compareRows(a.specs, b.specs)

  return (
    <table className="w-full table-fixed border-collapse text-left">
      <caption className="sr-only">
        {a.name} compared with {b.name}
      </caption>
      <thead>
        <tr className="align-top">
          <td className="w-[84px] sm:w-[150px]" />
          <th scope="col" className="p-2 font-normal sm:p-3">
            <Head product={a} />
          </th>
          <th scope="col" className="p-2 font-normal sm:p-3">
            <Head product={b} />
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line border-y border-line">
        <tr className="align-middle">
          <th scope="row" className="py-3.5 pr-2 text-[11px] tracking-[0.06em] uppercase font-normal text-muted sm:text-[13px]">
            Price
          </th>
          {[a, b].map((p) => (
            <td key={p.id} className="p-2 text-[13px] text-ink sm:p-3 sm:text-[14px]">
              <span className="flex flex-wrap items-center gap-2">
                <Price priceMmk={p.price} salePriceMmk={p.salePrice} />
                <SaleBadge priceMmk={p.price} salePriceMmk={p.salePrice} size="sm" />
              </span>
            </td>
          ))}
        </tr>
        <tr className="align-middle">
          <th scope="row" className="py-3.5 pr-2 text-[11px] tracking-[0.06em] uppercase font-normal text-muted sm:text-[13px]">
            Rating
          </th>
          {[a, b].map((p) => (
            <td key={p.id} className="p-2 sm:p-3">
              <RatingCell rating={ratings[p.id]} />
            </td>
          ))}
        </tr>
        {rows.map((row) => (
          <tr key={row.label} className="align-top">
            <th scope="row" className="py-3.5 pr-2 text-[11px] tracking-[0.06em] uppercase font-normal text-muted sm:text-[13px]">
              {row.label}
            </th>
            <td className="p-2 text-[13px] text-ink sm:p-3 sm:text-[14px]">
              <Value value={row.a} />
            </td>
            <td className="p-2 text-[13px] text-ink sm:p-3 sm:text-[14px]">
              <Value value={row.b} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
