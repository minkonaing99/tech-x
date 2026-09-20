/**
 * Origin check for cookie-authenticated writes.
 *
 * Session state rides on a cookie, so the browser attaches it to a request the
 * page never intended to make. `SameSite=lax` on the Auth.js cookie already
 * blocks the common case, but that is an inherited default nothing in this repo
 * asserts - one `cookies` override in the Auth.js config and it is gone. This
 * makes the protection explicit and independent of it.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).host
  } catch {
    return null
  }
}

/**
 * True when this is a state-changing request that did not come from our own
 * origin.
 *
 * The origin is accepted if it matches either the configured public URL or the
 * host the request was actually addressed to. Taking both matters: keying only
 * off `siteUrl` means a wrong or missing `NEXT_PUBLIC_SITE_URL` in production
 * refuses every write in the app, and that failure is silent until a customer
 * cannot check out. The `Host` fallback cannot be abused for the attack this
 * guards against - a page on another origin can set `Origin`, but the browser
 * writes `Host` itself from the URL being requested, so the two only agree for
 * a genuine same-origin call.
 *
 * Scheme is deliberately not compared: an `http://` origin implies an active
 * downgrade, which the preloaded HSTS header in `next.config.mjs` already
 * covers.
 *
 * A missing `Origin` counts as cross-site. Browsers send it on every
 * state-changing request, so its absence means a client we should not be
 * accepting cookie-authenticated writes from.
 */
export function isCrossSiteWrite(req: Request, siteUrl: string | null): boolean {
  if (SAFE_METHODS.has(req.method.toUpperCase())) return false

  const originHost = hostOf(req.headers.get('origin'))
  if (!originHost) return true

  const allowed = [hostOf(siteUrl), req.headers.get('host')].filter(Boolean)
  if (allowed.length === 0) return true

  return !allowed.includes(originHost)
}

/** Public site URL, if one is configured. */
export function siteUrl(): string | null {
  return process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? null
}
