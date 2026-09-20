import {
  mysqlTable,
  varchar,
  int,
  timestamp,
  primaryKey,
  index,
} from 'drizzle-orm/mysql-core'
import { users } from './auth'
import { products } from './products'

export const carts = mysqlTable(
  'carts',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).references(() => users.id, { onDelete: 'cascade' }),
    sessionId: varchar('session_id', { length: 36 }),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index('idx_carts_user').on(t.userId),
    sessionIdx: index('idx_carts_session').on(t.sessionId),
  }),
)

export const cartItems = mysqlTable(
  'cart_items',
  {
    cartId: varchar('cart_id', { length: 36 })
      .notNull()
      .references(() => carts.id, { onDelete: 'cascade' }),
    productId: varchar('product_id', { length: 64 })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    qty: int('qty').notNull(),
    addedAt: timestamp('added_at').defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.cartId, t.productId] }),
  }),
)
