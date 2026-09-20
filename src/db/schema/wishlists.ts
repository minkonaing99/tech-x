import { mysqlTable, varchar, timestamp, primaryKey } from 'drizzle-orm/mysql-core'
import { users } from './auth'
import { products } from './products'

export const wishlists = mysqlTable(
  'wishlists',
  {
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    productId: varchar('product_id', { length: 64 })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at').defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.productId] }),
  }),
)
