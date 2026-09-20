import { NextResponse } from 'next/server'
import { fail, ok } from '@/lib/api-response'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { wishlists } from '@/db/schema/wishlists'
import { products } from '@/db/schema/products'
import { auth } from '@/lib/auth'
import { PRODUCT_ID_RE } from '@/lib/ids'


async function requireUser() {
  const session = await auth()
  return session?.user?.id ?? null
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ productId: string }> },
): Promise<NextResponse> {
  const userId = await requireUser()
  if (!userId) {
    return fail('UNAUTHENTICATED', 'Sign in required.', 401)
  }
  const { productId } = await params
  if (!PRODUCT_ID_RE.test(productId)) {
    return fail('VALIDATION_ERROR', 'Invalid id.', 400)
  }
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1)
  if (!product) {
    return fail('NOT_FOUND', 'Product not found.', 404)
  }
  try {
    await db.insert(wishlists).values({ userId, productId })
  } catch {
    // ignore duplicates (PK conflict)
  }
  return ok({ ok: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ productId: string }> },
): Promise<NextResponse> {
  const userId = await requireUser()
  if (!userId) {
    return fail('UNAUTHENTICATED', 'Sign in required.', 401)
  }
  const { productId } = await params
  if (!PRODUCT_ID_RE.test(productId)) {
    return fail('VALIDATION_ERROR', 'Invalid id.', 400)
  }
  await db
    .delete(wishlists)
    .where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)))
  return ok({ ok: true })
}
