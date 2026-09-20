import {
  mysqlTable,
  varchar,
  text,
  int,
  timestamp,
  primaryKey,
  mysqlEnum,
  index,
} from 'drizzle-orm/mysql-core'
import type { AdapterAccountType } from 'next-auth/adapters'

export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 120 }),
  email: varchar('email', { length: 254 }).notNull().unique(),
  emailVerified: timestamp('email_verified', { fsp: 3 }),
  passwordHash: varchar('password_hash', { length: 60 }),
  /**
   * When the password last moved, or NULL if it has not since this column
   * shipped. Sessions are stateless JWTs, so this is what lets a reset evict
   * them: the token carries the value it was minted with and `auth.ts`
   * refuses any token that no longer agrees.
   *
   * NULL is load-bearing - it means "adopt whatever token this user holds",
   * which is what keeps the deploy from signing every customer out at once.
   * Every writer of `password_hash` must write this too.
   */
  passwordChangedAt: timestamp('password_changed_at', { fsp: 3 }),
  image: varchar('image', { length: 500 }),
  role: mysqlEnum('role', ['customer', 'admin']).notNull().default('customer'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})

export const accounts = mysqlTable(
  'accounts',
  {
    userId: varchar('userId', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 40 }).$type<AdapterAccountType>().notNull(),
    provider: varchar('provider', { length: 80 }).notNull(),
    providerAccountId: varchar('providerAccountId', { length: 200 }).notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: int('expires_at'),
    token_type: varchar('token_type', { length: 40 }),
    scope: varchar('scope', { length: 500 }),
    id_token: text('id_token'),
    session_state: varchar('session_state', { length: 500 }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
    userIdx: index('idx_accounts_user').on(t.userId),
  }),
)

/**
 * Always empty, and kept anyway.
 *
 * `src/lib/auth.ts` runs `session: { strategy: 'jwt' }`, so no row is ever
 * written here - the session lives in a cookie. `DrizzleAdapter` still takes
 * `sessionsTable` as a required argument and would need this shape the moment
 * the strategy changed, so dropping the table buys one unused `CREATE TABLE`
 * back and costs a migration to undo.
 *
 * Do not read it to answer "is this caller signed in". That is `auth()`, and
 * for anything authorising an admin action, `currentRole()` in
 * `src/lib/admin-guard.ts`.
 */
export const sessions = mysqlTable('sessions', {
  sessionToken: varchar('session_token', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires').notNull(),
})

export const TOKEN_PURPOSES = ['verify', 'reset'] as const
export type TokenPurpose = (typeof TOKEN_PURPOSES)[number]

export const verificationTokens = mysqlTable(
  'verification_tokens',
  {
    identifier: varchar('identifier', { length: 254 }).notNull(),
    token: varchar('token', { length: 255 }).notNull(),
    /**
     * What the token is good for. Without it the two flows share one table
     * keyed only by (email, hash), so a token minted to verify an address
     * would be accepted by the reset route and vice versa. Every read filters
     * on it; `verify` is the default so rows written before this column, and
     * anything Auth.js's adapter writes, stay valid.
     */
    purpose: mysqlEnum('purpose', TOKEN_PURPOSES).notNull().default('verify'),
    expires: timestamp('expires').notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.identifier, t.token] }),
  }),
)
