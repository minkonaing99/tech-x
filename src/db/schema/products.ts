import {
  mysqlTable,
  varchar,
  text,
  int,
  bigint,
  boolean,
  char,
  timestamp,
  index,
} from 'drizzle-orm/mysql-core'
import { relations } from 'drizzle-orm'

export const products = mysqlTable(
  'products',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    slug: varchar('slug', { length: 80 }).notNull().unique(),
    name: varchar('name', { length: 120 }).notNull(),
    /**
     * One of `CATEGORIES` in `src/lib/categories.ts`. No foreign key: the
     * category set is code, not a table. `isCategoryId` in the admin product
     * routes is what keeps this column honest.
     */
    categoryId: varchar('category_id', { length: 32 }).notNull(),
    priceMmk: bigint('price_mmk', { mode: 'number' }).notNull(),
    /** NULL means no sale. When set, must be >= 0 and strictly below `price_mmk`. */
    salePriceMmk: bigint('sale_price_mmk', { mode: 'number' }),
    tagline: varchar('tagline', { length: 200 }).notNull(),
    description: text('description').notNull(),
    swatch: char('swatch', { length: 7 }).notNull(),
    stockQty: int('stock_qty').notNull().default(0),
    lowStockThreshold: int('low_stock_threshold').notNull().default(3),
    hasPhotos: boolean('has_photos').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    featured: boolean('featured').notNull().default(false),
    sortOrder: int('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (t) => ({
    categoryIdx: index('idx_products_category').on(t.categoryId),
    featuredIdx: index('idx_products_featured').on(t.featured),
    activeIdx: index('idx_products_is_active').on(t.isActive),
    sortIdx: index('idx_products_sort').on(t.sortOrder),
  }),
)

export const productSpecs = mysqlTable(
  'product_specs',
  {
    id: bigint('id', { mode: 'number' }).autoincrement().primaryKey(),
    productId: varchar('product_id', { length: 64 })
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 80 }).notNull(),
    value: varchar('value', { length: 200 }).notNull(),
    sortOrder: int('sort_order').notNull().default(0),
  },
  (t) => ({
    productIdx: index('idx_specs_product').on(t.productId, t.sortOrder),
  }),
)

export const productRelations = relations(products, ({ many }) => ({
  specs: many(productSpecs),
}))

export const productSpecRelations = relations(productSpecs, ({ one }) => ({
  product: one(products, {
    fields: [productSpecs.productId],
    references: [products.id],
  }),
}))
