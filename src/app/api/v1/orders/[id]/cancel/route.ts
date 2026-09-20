import { NextResponse } from 'next/server'
import { fail, ok, rateLimited } from '@/lib/api-response'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { orders } from '@/db/schema/orders'
import { auth } from '@/lib/auth'
import { UUID_RE } from '@/lib/ids'
import { clientKey, rateLimit } from '@/lib/rate-limit'
import { sendMail } from '@/lib/mail'
import { orderUrl, shopUrl } from '@/lib/links'
import { shortOrderId } from '@/lib/order-status'
import { OrderCancelled } from '@emails/order-cancelled'


export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) return fail('UNAUTHENTICATED', 'Sign in required.', 401)
  const userId = session.user.id

  const { id } = await params
  if (!UUID_RE.test(id)) return fail('VALIDATION_ERROR', 'Invalid id.', 400)

  const limit = rateLimit({
    key: clientKey(req, `cancel:${userId}`),
    limit: 5,
    windowMs: 60 * 60 * 1000,
  })
  if (!limit.allowed) {
    return rateLimited('Too many cancel attempts.', limit.retryAfterSeconds)
  }

  // Pending orders never held physical stock (committed only at `paid`/
  // `confirmed`), so cancel is a pure status flip - no inventory math.
  const result = await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.userId, userId)))
      .limit(1)
    if (!order) return { kind: 'NOT_FOUND' as const }
    if (order.status !== 'pending_payment') return { kind: 'CONFLICT' as const }

    await tx.update(orders).set({ status: 'cancelled' }).where(eq(orders.id, id))

    return { kind: 'OK' as const, total: Number(order.totalMmk) }
  })

  if (result.kind === 'NOT_FOUND') return fail('NOT_FOUND', 'Order not found.', 404)
  if (result.kind === 'CONFLICT') {
    return fail('CONFLICT', 'Only pending orders can be cancelled. Contact us via Telegram.', 409)
  }

  await sendMail({
    to: session.user.email ?? '',
    subject: `Order ${shortOrderId(id)} - cancelled`,
    react: OrderCancelled({
      orderId: id,
      orderUrl: orderUrl(id),
      shopUrl: shopUrl(),
      reason: 'Customer cancelled.',
    }),
  }).catch(() => {})

  return ok({ ok: true })
}
