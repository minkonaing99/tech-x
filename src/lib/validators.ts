/**
 * Shared client + server-side validators. Mirrors the zod schemas used at API
 * boundaries so the UI can flag mistakes without a round-trip.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Exported so the API schemas build on it instead of restating the literal. */
export const PHONE_REGEX = /^\+959\d{7,9}$/

export function isEmail(v: string): boolean {
  return EMAIL_REGEX.test(v.trim())
}

function isMyanmarPhone(v: string): boolean {
  return PHONE_REGEX.test(v.trim())
}

/** Country code shown as a fixed prefix beside the phone input. */
export const PHONE_PREFIX = '+95'

/**
 * Turns whatever a customer types after the `+95` prefix into the national
 * part of a Myanmar mobile number: digits only, no leading zero, and with a
 * pasted country code stripped.
 *
 * '09787753307' -> '9787753307'   '+95 9 787 753 307' -> '9787753307'
 */
export function normalizePhoneLocal(input: string): string {
  let digits = input.replace(/\D/g, '')
  if (digits.startsWith('95')) digits = digits.slice(2)
  digits = digits.replace(/^0+/, '')
  return digits.slice(0, 11)
}

/** National part -> stored E.164 form. */
export function toE164Phone(local: string): string {
  return `${PHONE_PREFIX}${normalizePhoneLocal(local)}`
}

export function isPhoneLocal(local: string): boolean {
  return isMyanmarPhone(toE164Phone(local))
}

export const PHONE_HINT = 'Mobile number starting with 9, e.g. 9 787 753 307.'

export interface PasswordCheck {
  ok: boolean
  reason?: string
}

export function checkPassword(v: string): PasswordCheck {
  if (v.length < 10) return { ok: false, reason: 'At least 10 characters.' }
  if (v.length > 200) return { ok: false, reason: 'Too long (max 200 characters).' }
  if (!/[a-z]/.test(v)) return { ok: false, reason: 'Add at least one lowercase letter.' }
  if (!/[A-Z]/.test(v)) return { ok: false, reason: 'Add at least one uppercase letter.' }
  if (!/\d/.test(v)) return { ok: false, reason: 'Add at least one digit.' }
  return { ok: true }
}

/** Telegram's own rule: 5-32 chars, letters/digits/underscore, letter first. */
const TELEGRAM_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{4,31}$/
const TELEGRAM_PREFIX = /^(?:https?:\/\/)?(?:www\.)?t\.me\//i

export const TELEGRAM_MAX = 32
export const TELEGRAM_HINT = 'Telegram handle for the confirmation call. Optional.'

/** `@minkonaing`, `t.me/minkonaing` and `minkonaing` all store the same way. */
export function normalizeTelegramUsername(v: string): string {
  return v.trim().replace(TELEGRAM_PREFIX, '').replace(/^@+/, '')
}

export function isTelegramUsername(v: string): boolean {
  return TELEGRAM_REGEX.test(normalizeTelegramUsername(v))
}

export const MAPS_URL_MAX = 512
export const MAPS_URL_HINT = 'Paste a Google Maps link. Share > Copy link in the Maps app.'

/** Hosts that serve maps directly, whatever the path. */
const MAPS_HOSTS = new Set(['maps.google.com', 'maps.app.goo.gl'])

/**
 * `google.com`, `google.mm`, `google.com.mm`, `google.co.uk`.
 *
 * The tail is deliberately tight. A loose `google\.[a-z.]+` would also accept
 * `google.com.evil.com`, which is an attacker-controlled host wearing a
 * Google-shaped prefix.
 */
const GOOGLE_HOST = /^google\.(com|[a-z]{2}|com\.[a-z]{2}|co\.[a-z]{2})$/
const MAPS_PATH = /^\/maps(\/|$)/

/**
 * A customer-supplied URL that the admin order screen renders as a link, so
 * this is the boundary between "the buyer pinned their house" and "the buyer
 * handed the shop owner a link to anywhere". `https` only, Google hosts only.
 */
export function isGoogleMapsUrl(v: string): boolean {
  const raw = v.trim()
  if (raw.length === 0 || raw.length > MAPS_URL_MAX) return false

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  // Blocks javascript: and data:, which would otherwise be a stored XSS in the
  // one screen that can edit products and orders.
  if (url.protocol !== 'https:') return false

  // `new URL` resolves userinfo tricks like https://google.com@evil.com, so
  // reading hostname (not the raw string) is what makes this safe.
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  if (MAPS_HOSTS.has(host)) return true
  if (host === 'goo.gl' || GOOGLE_HOST.test(host)) return MAPS_PATH.test(url.pathname)
  return false
}

export function required(v: string, label = 'This field'): string | null {
  return v.trim().length === 0 ? `${label} is required.` : null
}

export function maxLen(v: string, max: number, label = 'This field'): string | null {
  return v.length > max ? `${label} must be ${max} characters or fewer.` : null
}
