import { NextResponse } from 'next/server'
import { fail, ok } from '@/lib/api-response'
import { z } from 'zod'
import { isCategoryId } from '@/lib/categories'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { products, productSpecs } from '@/db/schema/products'
import { orderItems } from '@/db/schema/orders'
import { requireAdmin } from '@/lib/admin-guard'
import { PRODUCT_ID_RE } from '@/lib/ids'
import { isValidSalePrice, salePriceMessage } from '@/lib/pricing'
import { deletePublic } from '@/lib/r2'
import { revalidateTag } from 'next/cache'


const specSchema = z.object({
  label: z.string().min(1).max(80),
  value: z.string().min(1).max(200),
})

const patchSchema = z
  .object({
    name: z.string().min(1).max(120),
    tagline: z.string().min(1).max(200),
    description: z.string().min(1).max(8000),
    // Replaces the dropped `products.category_id` foreign key: with no
    // `categories` table there is nothing at the database level stopping an
    // unknown id, which would render a product no shop page can list.
    categoryId: z.string().refine(isCategoryId, 'Unknown category.'),
    priceMmk: z.number().int().min(0).max(999_999_999),
    salePriceMmk: z.number().int().min(0).max(999_999_999).nullable(),
    swatch: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    stockQty: z.number().int().min(0).max(100_000),
    lowStockThreshold: z.number().int().min(0).max(100),
    isActive: z.boolean(),
    featured: z.boolean(),
    sortOrder: z.number().int().min(0).max(100_000),
    hasPhotos: z.boolean(),
    specs: z.array(specSchema).max(40),
  })
  .partial()

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await params
  if (!PRODUCT_ID_RE.test(id)) {
    return fail('VALIDATION_ERROR', 'Invalid id.', 400)
  }
  const raw = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return fail('VALIDATION_ERROR', 'Invalid body.', 400)
  }

  const { specs, ...fields } = parsed.data

  // Either price field can invalidate the pair, so a write touching one has to
  // be checked against the stored value of the other. Read outside the
  // transaction, and only when a price is actually in play - a stock or photo
  // toggle must not pay for an extra query.
  if ('priceMmk' in fields || 'salePriceMmk' in fields) {
    const [row] = await db
      .select({ priceMmk: products.priceMmk, salePriceMmk: products.salePriceMmk })
      .from(products)
      .where(eq(products.id, id))
      .limit(1)
    if (!row) return fail('NOT_FOUND', 'Product not found.', 404)

    const nextPrice = fields.priceMmk ?? Number(row.priceMmk)
    // `??` would be wrong here: an explicit null is the admin clearing the
    // sale, and `??` would fall through to the stored price and refuse it.
    const nextSale =
      'salePriceMmk' in fields
        ? fields.salePriceMmk ?? null
        : row.salePriceMmk === null
          ? null
          : Number(row.salePriceMmk)

    if (!isValidSalePrice(nextPrice, nextSale)) {
      return fail('VALIDATION_ERROR', salePriceMessage(nextPrice, nextSale), 400)
    }
  }

  await db.transaction(async (tx) => {
    if (Object.keys(fields).length > 0) {
      await tx.update(products).set(fields).where(eq(products.id, id))
    }
    if (specs !== undefined) {
      await tx.delete(productSpecs).where(eq(productSpecs.productId, id))
      if (specs.length > 0) {
        await tx.insert(productSpecs).values(
          specs.map((s, i) => ({
            productId: id,
            label: s.label,
            value: s.value,
            sortOrder: i,
          })),
        )
      }
    }
  })

  revalidateTag('products')
  return ok({ ok: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await params
  if (!PRODUCT_ID_RE.test(id)) {
    return fail('VALIDATION_ERROR', 'Invalid id.', 400)
  }

  const [row] = await db
    .select({ slug: products.slug })
    .from(products)
    .where(eq(products.id, id))
    .limit(1)
  if (!row) {
    return fail('NOT_FOUND', 'Product not found.', 404)
  }

  // Refuse hard-delete when any order references this product - orders
  // need to keep their referential history intact. Admin should flip
  // is_active = false instead (soft delete; hides from /shop, preserves
  // order rows).
  const [refOrder] = await db
    .select({ id: orderItems.id })
    .from(orderItems)
    .where(eq(orderItems.productId, id))
    .limit(1)
  if (refOrder) {
    return fail('CONFLICT', 'Product is referenced by existing orders. Toggle "Active" off to hide it instead.', 409)
  }

  // Safe to hard-delete. FK cascades will clean product_specs, reviews,
  // cart_items, wishlists. R2 objects (hero + thumb for each slot) are
  // not cascaded - drop them best-effort. revalidate the catalog cache.
  await db.delete(products).where(eq(products.id, id))

  const slug = row.slug
  const slots = ['01', '02', '03', '04']
  await Promise.allSettled(
    slots.flatMap((s) => [
      deletePublic(`products/${slug}/${s}.webp`),
      deletePublic(`products/${slug}/${s}-thumb.webp`),
    ]),
  )

  revalidateTag('products')
  return ok({ ok: true })
}
