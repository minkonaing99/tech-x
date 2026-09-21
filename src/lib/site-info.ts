import 'server-only'

/**
 * Public-facing shop details used by the static content pages (about, contact,
 * legal, support). Server-only - do not import from a client component.
 *
 * Fields left `null` are hidden by the pages that render them. Fill them in
 * here and every page picks the value up.
 */
export interface SiteInfo {
  readonly name: string
  /** Trading name shown in legal copy. */
  readonly legalName: string
  readonly city: string
  readonly country: string
  /** Street address, without the city. */
  readonly street: string | null
  /** Reply-capable support inbox. Not the send-only SMTP user. */
  readonly email: string | null
  /** Voice number, in display form. */
  readonly phone: string | null
  /** Digits only, for tel: and viber: links. */
  readonly phoneDigits: string | null
  /** Same number on Viber, or a different one. */
  readonly viber: string | null
  /** Telegram username without the @. Reuses the order-page backup contact. */
  readonly telegram: string | null
  /** LINE ID without the @. */
  readonly line: string | null
  /** Full Facebook page URL. */
  readonly facebook: string | null
  /** Opening hours, e.g. 'Mon-Sat, 9:00-18:00'. */
  readonly hours: string | null
}

export const SITE: SiteInfo = {
  name: 'Tech X',
  legalName: 'Tech X',
  city: 'Yangon',
  country: 'Myanmar',
  street: null,
  // TODO: add a reply-capable inbox - the contact page hides the row until then.
  email: null,
  phone: '09 787 753 307',
  phoneDigits: '09787753307',
  viber: '09 787 753 307',
  telegram: process.env.TELEGRAM_BACKUP_USERNAME ?? 'techxitstore',
  line: 'mk_naing',
  facebook: 'https://www.facebook.com/share/1EPSg63RSt/?mibextid=wwXIfr',
  hours: null,
}

export const LOCATION = `${SITE.city}, ${SITE.country}`

/** Where the contact form is delivered. Falls back to the SMTP account. */
export function contactInbox(): string | null {
  return SITE.email ?? process.env.SMTP_USER ?? null
}

/** Last review date printed on the legal pages. */
export const LEGAL_UPDATED = '17 August 2026'
