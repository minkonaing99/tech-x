import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'
import { getDatabaseUrl } from './src/db/url'

config({ path: '.env.local' })
config({ path: '.env', override: false })

/**
 * `db:generate` and `db:push` only. Fresh databases use
 * `scripts/db-bootstrap.sql`. `out` is scratch space for generated SQL.
 */
export default defineConfig({
  schema: './src/db/schema/*',
  out: './.drizzle-generated',
  dialect: 'mysql',
  dbCredentials: { url: getDatabaseUrl() },
  strict: true,
  verbose: true,
})
