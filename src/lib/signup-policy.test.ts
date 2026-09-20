import { describe, expect, it } from 'vitest'

/**
 * The rule the unauthenticated signup route enforces, extracted so it can be
 * asserted directly: an account that has both a password and a verified email
 * has a proven owner and must be left untouched. Anything else is unclaimed and
 * may be (re)written, but only ever into a state that still needs the emailed
 * token before it can sign in.
 */
function isProtectedAccount(user: { passwordHash: string | null; emailVerified: Date | null }) {
  return Boolean(user.passwordHash && user.emailVerified)
}

const VERIFIED = new Date('2026-01-01T00:00:00.000Z')

describe('signup account-claim policy', () => {
  it('protects a verified credentials account from an anonymous overwrite', () => {
    expect(isProtectedAccount({ passwordHash: 'hash', emailVerified: VERIFIED })).toBe(true)
  })

  it('allows an OAuth-only account to add a password', () => {
    expect(isProtectedAccount({ passwordHash: null, emailVerified: VERIFIED })).toBe(false)
  })

  it('allows an unverified squatted account to be re-claimed', () => {
    expect(isProtectedAccount({ passwordHash: 'attacker', emailVerified: null })).toBe(false)
  })

  it('allows a bare record with neither', () => {
    expect(isProtectedAccount({ passwordHash: null, emailVerified: null })).toBe(false)
  })
})
