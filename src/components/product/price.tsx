import { cn } from '@/lib/utils'
import { formatMmk } from '@/lib/money'
import { effectiveUnitPrice, isOnSale } from '@/lib/pricing'

interface PriceProps {
  priceMmk: number
  salePriceMmk: number | null
  className?: string
  /** Tailwind text size for the price the customer actually pays. */
  size?: string
}

/**
 * The one place a product price is rendered. A bare struck-through number next
 * to a live one is announced by a screen reader as two unrelated prices, so the
 * pair carries a single label saying which is which.
 */
export function Price({ priceMmk, salePriceMmk, className, size = 'text-[15px]' }: PriceProps) {
  const onSale = isOnSale(priceMmk, salePriceMmk)
  const paid = effectiveUnitPrice(priceMmk, salePriceMmk)

  if (!onSale) {
    return <span className={cn('price text-ink', size, className)}>{formatMmk(paid)}</span>
  }

  return (
    <span
      className={cn('inline-flex items-baseline gap-2', className)}
      aria-label={`Was ${formatMmk(priceMmk)}, now ${formatMmk(paid)}`}
    >
      <s aria-hidden className="price text-[13px] text-muted">
        {formatMmk(priceMmk)}
      </s>
      <span aria-hidden className={cn('price text-ink', size)}>
        {formatMmk(paid)}
      </span>
    </span>
  )
}
