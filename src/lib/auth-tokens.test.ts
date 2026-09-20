import { describe, expect, it } from 'vitest'
import {
  RESET_TTL_MIN,
  TOKEN_HEX_LENGTH,
  VERIFY_TTL_MIN,
  expiresInMinutes,
  hashToken,
  newToken,
  sessionSurvives,
} from './auth-tokens'

describe('newToken', () => {
  it('is the length both route schemas validate against', () => {
    // `z.string().length(64)` in the verify and reset routes. If this ever
    // changes, those schemas start rejecting every link that is mailed.
    expect(newToken()).toHaveLength(TOKEN_HEX_LENGTH)
    expect(newToken()).toMatch(/^[0-9a-f]+$/)
  })

  it('does not repeat', () => {
    const seen = new Set(Array.from({ length: 200 }, () => newToken()))
    expect(seen.size).toBe(200)
  })
})

describe('hashToken', () => {
  it('is deterministic, so a mailed token matches its stored digest', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'))
  })

  it('never yields the input, which is what makes storage safe', () => {
    const raw = newToken()
    const stored = hashToken(raw)
    expect(stored).not.toBe(raw)
    // The digest is what sits in the database. Hashing it again - which is
    // what an attacker replaying a stolen row would cause - does not match.
    expect(hashToken(stored)).not.toBe(stored)
  })
})

describe('TTLs', () => {
  it('gives a reset link less life than a verification link', () => {
    // A reset link sets a working credential; a verify link confirms an
    // address the person already registered.
    expect(RESET_TTL_MIN).toBeLessThan(VERIFY_TTL_MIN)
  })

  it('counts forward from the clock it is given', () => {
    const now = Date.UTC(2026, 7, 24, 12, 0, 0)
    expect(expiresInMinutes(15, now).toISOString()).toBe('2026-08-24T12:15:00.000Z')
  })
})

describe('sessionSurvives', () => {
  const changed = new Date('2026-08-24T10:00:00.000Z')

  it('signs out a token whose account no longer exists', () => {
    expect(sessionSurvives(undefined, changed.getTime())).toBe(false)
    expect(sessionSurvives(undefined, undefined)).toBe(false)
  })

  it('adopts any token while the password has never moved', () => {
    // The deploy case. Every live JWT predates the `pwdAt` claim, and every
    // row is NULL - signing all of them out at once is not an acceptable way
    // to ship this.
    expect(sessionSurvives(null, undefined)).toBe(true)
    expect(sessionSurvives(null, 0)).toBe(true)
    expect(sessionSurvives(null, 12345)).toBe(true)
  })

  it('keeps a token that carries the current stamp', () => {
    expect(sessionSurvives(changed, changed.getTime())).toBe(true)
  })

  it('evicts a token stamped before the password moved', () => {
    expect(sessionSurvives(changed, changed.getTime() - 1)).toBe(false)
  })

  /*
   * The whole point of the feature. A session issued before this shipped
   * carries no claim at all, and once the account resets its password that
   * session has to go - grandfathering on the missing claim instead of on the
   * NULL column would keep exactly the session a reset exists to kill.
   */
  it('evicts a pre-deploy token once a reset writes a stamp', () => {
    expect(sessionSurvives(changed, undefined)).toBe(false)
  })

  it('refuses a claim that is not a number', () => {
    // A forged or mangled token could carry anything here.
    expect(sessionSurvives(changed, String(changed.getTime()))).toBe(false)
    expect(sessionSurvives(changed, null)).toBe(false)
    expect(sessionSurvives(changed, {})).toBe(false)
  })
})
