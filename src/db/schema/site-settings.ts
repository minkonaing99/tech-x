import { mysqlTable, varchar, text, timestamp } from 'drizzle-orm/mysql-core'

export const siteSettings = mysqlTable('site_settings', {
  key: varchar('key', { length: 80 }).primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})
