import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { wishlists } from '@/db/schema/wishlists'
import { products } from '@/db/schema/products'
import { auth } from '@/lib/auth'
import { ProductCard } from '@/components/product/card'
import type { Product } from '@/lib/types'
import type { CategoryId } from '@/lib/categories'

export default async function WishlistPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const rows = await db
    .select({ product: products })
    .from(wishlists)
    .innerJoin(products, eq(products.id, wishlists.productId))
    .where(eq(wishlists.userId, session.user.id))

  const items: Product[] = rows.map((r) => ({
    id: r.product.id,
    slug: r.product.slug,
    name: r.product.name,
    category: r.product.categoryId as CategoryId,
    price: Number(r.product.priceMmk),
    salePrice: r.product.salePriceMmk === null ? null : Number(r.product.salePriceMmk),
    tagline: r.product.tagline,
    description: r.product.description,
    specs: [],
    swatch: r.product.swatch,
    inStock: r.product.stockQty > 0,
    stockQty: r.product.stockQty,
    lowStockThreshold: r.product.lowStockThreshold,
    hasPhotos: Boolean(r.product.hasPhotos),
    featured: r.product.featured,
    createdAt: r.product.createdAt.toISOString(),
    updatedAt: r.product.updatedAt.toISOString(),
  }))

  return (
    <div>
      <h2 className="font-display text-[28px]">Wishlist</h2>
      {items.length === 0 ? (
        <p className="mt-6 text-[14px] text-muted">
          Empty. Tap the heart on any product to save it here.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
