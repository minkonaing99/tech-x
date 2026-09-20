import { NextResponse } from 'next/server'
import { fail, ok } from '@/lib/api-response'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { and, eq, sql } from 'drizzle-orm'
import { db } from '@/db'
import { orders, orderItems, type OrderStatus } from '@/db/schema/orders'
import { paymentMethods } from '@/db/schema/payment-methods'
import { products } from '@/db/schema/products'
import { users } from '@/db/schema/auth'
import { requireAdmin } from '@/lib/admin-guard'
import { UUID_RE } from '@/lib/ids'
import { canTransition } from '@/lib/order-transitions'
import { shortOrderId } from '@/lib/order-status'
import { sendMail } from '@/lib/mail'
import { formatMmk } from '@/lib/money'
import { adminProductsUrl, orderUrl, shopUrl } from '@/lib/links'
import { OrderInvoice } from '@emails/order-invoice'
import { OrderDelivered } from '@emails/order-delivered'
import { OrderCancelled } from '@emails/order-cancelled'
import { LowStockAlert } from '@emails/low-stock-alert'

const STOCK_COMMIT_STATUSES = new Set<OrderStatus>(['confirmed'])
const LOW_STOCK_DEFAULT = 3

/** Internal transaction-abort signal. Never leaves this file as-is. */
const OUT_OF_STOCK_PREFIX = 'OUT_OF_STOCK:'


const patchSchema = z.object({
  status: z.enum([
    'pending_payment',
    'payment_submitted',
    'confirmed',
    'delivered',
    'cancelled',
  ]),
  notes: z.string().max(2000).optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await params
  if (!UUID_RE.test(id)) {
    return fail('VALIDATION_ERROR', 'Invalid id.', 400)
  }
  const raw = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return fail('VALIDATION_ERROR', 'Invalid status.', 400)
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1)
  if (!order) {
    return fail('NOT_FOUND', 'Order not found.', 404)
  }

  const [method] = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.id, order.paymentMethodId))
    .limit(1)
  const kind = method?.kind === 'cod' ? 'cod' : 'wallet'

  if (!canTransition(order.status, parsed.data.status, kind)) {
    return fail('CONFLICT', `Cannot transition ${order.status} → ${parsed.data.status}.`, 409)
  }

  const patch: { status: OrderStatus; notes?: string } = { status: parsed.data.status }
  if (parsed.data.notes !== undefined) patch.notes = parsed.data.notes

  const next = parsed.data.status
  const prev = order.status
  const isCommitting = STOCK_COMMIT_STATUSES.has(next) && !STOCK_COMMIT_STATUSES.has(prev)
  const isReleasing = next === 'cancelled' && STOCK_COMMIT_STATUSES.has(prev)

  // Stock is moved only at payment-confirmation boundaries (`paid` or
  // `confirmed`). Pending orders never hold physical inventory.
  const lowStockBreaches: { id: string; remaining: number; name: string }[] = []
  try {
    await db.transaction(async (tx) => {
      if (isCommitting) {
        const items = await tx
          .select({ productId: orderItems.productId, qty: orderItems.qty })
          .from(orderItems)
          .where(eq(orderItems.orderId, id))
        for (const it of items) {
          const res = await tx
            .update(products)
            .set({ stockQty: sql`${products.stockQty} - ${it.qty}` })
            .where(and(eq(products.id, it.productId), sql`${products.stockQty} >= ${it.qty}`))
          // drizzle/mysql2 returns [ResultSetHeader, FieldPacket[]];
          // the header (with affectedRows) is res[0], NOT res.
          const header = Array.isArray(res) ? res[0] : res
          const affected = (header as { affectedRows?: number } | undefined)?.affectedRows ?? 0
          if (affected === 0) {
            throw new Error(`${OUT_OF_STOCK_PREFIX}${it.productId}`)
          }
          const [row] = await tx
            .select({ name: products.name, stockQty: products.stockQty, threshold: products.lowStockThreshold })
            .from(products)
            .where(eq(products.id, it.productId))
            .limit(1)
          if (row && row.stockQty <= (row.threshold ?? LOW_STOCK_DEFAULT)) {
            lowStockBreaches.push({ id: it.productId, remaining: row.stockQty, name: row.name })
          }
        }
      } else if (isReleasing) {
        const items = await tx
          .select({ productId: orderItems.productId, qty: orderItems.qty })
          .from(orderItems)
          .where(eq(orderItems.orderId, id))
        for (const it of items) {
          await tx
            .update(products)
            .set({ stockQty: sql`${products.stockQty} + ${it.qty}` })
            .where(eq(products.id, it.productId))
        }
      }

      await tx.update(orders).set(patch).where(eq(orders.id, id))
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    // The thrown string is how the transaction aborts; it is not an answer.
    // Unpacked here so the id reaches the client as `details`, and `message`
    // stays a sentence an operator can read.
    if (msg.startsWith(OUT_OF_STOCK_PREFIX)) {
      const productId = msg.slice(OUT_OF_STOCK_PREFIX.length)
      return fail(
        'OUT_OF_STOCK',
        `Not enough stock left for ${productId}. Restock before confirming.`,
        409,
        { productId },
      )
    }
    throw err
  }

  // Stock just moved (decrement on commit OR restore on cancel-from-commit)
  // - bust the catalog cache so shop pages + cart-add checks see the new
  // stockQty immediately instead of waiting 60s for revalidate.
  if (isCommitting || isReleasing) {
    revalidateTag('products')
  }

  const [user] = await db.select().from(users).where(eq(users.id, order.userId)).limit(1)
  const customerEmail = user?.email
  const total = formatMmk(Number(order.totalMmk))
  const placedAt = order.placedAt.toISOString()
  // `order` was read before the update, so its `updatedAt` still holds the
  // previous transition. The one this request just made is now.
  const movedAt = new Date().toISOString()

  // Customer-facing emails: invoice at payment confirmation (paid OR
  // confirmed), delivered note at delivered, cancellation at cancelled.
  // No mail on shipped - invoice email already told them shipping is next.
  if (customerEmail && next !== prev) {
    if (isCommitting) {
      const itemRows = await db
        .select({
          qty: orderItems.qty,
          name: orderItems.nameSnapshot,
          unitPriceMmkSnapshot: orderItems.unitPriceMmkSnapshot,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, id))
      await sendMail({
        to: customerEmail,
        subject: `Order ${shortOrderId(id)} - payment confirmed`,
        react: OrderInvoice({
          orderId: id,
          orderUrl: orderUrl(id),
          total,
          subtotal: formatMmk(Number(order.subtotalMmk)),
          deliveryFee: formatMmk(Number(order.deliveryFeeMmk)),
          method: method?.name ?? order.paymentMethodId,
          kind,
          placedAt,
          updatedAt: movedAt,
          items: itemRows.map((it) => ({
            qty: it.qty,
            name: it.name,
            lineTotal: formatMmk(Number(it.unitPriceMmkSnapshot) * it.qty),
          })),
        }),
      }).catch(() => {})
    } else if (next === 'delivered') {
      await sendMail({
        to: customerEmail,
        subject: `Order ${shortOrderId(id)} - delivered`,
        react: OrderDelivered({
          orderId: id,
          orderUrl: orderUrl(id),
          kind,
          placedAt,
          updatedAt: movedAt,
        }),
      }).catch(() => {})
    } else if (next === 'cancelled') {
      await sendMail({
        to: customerEmail,
        subject: `Order ${shortOrderId(id)} - cancelled`,
        react: OrderCancelled({
          orderId: id,
          orderUrl: orderUrl(id),
          shopUrl: shopUrl(),
          reason: patch.notes ?? 'Cancelled by Tech X.',
        }),
      }).catch(() => {})
    }
  }

  if (lowStockBreaches.length > 0) {
    const ownerEmail = process.env.EMAIL_FROM?.match(/<(.+)>/)?.[1] ?? 'admin@localhost'
    for (const b of lowStockBreaches) {
      await sendMail({
        to: ownerEmail,
        subject: b.remaining <= 0 ? `Sold out: ${b.name}` : `Low stock: ${b.name}`,
        react: LowStockAlert({
          productName: b.name,
          remaining: b.remaining,
          adminUrl: adminProductsUrl(),
        }),
      }).catch(() => {})
    }
  }

  return ok({ ok: true })
}
