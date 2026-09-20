import { createHash, randomBytes } from 'node:crypto'

/**
 * The single-use tokens mailed to an address to prove the recipient holds it.
 *
 * Two flows use them - verifying a new account, and resetting a password - and
 * both store a SHA-256 digest rather than the value that was sent. A leaked
 * database backup or a stray `SELECT` therefore yields nothing usable: the
 * digest cannot be mailed to anyone and will not match its own hash.
 *
 * `hashToken` lived in both `signup/route.ts` and `verify/route.ts`, identical
 * in each. Reset would have been the third copy.
 */

/** Raw token as it appears in the emailed link. 32 bytes -> 64 hex chars. */
export const TOKEN_HEX_LENGTH = 64

/**
 * Verification tokens outlive reset tokens on purpose. A verification link
 * only confirms an address someone already chose to register; a reset link
 * sets a working credential, so it gets half the window.
 */
export const VERIFY_TTL_MIN = 30
export const RESET_TTL_MIN = 15

export function newToken(): string {
  return randomBytes(32).toString('hex')
}

/** Plain SHA-256, not bcrypt: the input is 256 bits of entropy we generated. */
export function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export function expiresInMinutes(minutes: number, now: number = Date.now()): Date {
  return new Date(now + minutes * 60_000)
}

/**
 * Whether a session token may continue, given the account's current
 * `password_changed_at` and the stamp the token was minted with.
 *
 * Split out of the `jwt` callback because it is the one branch that decides
 * both halves of a password reset: whether an evicted session actually goes,
 * and whether shipping the feature signs every existing customer out at once.
 * Inside the NextAuth config it cannot be reached by a test.
 *
 * @param current  `Date` when the password last moved, `null` when it has not
 *                 moved since the column shipped, `undefined` when no such
 *                 user row exists.
 * @param stamped  The `pwdAt` claim, absent on any token minted before this.
 */
export function sessionSurvives(current: Date | null | undefined, stamped: unknown): boolean {
  // The account is gone; its token outlived it.
  if (current === undefined) return false

  // Never changed since this shipped. Adopt whatever the caller holds - this
  // is what keeps the deploy from signing everyone out, and it stops applying
  // the moment a reset writes a timestamp.
  if (current === null) return true

  // Changed. The claim has to agree, so a token minted before this existed
  // (no claim at all) fails here rather than being grandfathered forever.
  return typeof stamped === 'number' && stamped === current.getTime()
}
