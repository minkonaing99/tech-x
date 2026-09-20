'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarsProps {
  value: number
  size?: number
  interactive?: boolean
  onChange?: (v: number) => void
  className?: string
}

export function Stars({ value, size = 16, interactive = false, onChange, className }: StarsProps) {
  const stars = [1, 2, 3, 4, 5]
  return (
    <div className={cn('inline-flex items-center gap-0.5', className)} role={interactive ? 'radiogroup' : undefined}>
      {stars.map((n) => {
        const filled = n <= Math.round(value)
        if (interactive) {
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={n === Math.round(value)}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              onClick={() => onChange?.(n)}
              className="text-[var(--color-warning)] hover:scale-110 transition-transform"
            >
              <Star
                size={size}
                strokeWidth={1.5}
                className={cn(filled ? 'fill-current' : 'fill-transparent')}
              />
            </button>
          )
        }
        return (
          <Star
            key={n}
            size={size}
            strokeWidth={1.5}
            className={cn(
              'text-[var(--color-warning)]',
              filled ? 'fill-current' : 'fill-transparent opacity-50',
            )}
          />
        )
      })}
    </div>
  )
}
