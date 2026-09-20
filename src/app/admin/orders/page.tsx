import { AdminOrdersTable } from './orders-table'
import { OrderQueue } from './order-queue'
import { OrdersFilters } from './orders-filters'
import { Pagination } from './pagination'
import { RefreshBar } from './refresh-bar'
import {
  PAGE_SIZE,
  getOrderPage,
  getQueue,
  getStaleDays,
  getStatusCounts,
  parsePage,
  parseStatus,
} from '@/lib/admin-orders'

interface PageProps {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const sp = await searchParams
  const status = parseStatus(sp.status)
  const q = sp.q?.slice(0, 120)
  const page = parsePage(sp.page)

  const staleDays = await getStaleDays()
  const [queue, counts, list] = await Promise.all([
    getQueue(staleDays),
    getStatusCounts(),
    getOrderPage({ status, q, page }),
  ])

  const baseQuery = new URLSearchParams()
  if (status) baseQuery.set('status', status)
  if (q) baseQuery.set('q', q)

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[26px]">Orders</h2>
          <p className="mt-2 text-[14px] text-muted">
            Change status as payments clear or shipments leave.
          </p>
        </div>
        <RefreshBar />
      </div>

      <OrderQueue groups={queue} staleDays={staleDays} />

      <OrdersFilters counts={counts} status={status ?? ''} q={q ?? ''} />

      <AdminOrdersTable initial={list.rows} />

      <Pagination
        page={list.page}
        pageCount={list.pageCount}
        total={list.total}
        pageSize={PAGE_SIZE}
        baseQuery={baseQuery.toString()}
      />
    </div>
  )
}
