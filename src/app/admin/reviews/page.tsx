import { desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { reviews } from '@/db/schema/reviews'
import { products } from '@/db/schema/products'
import { users } from '@/db/schema/auth'
import { AdminReviewsList } from './reviews-list'

export default async function AdminReviewsPage() {
  const rows = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      status: reviews.status,
      verifiedPurchase: reviews.verifiedPurchase,
      createdAt: reviews.createdAt,
      productName: products.name,
      productSlug: products.slug,
      userEmail: users.email,
      userName: users.name,
    })
    .from(reviews)
    .innerJoin(products, eq(products.id, reviews.productId))
    .innerJoin(users, eq(users.id, reviews.userId))
    .orderBy(desc(reviews.createdAt))

  return (
    <div>
      <h2 className="font-display text-[26px]">Reviews</h2>
      <p className="mt-2 text-[14px] text-muted">
        Approve to publish on PDP. Reject to hide permanently.
      </p>
      <AdminReviewsList
        initial={rows.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
