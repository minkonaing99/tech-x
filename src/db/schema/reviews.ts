import {
  mysqlTable,
  varchar,
  text,
  tinyint,
  timestamp,
  mysqlEnum,
  unique,
  index,
} from 'drizzle-orm/mysql-core'
import { users } from './auth'
import { products } from './products'
import { boolean } from 'drizzle-orm/mysql-core'

export const reviews = mysqlTable(
  'reviews',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    productId: varchar('product_id', { length: 64 })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rating: tinyint('rating').notNull(),
    title: varchar('title', { length: 120 }),
    body: text('body').notNull(),
    status: mysqlEnum('status', ['pending', 'approved', 'rejected'])
      .notNull()
      .default('pending'),
    verifiedPurchase: boolean('verified_purchase').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    productStatusIdx: index('idx_reviews_product_status').on(t.productId, t.status),
    uniqueUserProduct: unique('uniq_review_user_product').on(t.userId, t.productId),
  }),
)
