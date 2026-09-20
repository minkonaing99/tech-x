import { NextResponse } from 'next/server'
import { fail, ok, rateLimited } from '@/lib/api-response'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { reviews } from '@/db/schema/reviews'
import { users } from '@/db/schema/auth'
import { products } from '@/db/schema/products'
import { orderItems, orders } from '@/db/schema/orders'
import { auth } from '@/lib/auth'
import { PRODUCT_ID_RE } from '@/lib/ids'
import { clientKey, rateLimit } from '@/lib/rate-limit'


const bodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().min(1).max(120).optional(),
  body: z
    .string()
    .min(10)
    .max(2000)
    .transform((s) => s.replace(/<[^>]*>/g, '').trim()),
})

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params
  if (!PRODUCT_ID_RE.test(slug)) {
    return fail('VALIDATION_ERROR', 'Invalid slug.', 400)
  }

  const [product] = await db.select().from(products).where(eq(products.slug, slug)).limit(1)
  if (!product) {
    return fail('NOT_FOUND', 'Product not found.', 404)
  }

  const rows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      verifiedPurchase: reviews.verifiedPurchase,
      createdAt: reviews.createdAt,
      userName: users.name,
    })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .where(and(eq(reviews.productId, product.id), eq(reviews.status, 'approved')))
    .orderBy(desc(reviews.createdAt))

  return ok(rows)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return fail('UNAUTHENTICATED', 'Sign in required.', 401)
  }

  const limit = rateLimit({
    key: clientKey(req, `review:${session.user.id}`),
    limit: 5,
    windowMs: 24 * 60 * 60 * 1000,
  })
  if (!limit.allowed) {
    return rateLimited('Too many reviews.', limit.retryAfterSeconds)
  }

  const { slug } = await params
  if (!PRODUCT_ID_RE.test(slug)) {
    return fail('VALIDATION_ERROR', 'Invalid slug.', 400)
  }

  const [product] = await db.select().from(products).where(eq(products.slug, slug)).limit(1)
  if (!product) {
    return fail('NOT_FOUND', 'Product not found.', 404)
  }

  const raw = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return fail('VALIDATION_ERROR', 'Invalid body.', 400)
  }

  // verified-purchase check
  const [purchase] = await db
    .select({ id: orderItems.id })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(eq(orders.userId, session.user.id), eq(orderItems.productId, product.id)))
    .limit(1)

  try {
    await db.insert(reviews).values({
      id: randomUUID(),
      productId: product.id,
      userId: session.user.id,
      rating: parsed.data.rating,
      title: parsed.data.title ?? null,
      body: parsed.data.body,
      status: 'pending',
      verifiedPurchase: Boolean(purchase),
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('uniq_review_user_product') || msg.includes('Duplicate')) {
      return fail('CONFLICT', 'You have already reviewed this product.', 409)
    }
    throw err
  }

  return ok({ ok: true, status: 'pending' })
}
