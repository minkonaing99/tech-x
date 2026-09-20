import { cn } from '@/lib/utils'
import { discountPercent, isOnSale } from '@/lib/pricing'

interface SaleBadgeProps {
  priceMmk: number
  salePriceMmk: number | null
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Deliberately accent, not the success green or warning amber `StockBadge`
 * owns: the two sit side by side on the product page and must not read as the
 * same kind of signal.
 */
export function SaleBadge({ priceMmk, salePriceMmk, size = 'md', className }: SaleBadgeProps) {
  if (!isOnSale(priceMmk, salePriceMmk)) return null

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-pill)] font-medium',
        'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]',
        className,
      )}
    >
      {discountPercent(priceMmk, salePriceMmk)}% off
    </span>
  )
}
