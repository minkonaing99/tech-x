import Link from 'next/link'
import { notFound } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { MapPin } from 'lucide-react'
import { db } from '@/db'
import { orders, orderItems } from '@/db/schema/orders'
import { paymentMethods } from '@/db/schema/payment-methods'
import { OrderProgress } from '@/components/order/progress'
import { auth } from '@/lib/auth'
import { UUID_RE } from '@/lib/ids'
import { formatMmk } from '@/lib/money'
import { customerStatusHint, customerStatusLabel } from '@/lib/order-status'
import { orderTimestamp } from '@/lib/relative-time'
import { isGoogleMapsUrl } from '@/lib/validators'


export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()

  const session = await auth()
  if (!session?.user?.id) return null

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.userId, session.user.id)))
    .limit(1)
  if (!order) notFound()

  const [items, [method]] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
    db
      .select({ kind: paymentMethods.kind, name: paymentMethods.name })
      .from(paymentMethods)
      .where(eq(paymentMethods.id, order.paymentMethodId))
      .limit(1),
  ])

  // Read off the order, never through `shipping_address_id`. The address row
  // is still editable by the customer; this is where the parcel is going.
  const shipping = order.shipRecipient
    ? {
        recipient: order.shipRecipient,
        phone: order.shipPhone,
        telegram: order.shipTelegram,
        street: order.shipStreet,
        township: order.shipTownship,
        city: order.shipCity,
        divisionName: order.shipDivisionName,
        landmark: order.shipLandmark,
        mapsUrl: order.shipMapsUrl && isGoogleMapsUrl(order.shipMapsUrl) ? order.shipMapsUrl : null,
      }
    : null

  const kind = method?.kind ?? 'wallet'
  const hint = customerStatusHint(order.status, kind)
  const subtotal = Number(order.subtotalMmk)
  const deliveryFee = Number(order.deliveryFeeMmk)
  const isOpen = order.status === 'pending_payment'
  // The only state where the customer owes an action. A COD buyer owes nothing
  // until the courier arrives, so sending them to a CTA is busywork.
  const owesPayment = isOpen && kind === 'wallet'

  return (
    <div className="max-w-[42rem]">
      <Link href="/account/orders" className="text-[13px] text-muted hover:text-accent">
        ← All orders
      </Link>

      <div className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="eyebrow">Order</span>
        <span className="font-mono text-[13px] tracking-[0.08em] text-ink-soft uppercase">
          {id.slice(0, 8)}
        </span>
        <span className="text-[12px] text-muted">placed {orderTimestamp(order.placedAt.toISOString())}</span>
      </div>

      {/* The status is the headline. It is the one thing the customer opened
          this page to read, and it used to sit in a pill in the corner. */}
      <h2 className="mt-3 font-display text-[30px] leading-[1.1] tracking-[-0.01em] sm:text-[34px]">
        {customerStatusLabel(order.status, kind)}.
      </h2>
      {hint && <p className="mt-3 max-w-[52ch] text-[15px] leading-[1.6] text-ink-soft">{hint}</p>}

      {owesPayment && (
        <Link
          href={`/order/${order.id}`}
          className="mt-6 inline-flex h-12 items-center justify-center rounded-[var(--radius-pill)] bg-ink px-7 text-[14px] font-medium text-cream transition-colors hover:bg-accent"
        >
          Payment instructions
        </Link>
      )}

      <OrderProgress
        status={order.status}
        kind={kind}
        placedAt={order.placedAt.toISOString()}
        updatedAt={order.updatedAt.toISOString()}
        className="mt-10 border-t border-line pt-8"
      />

      <dl className="mt-10 divide-y divide-line border-y border-line text-[14px]">
        <div className="grid gap-1 py-5 sm:grid-cols-[8rem_1fr] sm:gap-8">
          <dt className="text-[12px] text-muted">Deliver to</dt>
          <dd>
            {shipping ? (
              <div className="space-y-0.5 leading-[1.6] text-ink-soft">
                <div className="text-ink">{shipping.recipient}</div>
                <div className="font-mono text-[13px]">{shipping.phone}</div>
                {shipping.telegram && (
                  <div className="text-[13px]">
                    <span className="text-muted">Telegram</span> @{shipping.telegram}
                  </div>
                )}
                <div>{shipping.street}</div>
                <div>
                  {shipping.township}, {shipping.city}
                </div>
                {shipping.divisionName && <div>{shipping.divisionName}</div>}
                {shipping.landmark && <div className="text-muted">{shipping.landmark}</div>}
                {shipping.mapsUrl && (
                  <a
                    href={shipping.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-center gap-1 pt-1 text-[13px] text-ink underline underline-offset-4 hover:text-accent"
                  >
                    <MapPin className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                    Map pin
                  </a>
                )}
              </div>
            ) : (
              <span className="text-muted">Address no longer on file.</span>
            )}
          </dd>
        </div>

        <div className="grid gap-1 py-5 sm:grid-cols-[8rem_1fr] sm:gap-8">
          <dt className="text-[12px] text-muted">Payment</dt>
          <dd className="leading-[1.6]">
            <div className="text-ink">{method?.name ?? 'Payment method'}</div>
            <p className="text-[13px] text-muted">
              {kind === 'cod'
                ? 'Pay the courier when the parcel arrives.'
                : 'Bank transfer or mobile wallet, verified by hand.'}
            </p>
            {order.paymentTxRef && (
              <p className="mt-1 text-[13px] text-muted">
                Reference <span className="font-mono text-ink">{order.paymentTxRef}</span>
              </p>
            )}
          </dd>
        </div>
      </dl>

      <ul className="mt-8">
        {items.map((it) => (
          <li key={it.id} className="flex items-baseline justify-between gap-6 py-2.5">
            <span className="text-[14px] text-ink">
              <span className="text-muted">{it.qty} ×</span> {it.nameSnapshot}
            </span>
            <span className="price shrink-0 text-[14px] text-ink">
              {formatMmk(Number(it.unitPriceMmkSnapshot) * it.qty)}
            </span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 border-t border-line pt-4 text-[13px] text-muted">
        <div className="flex items-baseline justify-between gap-6 py-1">
          <dt>Subtotal</dt>
          <dd className="price">{formatMmk(subtotal)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-6 py-1">
          <dt>Delivery</dt>
          <dd className="price">{deliveryFee > 0 ? formatMmk(deliveryFee) : 'Free'}</dd>
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-6 border-t border-ink/15 pt-4">
          <dt className="font-display text-[20px] text-ink">Total</dt>
          <dd className="price font-display text-[20px] text-ink">
            {formatMmk(Number(order.totalMmk))}
          </dd>
        </div>
      </dl>

      <p className="mt-10 text-[13px] leading-[1.6] text-muted">
        Need to change something?{' '}
        {isOpen && (
          <>
            <Link
              href={`/order/${order.id}`}
              className="text-ink underline underline-offset-4 hover:text-accent"
            >
              Cancel this order
            </Link>
            {' or '}
          </>
        )}
        <Link href="/contact" className="text-ink underline underline-offset-4 hover:text-accent">
          message us
        </Link>{' '}
        quoting the order number above.
      </p>
    </div>
  )
}
