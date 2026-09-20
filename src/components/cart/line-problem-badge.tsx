import { problemMessage, type LineProblem } from '@/lib/cart-availability'
import { cn } from '@/lib/utils'

interface LineProblemBadgeProps {
  problem: LineProblem
  className?: string
}

/**
 * Sibling to `StockBadge`, and deliberately louder than it. That one nudges a
 * shopper who can still buy the thing; this one marks a line that is holding
 * up the order, so it reads as a fault rather than as scarcity.
 */
export function LineProblemBadge({ problem, className }: LineProblemBadgeProps) {
  const label = problemMessage(problem)
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[var(--radius-pill)] px-2 py-0.5 text-[11px] font-medium',
        'bg-[var(--color-error)]/10 text-[var(--color-error)]',
        className,
      )}
    >
      {label}
    </span>
  )
}
