import Link from 'next/link'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { orders } from '@/db/schema/orders'
import { paymentMethods } from '@/db/schema/payment-methods'
import { auth } from '@/lib/auth'
import { formatMmk } from '@/lib/money'
import { customerStatusLabel } from '@/lib/order-status'

export default async function OrdersPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      totalMmk: orders.totalMmk,
      placedAt: orders.placedAt,
      methodKind: paymentMethods.kind,
    })
    .from(orders)
    .innerJoin(paymentMethods, eq(paymentMethods.id, orders.paymentMethodId))
    .where(eq(orders.userId, session.user.id))
    .orderBy(desc(orders.placedAt))

  return (
    <div>
      <h2 className="font-display text-[28px]">Orders</h2>
      {rows.length === 0 ? (
        <p className="mt-6 text-[14px] text-muted">No orders yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {rows.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-4 py-5">
              <div>
                <Link
                  href={`/account/orders/${o.id}`}
                  className="font-display text-[18px] hover:text-accent"
                >
                  {o.id.slice(0, 8)}
                </Link>
                <div className="mt-0.5 text-[12px] text-muted">
                  {o.placedAt.toLocaleDateString()} · {customerStatusLabel(o.status, o.methodKind)}
                </div>
              </div>
              <span className="price text-[16px]">{formatMmk(Number(o.totalMmk))}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
