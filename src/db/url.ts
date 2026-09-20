/**
 * Build the MySQL connection URL.
 *
 * Priority:
 *   1. DATABASE_URL (full URL) - used in local dev, also acceptable in prod.
 *   2. DB_HOST + DB_PORT + DB_USER + DB_PASS + DB_NAME - Hostinger Easy Deploy
 *      exposes credentials as separate fields; we assemble them at runtime.
 */
export function getDatabaseUrl(): string {
  const direct = process.env.DATABASE_URL
  if (direct) return direct

  const host = process.env.DB_HOST
  const user = process.env.DB_USER
  const pass = process.env.DB_PASS
  const name = process.env.DB_NAME
  const port = process.env.DB_PORT ?? '3306'

  if (!host || !user || !pass || !name) {
    throw new Error(
      'Database credentials missing. Set DATABASE_URL, or all of DB_HOST, DB_USER, DB_PASS, DB_NAME (and optional DB_PORT).',
    )
  }

  const encUser = encodeURIComponent(user)
  const encPass = encodeURIComponent(pass)
  const encName = encodeURIComponent(name)

  return `mysql://${encUser}:${encPass}@${host}:${port}/${encName}`
}
