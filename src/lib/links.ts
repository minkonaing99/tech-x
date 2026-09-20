/**
 * Absolute links for contexts that leave the app - emails, mostly.
 *
 * A relative href is fine inside a page and useless inside an inbox, so these
 * always resolve to a full origin. `csrf.siteUrl()` deliberately returns null
 * when nothing is configured (a missing origin means "skip the check" there);
 * here a missing origin has to become something clickable instead.
 */

/** Single-tenant store, so the live domain is a safer last resort than a broken link. */
const FALLBACK_ORIGIN = 'https://store.merxylab.com'

export function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || FALLBACK_ORIGIN
  return configured.replace(/\/+$/, '')
}

export function orderUrl(id: string): string {
  return `${siteOrigin()}/order/${id}`
}

export function shopUrl(): string {
  return `${siteOrigin()}/shop`
}

/** Deep link into the admin panel, so an owner alert is one tap from acting. */
export function adminOrderUrl(id: string): string {
  return `${siteOrigin()}/admin/orders/${id}`
}

export function adminProductsUrl(): string {
  return `${siteOrigin()}/admin/products`
}

/**
 * `tel:` href for a phone as a human typed it. Returns null when there is
 * nothing dialable left, so callers can drop the button rather than render one
 * that does nothing.
 */
export function telHref(phone: string | null | undefined): string | null {
  if (!phone) return null
  const plus = phone.trimStart().startsWith('+') ? '+' : ''
  const digits = phone.replace(/\D/g, '')
  return digits ? `tel:${plus}${digits}` : null
}
