'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

const CHIPS = [
  { value: '', label: 'All' },
  { value: 'pending_payment', label: 'Pending' },
  { value: 'payment_submitted', label: 'Slip in' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

const DEBOUNCE_MS = 300

interface OrdersFiltersProps {
  counts: Record<string, number>
  status: string
  q: string
}

export function OrdersFilters({ counts, status, q }: OrdersFiltersProps) {
  const router = useRouter()
  const params = useSearchParams()
  const [term, setTerm] = useState(q)

  // Push the search term into the URL after a pause, so the server query runs
  // once per phrase rather than once per keystroke. Page resets to 1.
  useEffect(() => {
    if (term === q) return
    const id = setTimeout(() => {
      const next = new URLSearchParams(params.toString())
      if (term.trim()) next.set('q', term.trim())
      else next.delete('q')
      next.delete('page')
      router.replace(`/admin/orders?${next.toString()}`)
    }, DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [term, q, params, router])

  function chipHref(value: string): string {
    const next = new URLSearchParams(params.toString())
    if (value) next.set('status', value)
    else next.delete('status')
    next.delete('page')
    const qs = next.toString()
    return qs ? `/admin/orders?${qs}` : '/admin/orders'
  }

  return (
    <div className="mt-8 space-y-3">
      <input
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search order id, name or email"
        aria-label="Search orders"
        className="w-full max-w-[420px] rounded-[var(--radius)] border border-line bg-cream px-3.5 py-2.5 text-[13px] focus:border-ink/40 focus:outline-none"
      />

      <div className="flex flex-wrap gap-2">
        {CHIPS.map((c) => {
          const active = status === c.value
          const n = c.value ? (counts[c.value] ?? 0) : (counts.all ?? 0)
          return (
            <button
              key={c.label}
              type="button"
              onClick={() => router.replace(chipHref(c.value))}
              aria-pressed={active}
              className={cn(
                'rounded-[var(--radius-pill)] px-3 py-1.5 text-[12px] transition-colors',
                active
                  ? 'bg-ink text-cream'
                  : 'border border-line text-ink-soft hover:border-ink/30 hover:text-ink',
              )}
            >
              {c.label} <span className={active ? 'text-cream/60' : 'text-muted'}>{n}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
