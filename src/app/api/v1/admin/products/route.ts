import { NextResponse } from 'next/server'
import { fail, ok } from '@/lib/api-response'
import { z } from 'zod'
import { isCategoryId } from '@/lib/categories'
import { eq } from 'drizzle-orm'
import { revalidateTag } from 'next/cache'
import { db } from '@/db'
import { products, productSpecs } from '@/db/schema/products'
import { requireAdmin } from '@/lib/admin-guard'
import { SLUG_REGEX } from '@/lib/slugify'
import { isValidSalePrice, salePriceMessage } from '@/lib/pricing'


const specSchema = z.object({
  label: z.string().min(1).max(80),
  value: z.string().min(1).max(200),
})

const bodySchema = z.object({
  slug: z.string().min(2).max(80).regex(SLUG_REGEX),
  name: z.string().min(1).max(120),
  // Replaces the dropped `products.category_id` foreign key: with no
  // `categories` table there is nothing at the database level stopping an
  // unknown id, which would render a product no shop page can list.
  categoryId: z.string().refine(isCategoryId, 'Unknown category.'),
  priceMmk: z.number().int().min(0).max(999_999_999),
  salePriceMmk: z.number().int().min(0).max(999_999_999).nullable().optional().default(null),
  tagline: z.string().min(1).max(200),
  description: z.string().min(1).max(8000),
  swatch: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  stockQty: z.number().int().min(0).max(100_000),
  lowStockThreshold: z.number().int().min(0).max(100),
  isActive: z.boolean(),
  featured: z.boolean(),
  sortOrder: z.number().int().min(0).max(100_000).optional().default(0),
  specs: z.array(specSchema).max(40),
})

export async function POST(req: Request): Promise<NextResponse> {
  const denied = await requireAdmin()
  if (denied) return denied
  const raw = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return fail('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid body.', 400)
  }
  const b = parsed.data

  // Cross-field, so it cannot live in the field schema. Checked here rather
  // than in a `.superRefine` so both product routes share one rule and one
  // message - the PATCH route flattens zod issues into 'Invalid body.'.
  if (!isValidSalePrice(b.priceMmk, b.salePriceMmk)) {
    return fail('VALIDATION_ERROR', salePriceMessage(b.priceMmk, b.salePriceMmk), 400)
  }

  // Slug uniqueness check (id = slug).
  const existing = await db.select({ id: products.id }).from(products).where(eq(products.id, b.slug)).limit(1)
  if (existing.length > 0) {
    return fail('CONFLICT', 'Slug already in use.', 409)
  }

  await db.transaction(async (tx) => {
    await tx.insert(products).values({
      id: b.slug,
      slug: b.slug,
      name: b.name,
      categoryId: b.categoryId,
      priceMmk: b.priceMmk,
      salePriceMmk: b.salePriceMmk,
      tagline: b.tagline,
      description: b.description,
      swatch: b.swatch,
      stockQty: b.stockQty,
      lowStockThreshold: b.lowStockThreshold,
      hasPhotos: false,
      isActive: b.isActive,
      featured: b.featured,
      sortOrder: b.sortOrder,
    })
    if (b.specs.length > 0) {
      await tx.insert(productSpecs).values(
        b.specs.map((s, i) => ({
          productId: b.slug,
          label: s.label,
          value: s.value,
          sortOrder: i,
        })),
      )
    }
  })

  revalidateTag('products')

  return ok({ id: b.slug, slug: b.slug })
}
