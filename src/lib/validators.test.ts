import { describe, expect, it } from 'vitest'
import {
  PHONE_PREFIX,
  checkPassword,
  isEmail,
  isGoogleMapsUrl,
  isTelegramUsername,
  normalizeTelegramUsername,
  isPhoneLocal,
  normalizePhoneLocal,
  toE164Phone,
} from './validators'

describe('normalizePhoneLocal', () => {
  it('accepts every shape a Myanmar customer types', () => {
    const same = [
      '9787753307',
      '09787753307',
      '+95 9 787 753 307',
      '959787753307',
      '09-787-753-307',
      '(09) 787 753 307',
    ]
    for (const input of same) {
      expect(normalizePhoneLocal(input), input).toBe('9787753307')
    }
  })

  it('strips the country code only when it leads', () => {
    // A number that merely contains 95 mid-string keeps its digits.
    expect(normalizePhoneLocal('9959512345')).toBe('9959512345')
  })

  it('caps length so a paste bomb cannot reach the database', () => {
    expect(normalizePhoneLocal('9'.repeat(50))).toHaveLength(11)
  })

  it('returns empty for input with no digits', () => {
    expect(normalizePhoneLocal('')).toBe('')
    expect(normalizePhoneLocal('not a phone')).toBe('')
  })
})

describe('toE164Phone', () => {
  it('always produces the stored prefix form', () => {
    expect(toE164Phone('09787753307')).toBe('+959787753307')
    expect(toE164Phone('9787753307')).toBe('+959787753307')
  })

  it('is idempotent - re-normalising a stored value does not double the code', () => {
    const once = toE164Phone('09787753307')
    expect(toE164Phone(once)).toBe(once)
  })

  it('uses the exported prefix', () => {
    expect(toE164Phone('9787753307').startsWith(PHONE_PREFIX)).toBe(true)
  })
})

describe('isPhoneLocal', () => {
  it('accepts Myanmar mobile numbers', () => {
    expect(isPhoneLocal('9787753307')).toBe(true)
    expect(isPhoneLocal('09787753307')).toBe(true)
  })

  it('rejects numbers not starting with 9 after the country code', () => {
    expect(isPhoneLocal('787753307')).toBe(false)
  })

  it('rejects too short and too long', () => {
    expect(isPhoneLocal('91234')).toBe(false)
    expect(isPhoneLocal('9'.repeat(11))).toBe(false)
  })

  it('rejects empty', () => {
    expect(isPhoneLocal('')).toBe(false)
  })
})

describe('isEmail', () => {
  it('accepts ordinary addresses', () => {
    expect(isEmail('a@b.com')).toBe(true)
    expect(isEmail('  spaced@example.co.uk  ')).toBe(true)
  })

  it('rejects malformed input', () => {
    for (const bad of ['', 'plain', 'a@b', 'a b@c.com', '@b.com', 'a@.com']) {
      expect(isEmail(bad), bad).toBe(false)
    }
  })
})

describe('checkPassword', () => {
  it('accepts a password meeting every rule', () => {
    expect(checkPassword('Quiet0nTheDesk').ok).toBe(true)
  })

  it('rejects under 10 characters, which sign-in silently treats as wrong', () => {
    const r = checkPassword('Ab1cdef')
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/10 characters/)
  })

  it('requires lowercase, uppercase and a digit', () => {
    expect(checkPassword('ALLUPPERCASE1').ok).toBe(false)
    expect(checkPassword('alllowercase1').ok).toBe(false)
    expect(checkPassword('NoDigitsHere').ok).toBe(false)
  })

  it('rejects absurd length', () => {
    expect(checkPassword(`Aa1${'x'.repeat(300)}`).ok).toBe(false)
  })
})

describe('normalizeTelegramUsername', () => {
  it('strips the @ people type out of habit', () => {
    expect(normalizeTelegramUsername('@minkonaing')).toBe('minkonaing')
  })

  it('accepts a pasted t.me link, which is what the share sheet gives you', () => {
    expect(normalizeTelegramUsername('https://t.me/minkonaing')).toBe('minkonaing')
    expect(normalizeTelegramUsername('t.me/minkonaing')).toBe('minkonaing')
  })
})

describe('isTelegramUsername', () => {
  it('accepts a real handle', () => {
    expect(isTelegramUsername('minkonaing')).toBe(true)
    expect(isTelegramUsername('@min_ko_99')).toBe(true)
  })

  it('applies Telegram own rules: 5-32 chars, starts with a letter', () => {
    expect(isTelegramUsername('abcd')).toBe(false)
    expect(isTelegramUsername('9abcde')).toBe(false)
    expect(isTelegramUsername('a'.repeat(33))).toBe(false)
    expect(isTelegramUsername('a'.repeat(32))).toBe(true)
  })

  it('rejects anything that could break out of a t.me path', () => {
    expect(isTelegramUsername('min/../admin')).toBe(false)
    expect(isTelegramUsername('min ko')).toBe(false)
    expect(isTelegramUsername('min?x=1')).toBe(false)
  })
})

describe('isGoogleMapsUrl', () => {
  it('accepts the links a customer actually pastes', () => {
    expect(isGoogleMapsUrl('https://maps.app.goo.gl/aBcD1234')).toBe(true)
    expect(isGoogleMapsUrl('https://www.google.com/maps/place/Mandalay/@21.97,96.08,15z')).toBe(true)
    expect(isGoogleMapsUrl('https://maps.google.com/?q=21.97,96.08')).toBe(true)
    expect(isGoogleMapsUrl('https://google.com.mm/maps/place/Foo')).toBe(true)
    expect(isGoogleMapsUrl('https://goo.gl/maps/aBcD')).toBe(true)
  })

  it('rejects scheme abuse - this value becomes an href in the admin panel', () => {
    expect(isGoogleMapsUrl('javascript:alert(1)')).toBe(false)
    expect(isGoogleMapsUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
    expect(isGoogleMapsUrl('http://www.google.com/maps/place/Foo')).toBe(false)
  })

  it('rejects hosts that only look like Google', () => {
    expect(isGoogleMapsUrl('https://google.com.evil.com/maps')).toBe(false)
    expect(isGoogleMapsUrl('https://notgoogle.com/maps')).toBe(false)
    expect(isGoogleMapsUrl('https://google.com@evil.com/maps')).toBe(false)
    expect(isGoogleMapsUrl('https://evil.com/https://google.com/maps')).toBe(false)
  })

  it('requires a maps path on the plain Google domains', () => {
    expect(isGoogleMapsUrl('https://www.google.com/search?q=x')).toBe(false)
    expect(isGoogleMapsUrl('https://www.google.com/mapsomething')).toBe(false)
  })

  it('rejects empty and oversized input', () => {
    expect(isGoogleMapsUrl('')).toBe(false)
    expect(isGoogleMapsUrl(`https://maps.app.goo.gl/${'a'.repeat(600)}`)).toBe(false)
  })
})
