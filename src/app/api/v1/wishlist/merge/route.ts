import { NextResponse } from 'next/server'
import { fail, ok } from '@/lib/api-response'
import { z } from 'zod'
import { sql } from 'drizzle-orm'
import { db } from '@/db'
import { wishlists } from '@/db/schema/wishlists'
import { auth } from '@/lib/auth'
import { PRODUCT_ID_RE } from '@/lib/ids'

const bodySchema = z.object({
  productIds: z.array(z.string().regex(PRODUCT_ID_RE)).max(200),
})

export async function POST(req: Request): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return fail('UNAUTHENTICATED', 'Sign in required.', 401)
  }
  const raw = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return fail('VALIDATION_ERROR', 'Invalid body.', 400)
  }
  /*
   * One statement, and the primary key absorbs anything already saved - the
   * `set` is a no-op write of the key back onto itself.
   *
   * This replaced a per-id insert wrapped in a bare `catch {}`. That swallowed
   * a stale product id or a database blip just as quietly as it swallowed a
   * duplicate, and answered `ok` either way, so the browser cleared its local
   * list against a merge that never happened.
   */
  const { productIds } = parsed.data
  if (productIds.length > 0) {
    await db
      .insert(wishlists)
      .values(productIds.map((productId) => ({ userId: session.user.id, productId })))
      .onDuplicateKeyUpdate({ set: { userId: sql`user_id` } })
  }
  return ok({ ok: true })
}
