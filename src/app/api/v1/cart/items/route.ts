import { NextResponse } from 'next/server'
import { fail, ok, rateLimited } from '@/lib/api-response'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { products } from '@/db/schema/products'
import { addCartItem, getCartLines } from '@/lib/cart-session'
import { lineProblem, problemCode, problemMessage } from '@/lib/cart-availability'
import { cartSubtotal } from '@/lib/pricing'
import { PRODUCT_ID_RE } from '@/lib/ids'
import { clientKey, rateLimit } from '@/lib/rate-limit'

const bodySchema = z.object({
  productId: z.string().regex(PRODUCT_ID_RE),
  qty: z.number().int().min(1).max(99).default(1),
})

export async function POST(req: Request): Promise<NextResponse> {
  const limit = rateLimit({ key: clientKey(req, 'cart'), limit: 60, windowMs: 60_000 })
  if (!limit.allowed) {
    return rateLimited('Too many requests.', limit.retryAfterSeconds)
  }

  const raw = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return fail('VALIDATION_ERROR', 'Invalid body.', 400)
  }

  // Live DB read - bypass the catalog cache so stock is current.
  const [row] = await db
    .select({ stockQty: products.stockQty, isActive: products.isActive })
    .from(products)
    .where(eq(products.id, parsed.data.productId))
    .limit(1)
  if (!row) {
    return fail('NOT_FOUND', 'Product not found.', 404)
  }

  /*
   * Against the total the line would end up at, not against the quantity being
   * asked for. Adding sums into whatever is already there, so a check that
   * only reads the request lets two-at-a-time past a stock of three.
   *
   * The old check was `stockQty <= 0` alone, which meant any quantity at all
   * went in as long as the shelf was not completely bare.
   *
   * Read then write, with no lock between: two requests landing together can
   * both see the same "before" and both go in, leaving the line above stock.
   * Deliberately not closed here. The cart is not what stops overselling -
   * that is the conditional decrement at payment confirmation - and a cart
   * that has overshot arrives at a checkout built to show it and offer the
   * reduction. Closing it means holding a row lock across `addCartItem`,
   * which is a different shape of change to this route and to cart-session.
   */
  const existing = (await getCartLines()).find(
    (l) => l.productId === parsed.data.productId,
  )
  const problem = lineProblem({
    productId: parsed.data.productId,
    qty: (existing?.qty ?? 0) + parsed.data.qty,
    product: { stockQty: row.stockQty, isActive: Boolean(row.isActive) },
  })
  if (problem) {
    return fail(problemCode(problem), problemMessage(problem), 409)
  }

  await addCartItem(parsed.data.productId, parsed.data.qty)
  const lines = await getCartLines()
  const subtotal = cartSubtotal(lines)
  return ok({ items: lines, subtotal })
}
