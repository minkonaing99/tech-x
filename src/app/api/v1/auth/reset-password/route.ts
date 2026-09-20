import { NextResponse } from 'next/server'
import { fail, ok, rateLimited } from '@/lib/api-response'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { and, eq, gt } from 'drizzle-orm'
import { db } from '@/db'
import { users, verificationTokens } from '@/db/schema/auth'
import { TOKEN_HEX_LENGTH, hashToken } from '@/lib/auth-tokens'
import { siteOrigin } from '@/lib/links'
import { sendMail } from '@/lib/mail'
import { clientKey, rateLimit } from '@/lib/rate-limit'
import { PasswordChanged } from '@emails/password-changed'

const BCRYPT_ROUNDS = 12
const RESET_LIMIT = 10
const RESET_WINDOW_MS = 60 * 60 * 1000

const bodySchema = z.object({
  email: z.string().email().max(254).toLowerCase(),
  token: z.string().length(TOKEN_HEX_LENGTH),
  // Same rule as signup. A weaker password here would write a credential that
  // `authorize()` accepts but that the signup form would have refused.
  password: z
    .string()
    .min(10)
    .max(200)
    .regex(/[a-z]/, 'lowercase required')
    .regex(/[A-Z]/, 'uppercase required')
    .regex(/[0-9]/, 'digit required'),
})

/**
 * Spends a reset token and writes the new password.
 *
 * The limiter here is about database cost rather than guessing - the token is
 * 256 bits, so brute force was never the exposure.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const limit = rateLimit({
    key: clientKey(req, 'reset:ip'),
    limit: RESET_LIMIT,
    windowMs: RESET_WINDOW_MS,
  })
  if (!limit.allowed) {
    return rateLimited('Too many attempts. Try again later.', limit.retryAfterSeconds)
  }

  const raw = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    // One message for a bad token and a weak password alike: the form validates
    // the password itself, so anything reaching here is either a stale link or
    // a caller not using the form.
    return fail('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid request.', 400)
  }

  const { email, token, password } = parsed.data
  const now = new Date()

  const [match] = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, email),
        eq(verificationTokens.token, hashToken(token)),
        // A verification token must not be spendable as a reset. Both live in
        // this table keyed only by (address, digest).
        eq(verificationTokens.purpose, 'reset'),
        gt(verificationTokens.expires, now),
      ),
    )
    .limit(1)

  if (!match) {
    return fail('NOT_FOUND', 'This link has expired or has already been used.', 404)
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (!user) {
    // The token outlived the account it was minted for.
    return fail('NOT_FOUND', 'This link has expired or has already been used.', 404)
  }

  await db
    .update(users)
    .set({
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      // What makes the reset evict sessions rather than only block new
      // sign-ins. `auth.ts` refuses any token carrying a different stamp.
      passwordChangedAt: now,
      // Opening the link proved control of the inbox, which is a stronger
      // claim than the signup verification makes. Held at its original value
      // when there is one, so the account's history is not rewritten.
      emailVerified: user.emailVerified ?? now,
    })
    .where(eq(users.id, user.id))

  // Every reset row for the address, not only the one spent: a second link
  // still sitting in the inbox must not survive the first being used.
  await db
    .delete(verificationTokens)
    .where(
      and(eq(verificationTokens.identifier, email), eq(verificationTokens.purpose, 'reset')),
    )

  // Swallowed: the password has already changed, and reporting a mail failure
  // would tell the customer the reset did not work when it did.
  await sendMail({
    to: email,
    subject: 'Your Tech X password was changed',
    react: PasswordChanged({
      signinUrl: `${siteOrigin()}/signin`,
      contactUrl: `${siteOrigin()}/contact`,
    }),
  }).catch(() => {})

  return ok({ ok: true })
}
