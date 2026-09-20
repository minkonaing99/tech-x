import { mysqlTable, varchar, bigint, boolean, int, timestamp } from 'drizzle-orm/mysql-core'

export const divisions = mysqlTable('divisions', {
  id: varchar('id', { length: 40 }).primaryKey(),
  name: varchar('name', { length: 60 }).notNull(),
  deliveryFeeMmk: bigint('delivery_fee_mmk', { mode: 'number' }).notNull(),
  codAllowed: boolean('cod_allowed').notNull().default(false),
  isBlocked: boolean('is_blocked').notNull().default(false),
  sortOrder: int('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})
