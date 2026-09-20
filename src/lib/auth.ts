import NextAuth, { type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { db } from '@/db'
import { users, accounts, sessions, verificationTokens } from '@/db/schema/auth'
import { sessionSurvives } from '@/lib/auth-tokens'
import { reportError } from '@/lib/report-error'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: 'customer' | 'admin'
    } & DefaultSession['user']
  }
}

const credentialsSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(10).max(200),
})

const hasGoogle = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET)

/**
 * A bcrypt-12 digest of a random value nobody holds. Compared against when no
 * user matches, purely so a failed lookup costs the same wall time as a real
 * one. Never matches any password.
 */
const ABSENT_USER_HASH = '$2b$12$E31s8sxwUuJY8S8A2Q/J7e2J9.UtwI7SzImyK4yfqyryQ/AVu9tzq'

/**
 * The account's `password_changed_at`, `null` when it has never moved, or
 * `undefined` when no such user exists.
 *
 * The three-way answer is the point: a missing row and a NULL column mean
 * opposite things to the caller - one signs the token out, the other adopts it.
 */
async function passwordChangedAt(userId: string): Promise<Date | null | undefined> {
  const [row] = await db
    .select({ at: users.passwordChangedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return row ? row.at : undefined
}

export const { handlers, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: '/signin',
    verifyRequest: '/verify',
    error: '/signin',
  },
  providers: [
    Credentials({
      name: 'email',
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw)
        if (!parsed.success) return null

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, parsed.data.email.toLowerCase()))
          .limit(1)

        // Compare unconditionally. Returning early on "no such user" makes a
        // miss finish in ~5ms against ~250ms for a hit, which is enough of a
        // gap to enumerate registered addresses; hashing against a throwaway
        // digest keeps both paths on the same clock.
        const ok = await bcrypt.compare(
          parsed.data.password,
          user?.passwordHash ?? ABSENT_USER_HASH,
        )
        if (!user || !user.passwordHash || !ok) return null

        // Checked after the comparison so the cost is identical either way. A
        // caller who gets this far already supplied the right password, so
        // learning the account is unverified tells them nothing new.
        if (!user.emailVerified) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          role: user.role,
        }
      },
    }),
    ...(hasGoogle
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID!,
            clientSecret: process.env.AUTH_GOOGLE_SECRET!,
            // Left at the default (false). Enabling it hands an existing
            // account to anyone who can present a Google profile carrying the
            // same address, with no proof they own the local account. Auth.js
            // answers the collision with `error=OAuthAccountNotLinked`, which
            // /signin renders as "sign in with your password first".
          }),
        ]
      : []),
  ],
  callbacks: {
    /**
     * `role` is written once, at sign-in, and the token then lives for 30 days.
     * It is fine for deciding what to show, but it is not an authorisation
     * answer: use `currentRole` / `requireAdmin` from ./admin-guard for that, so
     * a revoked admin loses access on their next request rather than whenever
     * their token happens to expire.
     *
     * The `pwdAt` claim is what makes a password reset evict live sessions.
     * Sessions are stateless, so changing `password_hash` cannot reach a cookie
     * already in someone's browser; carrying the stamp and re-checking it can.
     * Returning null here signs that token out.
     */
    async jwt({ token, user }) {
      if (user && 'id' in user && user.id) {
        token.id = user.id
        token.role = (user as { role?: 'customer' | 'admin' }).role ?? 'customer'
        // Read from the row rather than from `user`: the Google provider and
        // the adapter both hand back a shape without this field, so trusting
        // it would stamp 0 onto an account that has a real timestamp - and the
        // very next request would evict the session that was just created.
        token.pwdAt = (await passwordChangedAt(user.id))?.getTime() ?? 0
        return token
      }

      const id = typeof token.id === 'string' ? token.id : null
      if (!id) return token

      // Returning null clears the session cookie - see `sessionSurvives` for
      // what the three answers mean and why the branch is on the column
      // rather than on the claim.
      return sessionSurvives(await passwordChangedAt(id), token.pwdAt) ? token : null
    },
    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string
        session.user.role = (token.role as 'customer' | 'admin') ?? 'customer'
      }
      return session
    },
  },
  events: {
    /**
     * Carries the cookie cart into the account. This fires for every provider,
     * which is the point: the old trigger was a line after `signIn()` in the
     * password form, and Google leaves the page entirely, so anyone signing in
     * with Google watched their basket empty itself.
     *
     * Imported lazily to keep `auth.ts` and `cart-session.ts` from importing
     * each other at module scope - cart-session needs `auth()` to decide whose
     * cart it is holding.
     *
     * A basket is not worth a failed sign-in, so nothing here is allowed to
     * throw - including the reporting. `@auth/core` awaits this event before
     * it attaches the session cookie to the response, so an exception escaping
     * here does not just skip the merge: it fails the whole sign-in and sends
     * a correct password to `/signin?error=Configuration` with no cookie set.
     */
    async signIn({ user }) {
      if (!user?.id) return
      try {
        const { mergeGuestCartToUser } = await import('./cart-session')
        await mergeGuestCartToUser(user.id)
      } catch (error) {
        try {
          await reportError(error, { path: 'events.signIn', method: 'cart-merge' })
        } catch {
          // Reporting a failed merge must not be able to fail the login either.
        }
      }
    },

    /**
     * Signing out drops the guest cart cookie too. Without this the browser
     * keeps a guest identity the account has finished with, and the next
     * person to sign in here inherits whatever it collects in between.
     */
    async signOut() {
      try {
        const { clearGuestSession } = await import('./cart-session')
        await clearGuestSession()
      } catch {
        // A leftover cookie is not worth failing a sign-out over.
      }
    },
  },
  trustHost: true,
})
