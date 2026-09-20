import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import { fullTimestamp, timeAgo } from '@/lib/relative-time'
import { progressSteps, type MethodKind } from '@/lib/order-status'
import type { OrderStatus } from '@/db/schema/orders'

interface OrderProgressProps {
  status: OrderStatus
  kind: MethodKind
  placedAt: string
  updatedAt: string
  className?: string
}

export function OrderProgress({
  status,
  kind,
  placedAt,
  updatedAt,
  className,
}: OrderProgressProps) {
  if (status === 'cancelled') {
    // No heading here: the page states the status above this. Repeating it
    // makes one fact read as two.
    return (
      <p className={cn('text-[14px] leading-[1.6] text-ink-soft', className)}>
        Cancelled {timeAgo(updatedAt)}. Nothing is owed. Message us if this was a mistake and we
        will place it again.
      </p>
    )
  }

  const steps = progressSteps(status, kind)

  return (
    <ol
      className={cn('grid gap-0 sm:grid-cols-[repeat(var(--steps),minmax(0,1fr))]', className)}
      style={{ '--steps': steps.length } as CSSProperties}
    >
      {steps.map((step, i) => {
        const done = step.state === 'done'
        const isCurrent = step.state === 'current'
        // Only two timestamps exist on an order, so only the first and the
        // live step can be dated. Middle steps show no time.
        const stamp = i === 0 ? placedAt : isCurrent && i > 0 ? updatedAt : null

        return (
          <li key={step.status} className="relative flex gap-3 pb-5 last:pb-0 sm:block sm:pb-0">
            {/* Rail: vertical on mobile, horizontal on desktop. */}
            <div className="flex flex-col items-center sm:flex-row sm:items-center">
              <span
                aria-hidden
                className={cn(
                  'z-10 size-2 shrink-0 rounded-full ring-4 ring-cream',
                  isCurrent && 'size-2.5 bg-accent',
                  done && 'bg-ink',
                  !done && !isCurrent && 'bg-line',
                )}
              />
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    'w-px flex-1 sm:h-px sm:w-full sm:flex-none',
                    done ? 'bg-ink' : 'bg-line',
                  )}
                />
              )}
            </div>

            <div className="min-w-0 sm:mt-3 sm:pr-4">
              <div
                className={cn(
                  'text-[12px] leading-tight',
                  isCurrent ? 'font-medium text-ink' : done ? 'text-ink-soft' : 'text-muted',
                )}
              >
                {step.label}
              </div>
              {stamp && (
                <time
                  dateTime={stamp}
                  title={fullTimestamp(stamp)}
                  className="mt-1 block text-[11px] text-muted"
                >
                  {timeAgo(stamp)}
                </time>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
