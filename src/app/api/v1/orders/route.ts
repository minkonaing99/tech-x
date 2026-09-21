import { NextResponse } from 'next/server'
import { fail, ok, rateLimited } from '@/lib/api-response'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { orders, orderItems } from '@/db/schema/orders'
import { addresses } from '@/db/schema/addresses'
import { divisions } from '@/db/schema/divisions'
import { paymentMethods } from '@/db/schema/payment-methods'
import { auth } from '@/lib/auth'
import { UUID_RE } from '@/lib/ids'
import { optionalMapsUrl, optionalTelegram, phoneField } from '@/lib/address-fields'
import { getCartLines, clearCart } from '@/lib/cart-session'
import {
  unorderableLines,
  type AvailabilityLine,
  type UnorderableLine,
} from '@/lib/cart-availability'
import { sendMail } from '@/lib/mail'
import { maskEmail } from '@/lib/mask'
import { formatMmk } from '@/lib/money'
import { adminOrderUrl, orderUrl } from '@/lib/links'
import { shortOrderId } from '@/lib/order-status'
import { cartSubtotal, effectiveUnitPrice, isOnSale } from '@/lib/pricing'
import { clientKey, rateLimit } from '@/lib/rate-limit'
import { sendTelegram } from '@/lib/telegram'
import { NewOrderAlert } from '@emails/new-order-alert'
import { OrderPlaced } from '@emails/order-placed'

const COD_CAP_MMK = 300_000
const ORDER_EXPIRY_MS = 24 * 60 * 60 * 1000

/**
 * A sentence for the customer. Names the product while there is only one to
 * name, and counts them once naming them all would be a paragraph.
 */
function unorderableMessage(
  lines: readonly (AvailabilityLine & { product: { name: string } })[],
  unorderable: readonly UnorderableLine[],
): string {
  if (unorderable.length > 1) {
    return `${unorderable.length} items in your cart are no longer available.`
  }
  const [only] = unorderable
  if (!only) return 'Your cart is no longer available.'
  const name = lines.find((l) => l.productId === only.productId)?.product.name ?? 'An item'
  switch (only.problem.kind) {
    case 'unavailable':
      return `${name} is no longer available.`
    case 'out_of_stock':
      return `${name} just sold out.`
    case 'insufficient':
      return `Only ${only.problem.available} of ${name} left.`
  }
}

const newAddressSchema = z.object({
  label: z.string().min(1).max(40),
  recipient: z.string().min(1).max(120),
  phone: phoneField,
  divisionId: z.string().min(1).max(40),
  city: z.string().min(1).max(120),
  township: z.string().min(1).max(120),
  street: z.string().min(1).max(200),
  landmark: z.string().max(200).nullable().optional(),
  telegramUsername: optionalTelegram,
  mapsUrl: optionalMapsUrl,
  saveToAccount: z.boolean().optional().default(false),
})

const bodySchema = z
  .object({
    shippingAddressId: z.string().regex(UUID_RE).optional(),
    newAddress: newAddressSchema.optional(),
    paymentMethodId: z.string().min(1).max(40),
    notes: z.string().max(1000).optional().nullable(),
  })
  .refine((b) => Boolean(b.shippingAddressId) !== Boolean(b.newAddress), {
    message: 'Provide either shippingAddressId or newAddress (not both).',
  })

export async function POST(req: Request): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return fail('UNAUTHENTICATED', 'Sign in required.', 401)
  }
  const userId = session.user.id

  const limit = rateLimit({
    key: clientKey(req, `orders:${userId}`),
    limit: 10,
    windowMs: 60 * 60 * 1000,
  })
  if (!limit.allowed) {
    return rateLimited('Too many orders.', limit.retryAfterSeconds)
  }

  const raw = await req.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return fail('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid body.', 400)
  }

  let shippingAddressId: string
  let divisionId: string
  // Held rather than written. Everything below can still reject the checkout,
  // and a rejected checkout must not leave an address on the customer's account
  // - nor hand an unchecked `divisionId` to the foreign key, which surfaces as
  // a 500 instead of the 400 the division lookup gives.
  let addressToCreate: typeof addresses.$inferInsert | null = null
  // Copied onto the order below rather than read back through the address FK.
  // Address rows stay editable and deletable by the customer, so the join was
  // never a stable answer to "where does this parcel go".
  let ship: {
    recipient: string
    phone: string
    telegram: string | null
    city: string
    township: string
    street: string
    landmark: string | null
    mapsUrl: string | null
  }

  if (parsed.data.shippingAddressId) {
    const [addr] = await db
      .select()
      .from(addresses)
      .where(and(eq(addresses.id, parsed.data.shippingAddressId), eq(addresses.userId, userId)))
      .limit(1)
    if (!addr) {
      return fail('NOT_FOUND', 'Address not found.', 404)
    }
    shippingAddressId = addr.id
    divisionId = addr.divisionId
    ship = {
      recipient: addr.recipient,
      phone: addr.phone,
      telegram: addr.telegramUsername,
      city: addr.city,
      township: addr.township,
      street: addr.street,
      landmark: addr.landmark,
      mapsUrl: addr.mapsUrl,
    }
  } else if (parsed.data.newAddress) {
    const na = parsed.data.newAddress
    divisionId = na.divisionId
    shippingAddressId = randomUUID()
    addressToCreate = {
      id: shippingAddressId,
      userId,
      label: na.saveToAccount ? na.label : `Order ${new Date().toISOString().slice(0, 10)}`,
      recipient: na.recipient,
      phone: na.phone,
      divisionId: na.divisionId,
      city: na.city,
      township: na.township,
      street: na.street,
      landmark: na.landmark ?? null,
      telegramUsername: na.telegramUsername,
      mapsUrl: na.mapsUrl,
      isDefault: false,
    }
    ship = {
      recipient: na.recipient,
      phone: na.phone,
      telegram: na.telegramUsername,
      city: na.city,
      township: na.township,
      street: na.street,
      landmark: na.landmark ?? null,
      mapsUrl: na.mapsUrl,
    }
  } else {
    return fail('VALIDATION_ERROR', 'Missing address.', 400)
  }

  const [division] = await db
    .select()
    .from(divisions)
    .where(eq(divisions.id, divisionId))
    .limit(1)
  if (!division || division.isBlocked) {
    return fail('VALIDATION_ERROR', 'Delivery to that division is unavailable.', 400)
  }

  const [method] = await db
    .select()
    .from(paymentMethods)
    .where(and(eq(paymentMethods.id, parsed.data.paymentMethodId), eq(paymentMethods.isActive, true)))
    .limit(1)
  if (!method) {
    return fail('VALIDATION_ERROR', 'Payment method unavailable.', 400)
  }

  const lines = await getCartLines()
  if (lines.length === 0) {
    return fail('VALIDATION_ERROR', 'Cart is empty.', 400)
  }

  const subtotal = cartSubtotal(lines)
  const deliveryFee = division.deliveryFeeMmk
  const total = subtotal + deliveryFee

  if (method.kind === 'cod') {
    if (!division.codAllowed || total > COD_CAP_MMK) {
      return fail('VALIDATION_ERROR', `Cash on Delivery is available only for Yangon/Mandalay order totals up to ${formatMmk(COD_CAP_MMK)}. Online payment is required above this amount.`, 400)
    }
  }

  // Snapshot stock check only - no decrement yet. Stock is held against the
  // physical inventory at payment confirmation (admin flips to `paid` for
  // wallet, `confirmed` for COD). Avoids "ghost reservations" when checkout
  // succeeds but slip upload fails or customer abandons.
  //
  // Every bad line, not the first: the customer fixes the cart in one pass
  // instead of resubmitting to discover the next one. `isActive` is checked
  // here too - it used to be read when adding to the cart and never again, so
  // a product retired in /admin still ordered while stock remained.
  const unorderable = unorderableLines(lines)
  if (unorderable.length > 0) {
    return fail('CART_UNORDERABLE', unorderableMessage(lines, unorderable), 409, {
      lines: unorderable,
    })
  }

  const orderId = randomUUID()
  const expiresAt = new Date(Date.now() + ORDER_EXPIRY_MS)

  await db.transaction(async (tx) => {
    // Inside the transaction so the address and the order it exists for are
    // written together or not at all.
    if (addressToCreate) {
      await tx.insert(addresses).values(addressToCreate)
    }

    await tx.insert(orders).values({
      id: orderId,
      userId,
      status: 'pending_payment',
      subtotalMmk: subtotal,
      deliveryFeeMmk: deliveryFee,
      totalMmk: total,
      shippingAddressId,
      shipRecipient: ship.recipient,
      shipPhone: ship.phone,
      shipTelegram: ship.telegram,
      shipDivisionId: divisionId,
      shipDivisionName: division.name,
      shipCity: ship.city,
      shipTownship: ship.township,
      shipStreet: ship.street,
      shipLandmark: ship.landmark,
      shipMapsUrl: ship.mapsUrl,
      paymentMethodId: method.id,
      paymentRef: orderId,
      expiresAt,
      notes: parsed.data.notes ?? null,
    })

    await tx.insert(orderItems).values(
      lines.map((l) => ({
        orderId,
        productId: l.productId,
        qty: l.qty,
        unitPriceMmkSnapshot: effectiveUnitPrice(l.product.priceMmk, l.product.salePriceMmk),
        listPriceMmkSnapshot: isOnSale(l.product.priceMmk, l.product.salePriceMmk)
          ? l.product.priceMmk
          : null,
        nameSnapshot: l.product.name,
      })),
    )
  })

  await clearCart()

  // The buyer hears nothing else until we confirm, so this carries what they
  // need in the meantime: what they bought, and for a wallet order, where to
  // send the money. Failures are swallowed - a dead SMTP must never lose an
  // order that is already committed.
  if (session.user.email) {
    await sendMail({
      to: session.user.email,
      subject:
        method.kind === 'wallet'
          ? `Order ${shortOrderId(orderId)} - placed, transfer to complete`
          : `Order ${shortOrderId(orderId)} - placed, we will call to confirm`,
      react: OrderPlaced({
        orderId,
        orderUrl: orderUrl(orderId),
        method: method.name,
        kind: method.kind,
        accountName: method.accountName,
        accountPhone: method.accountPhone,
        total: formatMmk(total),
        subtotal: formatMmk(subtotal),
        deliveryFee: formatMmk(deliveryFee),
        placedAt: new Date().toISOString(),
        items: lines.map((l) => ({
          qty: l.qty,
          name: l.product.name,
          lineTotal: formatMmk(effectiveUnitPrice(l.product.priceMmk, l.product.salePriceMmk) * l.qty),
        })),
      }),
    }).catch(() => {})
  }

  const ownerEmail = process.env.EMAIL_FROM?.match(/<(.+)>/)?.[1] ?? 'admin@localhost'
  await sendMail({
    to: ownerEmail,
    subject:
      method.kind === 'cod'
        ? `COD order ${shortOrderId(orderId)} - call to confirm, ${formatMmk(total)}`
        : `New order ${shortOrderId(orderId)} - ${formatMmk(total)}`,
    react: NewOrderAlert({
      orderId,
      adminUrl: adminOrderUrl(orderId),
      total: formatMmk(total),
      subtotal: formatMmk(subtotal),
      deliveryFee: formatMmk(deliveryFee),
      method: method.name,
      kind: method.kind,
      customer: session.user.email ?? userId,
      recipient: ship.recipient,
      phone: ship.phone,
      destination: [ship.township, ship.city, division.name].filter(Boolean).join(', '),
      items: lines.map((l) => ({
        qty: l.qty,
        name: l.product.name,
        lineTotal: formatMmk(effectiveUnitPrice(l.product.priceMmk, l.product.salePriceMmk) * l.qty),
      })),
    }),
  }).catch(() => {})

  // Telegram is a third party. The alert is a nudge to go look at the order, so
  // it carries the reference and a masked address - never the address itself.
  // The full details are in the owner's own inbox via NewOrderAlert above.
  await sendTelegram(
    `🆕 New order ${orderId.slice(0, 8)}\nMethod: ${method.name}\nTotal: ${formatMmk(total)}\nCustomer: ${
      session.user.email ? maskEmail(session.user.email) : '****'
    }`,
  )

  return ok({ orderId })
}

export async function GET(): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return fail('UNAUTHENTICATED', 'Sign in required.', 401)
  }
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, session.user.id))
    .orderBy(desc(orders.placedAt))
  return ok(rows)
}
