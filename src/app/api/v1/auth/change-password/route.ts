import { NextResponse } from 'next/server'
import { fail, ok, rateLimited } from '@/lib/api-response'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema/auth'
import { auth } from '@/lib/auth'
import { siteOrigin } from '@/lib/links'
import { sendMail } from '@/lib/mail'
import { clientKey, rateLimit } from '@/lib/rate-limit'
import { PasswordChanged } from '@emails/password-changed'

const BCRYPT_ROUNDS = 12

/**
 * The current-password check is a credential oracle for anyone holding a
 * stolen session, and it sits outside the sign-in limiter that would otherwise
 * ration guesses. Attempts count whether or not they succeed.
 */
const CHANGE_LIMIT = 10
const CHANGE_WINDOW_MS = 60 * 60 * 1000

const bodySchema = z
  .object({
    currentPassword: z.string().min(1).max(200),
    // Same rule as signup and reset, so the three cannot drift into accepting
    // different passwords for the same account.
    newPassword: z
      .string()
      .min(10)
      .max(200)
      .regex(/[a-z]/, 'lowercase required')
      .regex(/[A-Z]/, 'uppercase required')
      .regex(/[0-9]/, 'digit required'),
  })
  .refine((b) => b.currentPassword !== b.newPassword, {
    message: 'Choose a password you are not already using.',
  })

/**
 * Changes the password of the signed-in customer.
 *
 * Holding the session is not sufficient on its own - an unlocked machine must
 * not be a password change - so the current password is proved as well. The
 * write stamps `password_changed_at`, which signs out every other device; the
 * caller gets that stamp back so it can re-mint its own session rather than
 * logging itself out.
 */
export async function PATCH(req: Request): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return fail('UNAUTHENTICATED', 'Sign in required.', 401)
  }
  const userId = session.user.id

  const limit = rateLimit({
    key: clientKey(req, `change-password:${userId}`),
    limit: CHANGE_LIMIT,
    windowMs: CHANGE_WINDOW_MS,
  })
  if (!limit.allowed) {
    return rateLimited('Too many attempts. Try again later.', limit.retryAfterSeconds)
  }

  const raw = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return fail('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid request.', 400)
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) {
    return fail('UNAUTHENTICATED', 'Sign in required.', 401)
  }

  if (!user.passwordHash) {
    // A Google-only account has no current password to prove, and the session
    // by itself is a weaker claim than the emailed link the reset flow uses.
    // Sending them there is not a dead end - reset gives an OAuth-only account
    // its first password.
    return fail(
      'NO_PASSWORD_SET',
      'This account signs in with Google. Use the password reset link to set a password.',
      409,
    )
  }

  if (!(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))) {
    return fail('FORBIDDEN', 'That is not your current password.', 403)
  }

  const changedAt = new Date()
  await db
    .update(users)
    .set({
      passwordHash: await bcrypt.hash(parsed.data.newPassword, BCRYPT_ROUNDS),
      // Signs out every session carrying the previous stamp, this one included
      // - which is why the caller is handed the new value below.
      passwordChangedAt: changedAt,
      // Deliberately not touching `emailVerified`. Unlike a reset, nothing
      // here proves anything about the inbox.
    })
    .where(eq(users.id, userId))

  await sendMail({
    to: user.email,
    subject: 'Your Tech X password was changed',
    react: PasswordChanged({
      signinUrl: `${siteOrigin()}/signin`,
      contactUrl: `${siteOrigin()}/contact`,
    }),
  }).catch(() => {})

  return ok({ ok: true, passwordChangedAt: changedAt.getTime() })
}
