import { redirect } from 'next/navigation'
import { asc, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { getCartLines } from '@/lib/cart-session'
import { cartSavings, cartSubtotal } from '@/lib/pricing'
import { db } from '@/db'
import { addresses } from '@/db/schema/addresses'
import { divisions } from '@/db/schema/divisions'
import { paymentMethods } from '@/db/schema/payment-methods'
import { CheckoutForm } from './checkout-form'

export const dynamic = 'force-dynamic'

export default async function CheckoutPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/signin?callbackUrl=/checkout')
  }

  const [lines, addrRows, divisionRows, methodRows] = await Promise.all([
    getCartLines(),
    db.select().from(addresses).where(eq(addresses.userId, session.user.id)),
    db.select().from(divisions).where(eq(divisions.isBlocked, false)).orderBy(asc(divisions.sortOrder)),
    db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.isActive, true))
      .orderBy(asc(paymentMethods.sortOrder)),
  ])

  if (lines.length === 0) {
    return (
      <section className="container-prose py-20 text-center md:py-28">
        <div className="eyebrow">Checkout</div>
        <h1 className="mt-3 font-display text-[40px] leading-[1.05]">Your cart is empty.</h1>
      </section>
    )
  }

  const subtotal = cartSubtotal(lines)
  const savings = cartSavings(lines)

  const methods = methodRows.filter((m) => {
    if (m.kind === 'cod') return true
    return Boolean(m.accountName && m.accountPhone && m.qrImageUrl)
  })

  return (
    <section className="container-prose py-16 md:py-20">
      <div className="eyebrow">Checkout</div>
      <h1 className="mt-3 font-display text-[40px] leading-[1.05] text-ink md:text-[52px]">
        Review and confirm.
      </h1>
      <CheckoutForm
        addresses={addrRows.map((a) => ({
          id: a.id,
          label: a.label,
          recipient: a.recipient,
          phone: a.phone,
          divisionId: a.divisionId,
          city: a.city,
          township: a.township,
          street: a.street,
          landmark: a.landmark,
          telegramUsername: a.telegramUsername,
          mapsUrl: a.mapsUrl,
        }))}
        divisions={divisionRows.map((d) => ({
          id: d.id,
          name: d.name,
          deliveryFeeMmk: d.deliveryFeeMmk,
          codAllowed: d.codAllowed,
        }))}
        methods={methods.map((m) => ({ id: m.id, name: m.name, kind: m.kind }))}
        lines={lines}
        subtotal={subtotal}
        savings={savings}
      />
    </section>
  )
}
