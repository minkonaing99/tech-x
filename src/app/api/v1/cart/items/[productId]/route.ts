import { NextResponse } from 'next/server'
import { fail, ok, rateLimited } from '@/lib/api-response'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { products } from '@/db/schema/products'
import { getCartLines, removeCartItem, setCartItemQty } from '@/lib/cart-session'
import { lineProblem, problemCode, problemMessage } from '@/lib/cart-availability'
import { cartSubtotal } from '@/lib/pricing'
import { PRODUCT_ID_RE } from '@/lib/ids'
import { clientKey, rateLimit } from '@/lib/rate-limit'


const patchSchema = z.object({
  qty: z.number().int().min(0).max(99),
})

/** Same bucket and budget as the sibling POST - one cart, one allowance. */
function cartLimit(req: Request) {
  return rateLimit({ key: clientKey(req, 'cart'), limit: 60, windowMs: 60_000 })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ productId: string }> },
): Promise<NextResponse> {
  const limit = cartLimit(req)
  if (!limit.allowed) {
    return rateLimited('Too many requests.', limit.retryAfterSeconds)
  }

  const { productId } = await params
  if (!PRODUCT_ID_RE.test(productId)) {
    return fail('VALIDATION_ERROR', 'Invalid id.', 400)
  }

  const raw = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return fail('VALIDATION_ERROR', 'Invalid body.', 400)
  }

  /*
   * Stock was never consulted here. The zod ceiling of 99 was the only limit,
   * so one unit in the warehouse and a quantity of 99 went through, and the
   * shopper met the refusal at the last click of checkout instead.
   *
   * Emptying a line skips the check on purpose: removing is how a shopper
   * fixes a cart that checkout is refusing, so it cannot be gated on the thing
   * being orderable.
   */
  if (parsed.data.qty > 0) {
    // Live read - the catalog cache is not current enough to refuse on.
    const [row] = await db
      .select({ stockQty: products.stockQty, isActive: products.isActive })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1)
    if (!row) {
      return fail('NOT_FOUND', 'Product not found.', 404)
    }

    const problem = lineProblem({
      productId,
      qty: parsed.data.qty,
      product: { stockQty: row.stockQty, isActive: Boolean(row.isActive) },
    })
    if (problem) {
      return fail(problemCode(problem), problemMessage(problem), 409)
    }
  }

  await setCartItemQty(productId, parsed.data.qty)
  const lines = await getCartLines()
  const subtotal = cartSubtotal(lines)
  return ok({ items: lines, subtotal })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ productId: string }> },
): Promise<NextResponse> {
  const limit = cartLimit(req)
  if (!limit.allowed) {
    return rateLimited('Too many requests.', limit.retryAfterSeconds)
  }

  const { productId } = await params
  if (!PRODUCT_ID_RE.test(productId)) {
    return fail('VALIDATION_ERROR', 'Invalid id.', 400)
  }
  await removeCartItem(productId)
  const lines = await getCartLines()
  const subtotal = cartSubtotal(lines)
  return ok({ items: lines, subtotal })
}
