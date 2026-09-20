import { count, eq } from 'drizzle-orm'
import { db } from '@/db'
import { products } from '@/db/schema/products'
import { orders } from '@/db/schema/orders'
import { reviews } from '@/db/schema/reviews'

async function singleCount(query: Promise<{ value: number }[]>): Promise<number> {
  const [row] = await query
  return Number(row?.value ?? 0)
}

export default async function AdminOverview() {
  const [productsCount, ordersPending, reviewsPending] = await Promise.all([
    singleCount(db.select({ value: count() }).from(products)),
    singleCount(
      db.select({ value: count() }).from(orders).where(eq(orders.status, 'pending_payment')),
    ),
    singleCount(db.select({ value: count() }).from(reviews).where(eq(reviews.status, 'pending'))),
  ])

  const stats = [
    { label: 'Products', value: productsCount, href: '/admin/products' },
    { label: 'Pending orders', value: ordersPending, href: '/admin/orders' },
    { label: 'Pending reviews', value: reviewsPending, href: '/admin/reviews' },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {stats.map((s) => (
        <a
          key={s.label}
          href={s.href}
          className="rounded-[var(--radius)] border border-line bg-surface p-6 transition-colors hover:border-ink/40"
        >
          <div className="eyebrow">{s.label}</div>
          <div className="mt-2 font-display text-[36px] leading-none text-ink">{s.value}</div>
        </a>
      ))}
    </div>
  )
}
