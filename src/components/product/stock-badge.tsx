import { cn } from '@/lib/utils'

interface StockBadgeProps {
  stockQty: number
  lowStockThreshold?: number
  size?: 'sm' | 'md'
  className?: string
}

export function StockBadge({
  stockQty,
  lowStockThreshold = 3,
  size = 'md',
  className,
}: StockBadgeProps) {
  const base = cn(
    'inline-flex items-center rounded-[var(--radius-pill)] font-medium',
    size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-[12px]',
    className,
  )

  if (stockQty <= 0) {
    return (
      <span className={cn(base, 'bg-line text-muted')} aria-label="Out of stock">
        Out of stock
      </span>
    )
  }

  if (stockQty <= lowStockThreshold) {
    return (
      <span
        className={cn(base, 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]')}
        aria-label={`Only ${stockQty} left`}
      >
        Only {stockQty} left
      </span>
    )
  }

  return (
    <span
      className={cn(base, 'bg-[var(--color-success)]/10 text-[var(--color-success)]')}
      aria-label="In stock"
    >
      In stock - ships in 3 days
    </span>
  )
}
