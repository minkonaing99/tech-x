import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'
import { getDatabaseUrl } from './src/db/url'

config({ path: '.env.local' })
config({ path: '.env', override: false })

/**
 * `db:generate` and `db:push` only. There is no migration history: the tables
 * come from `docs/db-bootstrap.sql` and `drizzle-kit migrate` is not wired up
 * (see docs/SCHEMA.md). `out` is a scratch directory to read generated SQL
 * from and then delete - nothing reads it back.
 */
export default defineConfig({
  schema: './src/db/schema/*',
  out: './.drizzle-generated',
  dialect: 'mysql',
  dbCredentials: { url: getDatabaseUrl() },
  strict: true,
  verbose: true,
})
