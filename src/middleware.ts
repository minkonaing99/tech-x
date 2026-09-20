import { NextResponse, type NextRequest } from 'next/server'
import { contentSecurityPolicy, generateNonce } from '@/lib/csp'
import { isCrossSiteWrite, siteUrl } from '@/lib/csrf'

const IS_PROD = process.env.NODE_ENV === 'production'

/**
 * Two jobs, both cheap enough to do on every request:
 *
 * 1. Refuse cross-origin writes to the API. Applying it here rather than
 *    per-route means a route added later is covered by default instead of by
 *    remembering.
 * 2. Mint the CSP nonce. Next reads the policy off the *request* headers and
 *    stamps the same nonce onto the script tags it emits, which is what lets
 *    the policy drop `'unsafe-inline'`.
 */
export function middleware(req: NextRequest): NextResponse {
  if (isCrossSiteWrite(req, siteUrl())) {
    return NextResponse.json(
      {
        data: null,
        error: { code: 'CROSS_ORIGIN', message: 'Cross-origin request refused.', status: 403 },
      },
      { status: 403 },
    )
  }

  const nonce = IS_PROD ? generateNonce() : null
  const csp = contentSecurityPolicy(nonce)

  const requestHeaders = new Headers(req.headers)
  if (nonce) {
    requestHeaders.set('x-nonce', nonce)
    // Next looks for this specific request header to discover the nonce.
    requestHeaders.set('content-security-policy', csp)
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } })
  res.headers.set('Content-Security-Policy', csp)
  return res
}

export const config = {
  matcher: [
    // Everything except build output and static files. Those are not HTML, so
    // they need no nonce, and keeping middleware off them avoids paying for it
    // on every asset request.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|txt|xml)$).*)',
  ],
}
