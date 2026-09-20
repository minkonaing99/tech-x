import { NextResponse } from 'next/server'
import { fail, ok, rateLimited } from '@/lib/api-response'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users, verificationTokens } from '@/db/schema/auth'
import { VERIFY_TTL_MIN, expiresInMinutes, hashToken, newToken } from '@/lib/auth-tokens'
import { sendMail } from '@/lib/mail'
import { VerifyEmail } from '@emails/verify-email'
import { clientKey, rateLimit } from '@/lib/rate-limit'

const bodySchema = z.object({
  email: z.string().email().max(254).toLowerCase(),
  password: z
    .string()
    .min(10)
    .max(200)
    .regex(/[a-z]/, 'lowercase required')
    .regex(/[A-Z]/, 'uppercase required')
    .regex(/[0-9]/, 'digit required'),
  name: z.string().min(1).max(120).optional(),
})

const BCRYPT_ROUNDS = 12

export async function POST(req: Request): Promise<NextResponse> {
  const limit = rateLimit({ key: clientKey(req, 'signup'), limit: 5, windowMs: 60 * 60 * 1000 })
  if (!limit.allowed) {
    return rateLimited('Too many requests.', limit.retryAfterSeconds)
  }

  const raw = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return fail('VALIDATION_ERROR', 'Email or password invalid.', 400)
  }

  const { email, password, name } = parsed.data
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS)

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1)

  // A verified account with a password has a proven owner - this endpoint is
  // unauthenticated, so it must never touch one. Generic response either way so
  // the reply does not reveal whether the address is registered.
  if (existing?.passwordHash && existing.emailVerified) {
    return ok({ ok: true })
  }

  let userId: string
  if (!existing) {
    userId = randomUUID()
    await db.insert(users).values({
      id: userId,
      email,
      name: name ?? null,
      passwordHash: hash,
      // Stamped from the first hash onwards, so this account's sessions are
      // evictable the moment its password next moves. Leaving it NULL would
      // mean the grandfather branch in `auth.ts` adopts tokens forever.
      passwordChangedAt: new Date(),
      role: 'customer',
    })
  } else {
    userId = existing.id
    // Either an OAuth-only account adding a password, or an unverified account
    // being re-claimed. `emailVerified` is cleared so the password just written
    // cannot sign in until whoever holds the inbox clicks the link below - an
    // anonymous caller must not be able to make a usable credential.
    await db
      .update(users)
      .set({
        passwordHash: hash,
        name: name ?? existing.name,
        emailVerified: null,
        // The credential moved, so any session holding the old stamp goes.
        passwordChangedAt: new Date(),
      })
      .where(eq(users.id, userId))

    // Drop tokens issued against the previous password, so an older link cannot
    // verify a hash its recipient never chose. Both purposes: a pending reset
    // for an account being re-claimed is aimed at a password that no longer
    // exists.
    await db.delete(verificationTokens).where(eq(verificationTokens.identifier, email))
  }

  // verification token (sha256 hashed at rest)
  const raw_token = newToken()
  await db.insert(verificationTokens).values({
    identifier: email,
    token: hashToken(raw_token),
    purpose: 'verify',
    expires: expiresInMinutes(VERIFY_TTL_MIN),
  })

  const verifyUrl = `${process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL}/verify?token=${raw_token}&email=${encodeURIComponent(email)}`

  await sendMail({
    to: email,
    subject: 'Verify your Tech X account',
    react: VerifyEmail({ verifyUrl, ttlMinutes: VERIFY_TTL_MIN }),
  })

  return ok({ ok: true })
}
