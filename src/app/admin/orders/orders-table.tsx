'use client'

import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatMmk } from '@/lib/money'
import { fullTimestamp, timeAgo } from '@/lib/relative-time'
import { forwardOptions } from '@/lib/order-transitions'
import type { OrderRow } from '@/lib/admin-orders'
import { api } from '@/lib/api-client'

type Status = OrderRow['status']

/** Closed orders need no attention - dim them so live ones carry the eye. */
const TERMINAL: readonly Status[] = ['delivered', 'cancelled']

export function AdminOrdersTable({ initial }: { initial: OrderRow[] }) {
  const [rows, setRows] = useState(initial)

  // Server data changes on navigation (page, filter, refresh) - resync.
  const [seed, setSeed] = useState(initial)
  if (seed !== initial) {
    setSeed(initial)
    setRows(initial)
  }

  async function setStatus(id: string, status: Status) {
    const prev = rows.find((r) => r.id === id)?.status
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)))
    const res = await api(`/api/v1/admin/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      toast(`Status → ${status.replace('_', ' ')}`)
      return
    }
    if (prev !== undefined) {
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status: prev } : r)))
    }
    // The route's own sentence, including the out-of-stock one. See
    // `actions.tsx` - this used to rebuild it from a `split(':')`.
    toast(res.error?.message ?? `Save failed (${res.status}).`)
  }

  return (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-line text-left text-[11px] tracking-[0.06em] text-muted uppercase">
            <th className="py-3 pr-3">Order</th>
            <th className="px-3 py-3">Customer</th>
            <th className="px-3 py-3 w-[90px]">Method</th>
            <th className="px-3 py-3 w-[140px]">Total</th>
            <th className="px-3 py-3 w-[170px]">Status</th>
            <th className="px-3 py-3 w-[110px]">Placed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const options = forwardOptions(r.status, r.methodKind)
            const locked = options.length === 1
            const closed = TERMINAL.includes(r.status)
            return (
              <tr
                key={r.id}
                className={cn(
                  'border-b border-line/60 transition-opacity duration-200 hover:bg-surface',
                  // Still fully readable on hover or keyboard focus - dimmed,
                  // not hidden.
                  closed && 'opacity-45 hover:opacity-100 focus-within:opacity-100',
                )}
              >
                <td className="py-3 pr-3">
                  <Link
                    href={`/admin/orders/${r.id}`}
                    className="font-display text-[14px] hover:text-accent"
                  >
                    {r.id.slice(0, 8)}
                  </Link>
                  {r.hasSlip && (
                    <span
                      title="Payment slip uploaded"
                      className="mt-0.5 block text-[11px] text-muted"
                    >
                      slip
                    </span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="text-[13px] text-ink">{r.userName ?? r.userEmail}</div>
                  {r.userName && <div className="text-[11px] text-muted">{r.userEmail}</div>}
                </td>
                <td className="px-3 py-3 text-[12px] text-ink-soft uppercase">
                  {r.methodKind === 'cod' ? 'COD' : 'Wallet'}
                </td>
                <td className="price px-3 py-3">{formatMmk(r.totalMmk)}</td>
                <td className="px-3 py-3">
                  <select
                    value={r.status}
                    disabled={locked}
                    onChange={(e) => setStatus(r.id, e.target.value as Status)}
                    className="rounded border border-line bg-cream px-2 py-1 text-[12px] disabled:opacity-60"
                  >
                    {options.map((s) => (
                      <option key={s} value={s}>
                        {s.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </td>
                <td
                  className="px-3 py-3 text-[12px] text-muted"
                  title={fullTimestamp(r.placedAt)}
                >
                  {timeAgo(r.placedAt)}
                </td>
              </tr>
            )
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="py-10 text-center text-[14px] text-muted">
                No orders match.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
