import { mysqlTable, varchar, text, boolean, int, timestamp, mysqlEnum } from 'drizzle-orm/mysql-core'

export const paymentMethods = mysqlTable('payment_methods', {
  id: varchar('id', { length: 40 }).primaryKey(),
  name: varchar('name', { length: 60 }).notNull(),
  kind: mysqlEnum('kind', ['wallet', 'cod']).notNull(),
  accountName: varchar('account_name', { length: 120 }),
  accountPhone: varchar('account_phone', { length: 20 }),
  qrImageUrl: varchar('qr_image_url', { length: 255 }),
  instructionsMd: text('instructions_md'),
  sortOrder: int('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})

/**
 * `wallet` or `cod`, derived from the column rather than restated.
 *
 * Which of the two a method is decides the status rail, the customer's status
 * wording, whether a slip is expected, and whether COD rules apply - so it was
 * hand-written in `order-status.ts` and `order-transitions.ts` both. Taking it
 * from the enum means adding a third kind breaks every switch that would need
 * a new arm, instead of type-checking and going missing at runtime.
 */
export type MethodKind = (typeof paymentMethods.$inferSelect)['kind']
