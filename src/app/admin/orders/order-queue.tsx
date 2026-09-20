import Link from 'next/link'
import { StaleDaysInput } from './stale-days-input'
import { formatMmk } from '@/lib/money'
import { fullTimestamp, timeAgo } from '@/lib/relative-time'
import type { OrderRow, QueueGroups } from '@/lib/admin-orders'

interface OrderQueueProps {
  groups: QueueGroups
  staleDays: number
}

interface GroupSpec {
  key: keyof QueueGroups
  title: string
  cta: string
  /** Which timestamp the age label refers to. */
  ageLabel: (row: OrderRow) => string
}

const GROUPS: readonly GroupSpec[] = [
  {
    key: 'slips',
    title: 'Slips to verify',
    cta: 'Verify slip',
    ageLabel: (r) => `slip ${timeAgo(r.updatedAt)}`,
  },
  {
    key: 'cod',
    title: 'COD to confirm',
    cta: 'Call & confirm',
    ageLabel: (r) => `placed ${timeAgo(r.placedAt)}`,
  },
  {
    key: 'stale',
    title: 'Stale deliveries',
    cta: 'Mark delivered',
    ageLabel: (r) => `confirmed ${timeAgo(r.updatedAt)}`,
  },
]

export function OrderQueue({ groups, staleDays }: OrderQueueProps) {
  const total = groups.slips.length + groups.cod.length + groups.stale.length

  return (
    <section className="mt-6 rounded-[var(--radius)] border border-line bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[11px] tracking-[0.08em] text-muted uppercase">
          Needs you{total > 0 && ` (${total})`}
        </h3>
        <StaleDaysInput value={staleDays} />
      </div>

      {total === 0 ? (
        <p className="mt-4 text-[14px] text-muted">Nothing needs you right now.</p>
      ) : (
        <div className="mt-4 space-y-6">
          {GROUPS.map((g) => {
            const rows = groups[g.key]
            if (rows.length === 0) return null
            return (
              <div key={g.key}>
                <div className="text-[12px] font-medium text-ink">
                  {g.title} <span className="text-muted">({rows.length})</span>
                </div>
                <ul className="mt-2 divide-y divide-line/70 border-t border-line/70">
                  {rows.map((r) => (
                    <QueueRow key={r.id} row={r} cta={g.cta} age={g.ageLabel(r)} />
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function QueueRow({ row, cta, age }: { row: OrderRow; cta: string; age: string }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display text-[14px] text-ink">{row.id.slice(0, 8)}</span>
          <span className="text-[13px] text-ink">{row.userName ?? row.userEmail}</span>
          <span className="price text-[13px] text-ink">{formatMmk(row.totalMmk)}</span>
          <span className="text-[12px] text-muted" title={fullTimestamp(row.placedAt)}>
            {age}
          </span>
        </div>
        {row.methodKind === 'cod' && row.phone && (
          <a
            href={`tel:${row.phone.replace(/\s+/g, '')}`}
            className="mt-1 inline-block font-mono text-[12px] text-ink underline underline-offset-4 hover:text-accent"
          >
            {row.phone}
          </a>
        )}
      </div>
      <Link
        href={`/admin/orders/${row.id}`}
        className="shrink-0 rounded-[var(--radius-pill)] bg-ink px-4 py-2 text-[12px] font-medium text-cream transition-colors hover:bg-accent"
      >
        {cta} →
      </Link>
    </li>
  )
}
