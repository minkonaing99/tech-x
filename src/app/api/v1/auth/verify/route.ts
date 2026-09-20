import { NextResponse } from 'next/server'
import { fail, ok, rateLimited } from '@/lib/api-response'
import { z } from 'zod'
import { and, eq, gt } from 'drizzle-orm'
import { db } from '@/db'
import { users, verificationTokens } from '@/db/schema/auth'
import { TOKEN_HEX_LENGTH, hashToken } from '@/lib/auth-tokens'
import { clientKey, rateLimit } from '@/lib/rate-limit'

const schema = z.object({
  email: z.string().email().max(254).toLowerCase(),
  token: z.string().length(TOKEN_HEX_LENGTH),
})

/**
 * Verifying is a once-per-signup act, so this is generous by an order of
 * magnitude - it exists to put a ceiling on an unauthenticated endpoint that
 * spends database queries, not to ration a legitimate click. The token itself is
 * 256-bit, so guessing was never the exposure.
 */
const VERIFY_LIMIT = 10
const VERIFY_WINDOW_MS = 60 * 60 * 1000

export async function POST(req: Request): Promise<NextResponse> {
  const limit = rateLimit({
    key: clientKey(req, 'verify'),
    limit: VERIFY_LIMIT,
    windowMs: VERIFY_WINDOW_MS,
  })
  if (!limit.allowed) {
    return rateLimited('Too many attempts. Try again later.', limit.retryAfterSeconds)
  }

  const raw = await req.json().catch(() => null)
  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return fail('VALIDATION_ERROR', 'Invalid token.', 400)
  }

  const { email, token } = parsed.data
  const tokenHash = hashToken(token)
  const now = new Date()

  const [match] = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, email),
        eq(verificationTokens.token, tokenHash),
        // Without this a password-reset token would verify an address, and
        // burn itself doing it. The two flows share this table.
        eq(verificationTokens.purpose, 'verify'),
        gt(verificationTokens.expires, now),
      ),
    )
    .limit(1)

  if (!match) {
    return fail('NOT_FOUND', 'Token invalid or expired.', 404)
  }

  await db.update(users).set({ emailVerified: now }).where(eq(users.email, email))
  await db
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, email),
        eq(verificationTokens.token, tokenHash),
      ),
    )

  return ok({ ok: true })
}
