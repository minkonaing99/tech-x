import { asc } from 'drizzle-orm'
import { db } from '@/db'
import { products, productSpecs } from '@/db/schema/products'
import { AdminProductTable } from './product-table'

export const dynamic = 'force-dynamic'

export default async function AdminProductsPage() {
  const [rows, specs] = await Promise.all([
    db.select().from(products).orderBy(asc(products.sortOrder), asc(products.name)),
    db.select().from(productSpecs).orderBy(asc(productSpecs.productId), asc(productSpecs.sortOrder)),
  ])

  const specsByProduct: Record<string, Array<{ label: string; value: string }>> = {}
  for (const s of specs) {
    if (!specsByProduct[s.productId]) specsByProduct[s.productId] = []
    specsByProduct[s.productId]!.push({ label: s.label, value: s.value })
  }

  return (
    <div>
      <h2 className="font-display text-[26px]">Products</h2>
      <p className="mt-2 text-[14px] text-muted">
        Add new products, edit details + specs, manage photos per slot. Save / Discard per section - no auto-save.
      </p>
      <AdminProductTable
        initial={rows.map((r) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          categoryId: r.categoryId,
          priceMmk: Number(r.priceMmk),
          salePriceMmk: r.salePriceMmk === null ? null : Number(r.salePriceMmk),
          tagline: r.tagline,
          description: r.description,
          swatch: r.swatch,
          stockQty: r.stockQty,
          lowStockThreshold: r.lowStockThreshold,
          sortOrder: r.sortOrder,
          featured: r.featured,
          isActive: r.isActive,
          hasPhotos: r.hasPhotos,
          specs: specsByProduct[r.id] ?? [],
        }))}
      />
    </div>
  )
}

