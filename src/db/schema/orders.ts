import {
  mysqlTable,
  varchar,
  bigint,
  int,
  text,
  timestamp,
  mysqlEnum,
  index,
} from 'drizzle-orm/mysql-core'
import { users } from './auth'
import { addresses } from './addresses'
import { products } from './products'
import { paymentMethods } from './payment-methods'

export const ORDER_STATUSES = [
  'pending_payment',
  'payment_submitted',
  'confirmed',
  'delivered',
  'cancelled',
] as const

export const orders = mysqlTable(
  'orders',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    status: mysqlEnum('status', ORDER_STATUSES).notNull().default('pending_payment'),
    subtotalMmk: bigint('subtotal_mmk', { mode: 'number' }).notNull(),
    deliveryFeeMmk: bigint('delivery_fee_mmk', { mode: 'number' }).notNull(),
    totalMmk: bigint('total_mmk', { mode: 'number' }).notNull(),
    shippingAddressId: varchar('shipping_address_id', { length: 36 }).references(
      () => addresses.id,
      { onDelete: 'set null' },
    ),
    /**
     * Where this order actually ships, frozen at placement.
     *
     * The `shipping_address_id` link above is a convenience only. Address rows
     * are editable and deletable by the customer, so reading delivery details
     * through the join meant an edit on Wednesday silently redirected an
     * undelivered order placed on Monday. `order_items` already snapshots
     * product name and price for the same reason; this is that rule applied to
     * the destination. No foreign keys here on purpose.
     */
    shipRecipient: varchar('ship_recipient', { length: 120 }),
    shipPhone: varchar('ship_phone', { length: 20 }),
    shipTelegram: varchar('ship_telegram', { length: 32 }),
    shipDivisionId: varchar('ship_division_id', { length: 40 }),
    shipDivisionName: varchar('ship_division_name', { length: 60 }),
    shipCity: varchar('ship_city', { length: 120 }),
    shipTownship: varchar('ship_township', { length: 120 }),
    shipStreet: varchar('ship_street', { length: 200 }),
    shipLandmark: varchar('ship_landmark', { length: 200 }),
    shipMapsUrl: varchar('ship_maps_url', { length: 512 }),
    paymentMethodId: varchar('payment_method_id', { length: 40 })
      .notNull()
      .references(() => paymentMethods.id, { onDelete: 'restrict' }),
    paymentProofUrl: varchar('payment_proof_url', { length: 255 }),
    paymentTxRef: varchar('payment_tx_ref', { length: 120 }),
    paymentRef: varchar('payment_ref', { length: 64 }),
    expiresAt: timestamp('expires_at').notNull(),
    notes: text('notes'),
    placedAt: timestamp('placed_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (t) => ({
    userIdx: index('idx_orders_user').on(t.userId),
    statusIdx: index('idx_orders_status').on(t.status),
    placedIdx: index('idx_orders_placed').on(t.placedAt),
    expiresIdx: index('idx_orders_expires').on(t.status, t.expiresAt),
  }),
)

export const orderItems = mysqlTable('order_items', {
  id: bigint('id', { mode: 'number' }).autoincrement().primaryKey(),
  orderId: varchar('order_id', { length: 36 })
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: varchar('product_id', { length: 64 })
    .notNull()
    .references(() => products.id),
  qty: int('qty').notNull(),
  unitPriceMmkSnapshot: bigint('unit_price_mmk_snapshot', { mode: 'number' }).notNull(),
  /** The normal price when this line was discounted; NULL when it was not. */
  listPriceMmkSnapshot: bigint('list_price_mmk_snapshot', { mode: 'number' }),
  nameSnapshot: varchar('name_snapshot', { length: 120 }).notNull(),
})

export type OrderStatus = (typeof ORDER_STATUSES)[number]
