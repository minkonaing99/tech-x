import type { NextRequest } from 'next/server'
import { handlers } from './auth'
import { clientKey, rateLimit } from './rate-limit'
import { siteUrl } from './csrf'

/**
 * Auth.js owns these routes, so the app's own rate limiting never sees them -
 * the credentials callback was the one unmetered endpoint in the app. Left
 * open it allows unlimited password guessing, and because every attempt costs a
 * bcrypt-12 comparison (~250ms of pinned CPU) it doubles as a cheap way to
 * exhaust a small shared host.
 *
 * Attempts are counted whether or not they succeed. Telling the two apart means
 * inspecting Auth.js's redirect response for an `error` parameter - internal
 * detail that would break quietly on upgrade - and the limits below are set
 * high enough that a real person signing in repeatedly never reaches them.
 */
const WINDOW_MS = 15 * 60 * 1000
const PER_IP_LIMIT = 20
const PER_ACCOUNT_LIMIT = 10

const CREDENTIALS_CALLBACK = '/api/auth/callback/credentials'

export const { GET } = handlers

/**
 * Auth.js's client reads `{ url }` off this response and pulls the `error`
 * query parameter out of it, so a refusal has to keep that shape or `signIn()`
 * throws on parse instead of surfacing the reason.
 */
function tooManyAttempts(retryAfterSeconds: number): Response {
  const base = siteUrl() ?? ''
  return Response.json(
    { url: `${base}/signin?error=TooManyRequests` },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  )
}

/** Read the submitted address without consuming the body Auth.js still needs. */
async function submittedEmail(req: Request): Promise<string | null> {
  try {
    const form = await req.clone().formData()
    const email = form.get('email')
    return typeof email === 'string' && email ? email.trim().toLowerCase() : null
  } catch {
    return null
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  if (new URL(req.url).pathname !== CREDENTIALS_CALLBACK) {
    return handlers.POST(req)
  }

  const byIp = rateLimit({
    key: clientKey(req, 'signin:ip'),
    limit: PER_IP_LIMIT,
    windowMs: WINDOW_MS,
  })
  if (!byIp.allowed) return tooManyAttempts(byIp.retryAfterSeconds)

  // Per-account as well as per-IP: an IP limit alone lets a botnet spread one
  // guess per host across a single account, and an account limit alone lets one
  // host walk an address list.
  const email = await submittedEmail(req)
  if (email) {
    const byAccount = rateLimit({
      key: `signin:account:${email}`,
      limit: PER_ACCOUNT_LIMIT,
      windowMs: WINDOW_MS,
    })
    if (!byAccount.allowed) return tooManyAttempts(byAccount.retryAfterSeconds)
  }

  return handlers.POST(req)
}
