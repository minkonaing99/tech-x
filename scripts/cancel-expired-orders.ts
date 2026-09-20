#!/usr/bin/env node
/**
 * scripts/cancel-expired-orders.ts
 *
 * Cancels stale `pending_payment` orders past their `expires_at` and restores stock.
 * Wire to cron / systemd timer in production.
 *
 *   pnpm cron:cancel-expired
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env', override: false })

import { and, eq, lt } from 'drizzle-orm'
import { db } from '../src/db'
import { orders } from '../src/db/schema/orders'
import { users } from '../src/db/schema/auth'
import { sendMail } from '../src/lib/mail'
import { orderUrl, shopUrl } from '../src/lib/links'
import { shortOrderId } from '../src/lib/order-status'
import { OrderCancelled } from '../emails/order-cancelled'

async function main(): Promise<void> {
  const now = new Date()
  const stale = await db
    .select({ id: orders.id, userId: orders.userId })
    .from(orders)
    .where(and(eq(orders.status, 'pending_payment'), lt(orders.expiresAt, now)))

  if (stale.length === 0) {
    console.log('no expired orders')
    process.exit(0)
  }

  console.log(`expiring ${stale.length} order(s)`)

  for (const { id, userId } of stale) {
    // race-safe status-only flip. Pending orders never held stock under the
    // commit-at-payment model, so no inventory restore is needed.
    await db
      .update(orders)
      .set({ status: 'cancelled' })
      .where(and(eq(orders.id, id), eq(orders.status, 'pending_payment')))

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (user?.email) {
      await sendMail({
        to: user.email,
        subject: `Order ${shortOrderId(id)} - cancelled, payment not received`,
        react: OrderCancelled({
          orderId: id,
          orderUrl: orderUrl(id),
          shopUrl: shopUrl(),
          reason: 'Payment was not received within 24 hours.',
        }),
      }).catch(() => {})
    }
  }

  console.log('done')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
