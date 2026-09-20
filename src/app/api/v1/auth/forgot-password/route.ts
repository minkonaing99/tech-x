import { NextResponse } from 'next/server'
import { ok, fail, rateLimited } from '@/lib/api-response'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { users, verificationTokens } from '@/db/schema/auth'
import { RESET_TTL_MIN, expiresInMinutes, hashToken, newToken } from '@/lib/auth-tokens'
import { siteOrigin } from '@/lib/links'
import { sendMail } from '@/lib/mail'
import { clientKey, rateLimit } from '@/lib/rate-limit'
import { PasswordReset } from '@emails/password-reset'

const HOUR_MS = 60 * 60 * 1000

/**
 * Two buckets, for the reason `auth-handlers.ts` gives about sign-in: an IP
 * limit alone lets a botnet spread one request per host across an address, and
 * an address limit alone lets one host walk a list.
 *
 * The email budget sits above the 3/hour originally specced so a person who
 * mistypes their address once and re-requests never trips it, while a targeted
 * lockout still costs the attacker one of their own IP's ten.
 */
const PER_IP_LIMIT = 10
const PER_EMAIL_LIMIT = 5

const bodySchema = z.object({
  email: z.string().email().max(254).toLowerCase(),
})

/**
 * Mints a password-reset link, or quietly does nothing.
 *
 * The response never varies: signup and sign-in are both deliberately mute
 * about whether an address is registered, and an endpoint an anonymous caller
 * can hit freely is the wrong place to start answering. The SMTP round trip
 * makes the known path measurably slower, which the rate limits above are what
 * stands against - not the response body.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const byIp = rateLimit({
    key: clientKey(req, 'forgot:ip'),
    limit: PER_IP_LIMIT,
    windowMs: HOUR_MS,
  })
  if (!byIp.allowed) {
    return rateLimited('Too many requests. Try again later.', byIp.retryAfterSeconds)
  }

  const raw = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return fail('VALIDATION_ERROR', 'Enter a valid email address.', 400)
  }
  const { email } = parsed.data

  const byEmail = rateLimit({
    key: `forgot:email:${email}`,
    limit: PER_EMAIL_LIMIT,
    windowMs: HOUR_MS,
  })
  if (!byEmail.allowed) {
    return rateLimited('Too many requests. Try again later.', byEmail.retryAfterSeconds)
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

  if (user) {
    // One live link at a time. Dropping the previous reset rows first means the
    // newest mail is always the one that works, and an older link sitting in
    // the inbox stops being an account takeover the moment a newer one is
    // asked for. Scoped to `reset` so a pending verification is untouched.
    await db
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.identifier, email),
          eq(verificationTokens.purpose, 'reset'),
        ),
      )

    const token = newToken()
    await db.insert(verificationTokens).values({
      identifier: email,
      token: hashToken(token),
      purpose: 'reset',
      expires: expiresInMinutes(RESET_TTL_MIN),
    })

    const resetUrl = `${siteOrigin()}/reset-password?token=${token}&email=${encodeURIComponent(email)}`

    // Swallowed like every other transactional send here: the token is already
    // stored, and telling the caller the mail failed would answer the question
    // the generic response exists to refuse.
    await sendMail({
      to: email,
      subject: 'Reset your Tech X password',
      react: PasswordReset({ resetUrl, ttlMinutes: RESET_TTL_MIN }),
    }).catch(() => {})
  }

  return ok({ ok: true })
}
