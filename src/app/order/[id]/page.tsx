import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { Check, MapPin } from 'lucide-react'
import { db } from '@/db'
import { orders, orderItems } from '@/db/schema/orders'
import { paymentMethods } from '@/db/schema/payment-methods'
import { auth } from '@/lib/auth'
import { r2PublicUrl } from '@/lib/cdn'
import { UUID_RE } from '@/lib/ids'
import { formatMmk } from '@/lib/money'
import { customerStatusHint, customerStatusLabel } from '@/lib/order-status'
import { orderTimestamp } from '@/lib/relative-time'
import { isGoogleMapsUrl } from '@/lib/validators'
import { WalletPanel } from './wallet-panel'
import { CancelButton } from './cancel-button'


export const dynamic = 'force-dynamic'

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ placed?: string }>
}) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()

  const session = await auth()
  if (!session?.user?.id) redirect(`/signin?callbackUrl=/order/${id}`)

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.userId, session.user.id)))
    .limit(1)

  if (!order) notFound()

  const [items, [method]] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
    db.select().from(paymentMethods).where(eq(paymentMethods.id, order.paymentMethodId)).limit(1),
  ])

  const tgUsername = process.env.TELEGRAM_BACKUP_USERNAME ?? 'techxitstore'
  const tgUrl = tgUsername ? `https://t.me/${tgUsername}` : null

  const kind = method?.kind ?? 'wallet'
  const hint = customerStatusHint(order.status, kind)
  const isOpen = order.status === 'pending_payment'
  const showsWalletPanel = isOpen && method?.kind === 'wallet'

  // Checkout redirects here with `?placed=1`. The thank-you belongs to that one
  // arrival: this URL is also where "pay now" and "cancel" land from the account
  // page, and a cancelled order greeting the customer with a green tick and
  // "thanks, we've got your order" is the page telling them a plain untruth.
  const { placed } = await searchParams
  const justPlaced = placed === '1' && isOpen

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

  return (
    <article className="mx-auto w-full max-w-[44rem] px-5 py-14 md:px-8 md:py-20">
      {justPlaced && (
        <p className="mb-6 inline-flex items-center gap-2 text-[13px] text-[var(--color-success)]">
          <Check className="h-4 w-4" strokeWidth={2} aria-hidden />
          Order placed. A copy is in your account.
        </p>
      )}

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="eyebrow">Order</span>
        <span className="font-mono text-[13px] tracking-[0.08em] text-ink-soft uppercase">
          {id.slice(0, 8)}
        </span>
        <span className="text-[12px] text-muted">
          placed {orderTimestamp(order.placedAt.toISOString())}
        </span>
      </div>

      <h1 className="mt-3 font-display text-[34px] leading-[1.05] tracking-[-0.015em] text-ink sm:text-[42px]">
        {customerStatusLabel(order.status, kind)}.
      </h1>
      {hint && <p className="mt-3 max-w-[52ch] text-[15px] leading-[1.6] text-ink-soft">{hint}</p>}

      {showsWalletPanel && (
        <WalletPanel
          orderId={order.id}
          totalMmk={Number(order.totalMmk)}
          method={{
            name: method.name,
            accountName: method.accountName,
            accountPhone: method.accountPhone,
            qrImageUrl: r2PublicUrl(method.qrImageUrl),
            instructionsMd: method.instructionsMd,
          }}
          telegramUrl={tgUrl}
          existingProofUrl={order.paymentProofUrl}
        />
      )}

      {order.status === 'payment_submitted' && order.paymentProofUrl && (
        <figure className="mt-8">
          {/* eslint-disable-next-line @next/next/no-img-element -- slip is streamed
              from a private bucket through our own route, not a public CDN URL. */}
          <img
            src={`/api/v1/orders/${order.id}/slip`}
            alt="The payment slip you submitted"
            className="max-h-64 rounded-[var(--radius)] border border-line"
          />
          <figcaption className="mt-2 text-[12px] text-muted">Your submitted slip.</figcaption>
        </figure>
      )}

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
          <dd className="price">{formatMmk(Number(order.subtotalMmk))}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-6 py-1">
          <dt>Delivery</dt>
          <dd className="price">
            {Number(order.deliveryFeeMmk) > 0 ? formatMmk(Number(order.deliveryFeeMmk)) : 'Free'}
          </dd>
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-6 border-t border-ink/15 pt-4">
          <dt className="font-display text-[20px] text-ink">Total</dt>
          <dd className="price font-display text-[20px] text-ink">
            {formatMmk(Number(order.totalMmk))}
          </dd>
        </div>
      </dl>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Link
          href="/shop"
          className="inline-flex h-12 items-center justify-center rounded-[var(--radius-pill)] bg-ink px-7 text-[14px] font-medium text-cream transition-colors hover:bg-accent"
        >
          Keep shopping
        </Link>
        <Link
          href={`/account/orders/${order.id}`}
          className="inline-flex h-12 items-center justify-center rounded-[var(--radius-pill)] border border-line bg-cream px-7 text-[14px] font-medium text-ink transition-colors hover:border-ink/25"
        >
          Order details
        </Link>
      </div>

      <p className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted">
        {isOpen && <CancelButton orderId={order.id} />}
        {/* The wallet panel already offers Telegram in context ("Trouble
            uploading?"). Two links to the same chat on one screen is noise. */}
        {tgUrl && !showsWalletPanel && (
          <a
            href={tgUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink underline underline-offset-4 hover:text-accent"
          >
            Message us on Telegram
          </a>
        )}
      </p>
    </article>
  )
}
