import { mysqlTable, varchar, boolean, timestamp, index } from 'drizzle-orm/mysql-core'
import { users } from './auth'
import { divisions } from './divisions'

export const addresses = mysqlTable(
  'addresses',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    label: varchar('label', { length: 40 }).notNull(),
    recipient: varchar('recipient', { length: 120 }).notNull(),
    phone: varchar('phone', { length: 20 }).notNull(),
    divisionId: varchar('division_id', { length: 40 })
      .notNull()
      .references(() => divisions.id, { onDelete: 'restrict' }),
    city: varchar('city', { length: 120 }).notNull(),
    township: varchar('township', { length: 120 }).notNull(),
    street: varchar('street', { length: 200 }).notNull(),
    landmark: varchar('landmark', { length: 200 }),
    /** Bare handle, no `@` and no `t.me/`. Backup channel for the confirm call. */
    telegramUsername: varchar('telegram_username', { length: 32 }),
    /** Google Maps link, validated by `isGoogleMapsUrl` before it is ever stored. */
    mapsUrl: varchar('maps_url', { length: 512 }),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
  },
  (t) => ({
    userIdx: index('idx_addresses_user').on(t.userId),
  }),
)
