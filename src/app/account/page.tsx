import Link from 'next/link'
import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { orders } from '@/db/schema/orders'
import { paymentMethods } from '@/db/schema/payment-methods'
import { addresses } from '@/db/schema/addresses'
import { auth } from '@/lib/auth'
import { formatMmk } from '@/lib/money'
import { customerStatusLabel } from '@/lib/order-status'

export default async function AccountOverview() {
  const session = await auth()
  if (!session?.user?.id) return null

  const [recentOrders, addrRows] = await Promise.all([
    db
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
      .limit(3),
    db.select().from(addresses).where(eq(addresses.userId, session.user.id)).limit(1),
  ])

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-end justify-between">
          <h2 className="font-display text-[24px]">Recent orders</h2>
          <Link href="/account/orders" className="text-[13px] text-accent underline underline-offset-4">
            View all
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <p className="mt-4 text-[14px] text-muted">No orders yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {recentOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <Link
                    href={`/account/orders/${o.id}`}
                    className="font-display text-[16px] hover:text-accent"
                  >
                    {o.id.slice(0, 8)}
                  </Link>
                  <div className="mt-0.5 text-[12px] text-muted">
                    {o.placedAt.toLocaleDateString()} · {customerStatusLabel(o.status, o.methodKind)}
                  </div>
                </div>
                <span className="price text-[15px]">{formatMmk(Number(o.totalMmk))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-end justify-between">
          <h2 className="font-display text-[24px]">Default address</h2>
          <Link href="/account/addresses" className="text-[13px] text-accent underline underline-offset-4">
            Manage
          </Link>
        </div>
        {addrRows.length === 0 ? (
          <p className="mt-4 text-[14px] text-muted">No address saved.</p>
        ) : (
          <div className="mt-4 rounded-[var(--radius)] border border-line bg-surface p-5 text-[14px] text-ink-soft">
            <div className="font-display text-[16px] text-ink">{addrRows[0]?.label}</div>
            <div className="mt-1">
              {addrRows[0]?.recipient} · {addrRows[0]?.street}, {addrRows[0]?.township}, {addrRows[0]?.city}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
