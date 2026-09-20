import Link from 'next/link'
import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  pageCount: number
  total: number
  pageSize: number
  /** Current query string without `page`, e.g. 'status=confirmed&q=aung'. */
  baseQuery: string
}

function href(page: number, baseQuery: string): string {
  const qs = new URLSearchParams(baseQuery)
  if (page > 1) qs.set('page', String(page))
  const s = qs.toString()
  return s ? `/admin/orders?${s}` : '/admin/orders'
}

export function Pagination({ page, pageCount, total, pageSize, baseQuery }: PaginationProps) {
  if (total === 0) return null

  const first = (page - 1) * pageSize + 1
  const last = Math.min(total, page * pageSize)
  const step = 'rounded-[var(--radius-pill)] border border-line px-3 py-1.5 text-[12px]'

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
      <p className="text-[12px] text-muted">
        {first}-{last} of {total}
      </p>

      {pageCount > 1 && (
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link href={href(page - 1, baseQuery)} className={cn(step, 'text-ink hover:border-ink/30')}>
              ← Newer
            </Link>
          ) : (
            <span className={cn(step, 'text-muted opacity-50')}>← Newer</span>
          )}

          <span className="text-[12px] text-muted">
            {page} / {pageCount}
          </span>

          {page < pageCount ? (
            <Link href={href(page + 1, baseQuery)} className={cn(step, 'text-ink hover:border-ink/30')}>
              Older →
            </Link>
          ) : (
            <span className={cn(step, 'text-muted opacity-50')}>Older →</span>
          )}
        </div>
      )}
    </div>
  )
}
