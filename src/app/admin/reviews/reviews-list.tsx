'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Stars } from '@/components/reviews/stars'
import { api } from '@/lib/api-client'
import { cn } from '@/lib/utils'

type Status = 'pending' | 'approved' | 'rejected'

interface Row {
  id: string
  rating: number
  title: string | null
  body: string
  status: Status
  verifiedPurchase: boolean
  createdAt: string
  productName: string
  productSlug: string
  userEmail: string
  userName: string | null
}

interface AdminReviewsListProps {
  initial: Row[]
}

export function AdminReviewsList({ initial }: AdminReviewsListProps) {
  const [rows, setRows] = useState(initial)
  const [filter, setFilter] = useState<Status | 'all'>('pending')

  async function setStatus(id: string, status: Status) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)))
    const res = await api(`/api/v1/admin/reviews/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    if (!res.ok) toast(res.error?.message ?? 'Save failed.')
    else toast(`Review → ${status}`)
  }

  const visible = rows.filter((r) => filter === 'all' || r.status === filter)

  return (
    <div className="mt-6">
      <div className="flex flex-wrap gap-1.5">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-[var(--radius-pill)] border px-3 py-1.5 text-[12px]',
              filter === f
                ? 'border-ink bg-ink text-cream'
                : 'border-line bg-cream text-ink-soft hover:border-ink/40',
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <ul className="mt-6 space-y-4">
        {visible.length === 0 && (
          <li className="rounded-[var(--radius)] border border-line bg-surface p-6 text-center text-[13px] text-muted">
            Nothing matches this filter.
          </li>
        )}
        {visible.map((r) => (
          <li
            key={r.id}
            className="rounded-[var(--radius)] border border-line bg-surface p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Stars value={r.rating} size={14} />
                  {r.verifiedPurchase && (
                    <span className="rounded-[var(--radius-pill)] bg-sand px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-ink">
                      Verified
                    </span>
                  )}
                  <span
                    className={cn(
                      'rounded-[var(--radius-pill)] px-2 py-0.5 text-[10px] uppercase tracking-[0.08em]',
                      r.status === 'approved' && 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
                      r.status === 'rejected' && 'bg-line text-muted',
                      r.status === 'pending' && 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
                    )}
                  >
                    {r.status}
                  </span>
                </div>
                {r.title && (
                  <div className="mt-1 font-display text-[16px] text-ink">{r.title}</div>
                )}
                <p className="mt-1 whitespace-pre-wrap text-[13px] text-ink-soft">{r.body}</p>
                <div className="mt-2 text-[12px] text-muted">
                  by {r.userName ?? r.userEmail} on{' '}
                  <Link
                    href={`/product/${r.productSlug}`}
                    className="underline underline-offset-2 hover:text-accent"
                  >
                    {r.productName}
                  </Link>{' '}
                  · {new Date(r.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-1.5">
                {r.status !== 'approved' && (
                  <button
                    onClick={() => setStatus(r.id, 'approved')}
                    className="rounded-[var(--radius-pill)] bg-ink px-3 py-1.5 text-[12px] font-medium text-cream hover:bg-accent"
                  >
                    Approve
                  </button>
                )}
                {r.status !== 'rejected' && (
                  <button
                    onClick={() => setStatus(r.id, 'rejected')}
                    className="rounded-[var(--radius-pill)] border border-line bg-cream px-3 py-1.5 text-[12px] text-ink-soft hover:text-error"
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
