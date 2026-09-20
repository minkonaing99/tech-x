/**
 * Redaction for identifiers that leave the system - owner alerts go out over
 * Telegram's servers, and server logs are readable by anyone with host access.
 * Neither is a place for a customer's address in full.
 */

/** Fixed width, so the mask does not disclose how long the local part was. */
const MASK = '***'

/**
 * `minkonaing@gmail.com` -> `mink***@gmail.com`.
 *
 * Enough for the owner to recognise an address they already know, or to tell
 * two customers apart across alerts. The domain is kept because the owner reads
 * it as provider context; the local part - the guessable half - is cut to four
 * characters behind a fixed-width mask.
 *
 * Local parts too short to keep four characters from are replaced outright
 * rather than half-revealed. A value with no local part and domain is replaced
 * entirely.
 */
export function maskEmail(email: string): string {
  const trimmed = email.trim()
  const at = trimmed.lastIndexOf('@')
  if (at <= 0 || at === trimmed.length - 1) return '****'

  const local = trimmed.slice(0, at)
  const domain = trimmed.slice(at)
  if (local.length <= 4) return `${MASK}${domain}`
  return `${local.slice(0, 4)}${MASK}${domain}`
}
