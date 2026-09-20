import { describe, expect, it } from 'vitest'
import { maskEmail } from './mask'

describe('maskEmail', () => {
  it('keeps the first four characters of the local part and the domain', () => {
    expect(maskEmail('minkonaing@gmail.com')).toBe('mink***@gmail.com')
  })

  it('uses a fixed-width mask so the local part length does not leak', () => {
    expect(maskEmail('a.very.long.address@example.com')).toBe('a.ve***@example.com')
    expect(maskEmail('short@ex.co')).toBe('shor***@ex.co')
  })

  it('reveals no local part when it is too short to mask meaningfully', () => {
    expect(maskEmail('dr@gmail.com')).toBe('***@gmail.com')
    expect(maskEmail('abcd@ex.co')).toBe('***@ex.co')
  })

  it('reveals nothing for a value that is not an address', () => {
    expect(maskEmail('ab')).toBe('****')
    expect(maskEmail('')).toBe('****')
    expect(maskEmail('@example.com')).toBe('****')
  })

  it('ignores surrounding whitespace', () => {
    expect(maskEmail('  buyer@example.com  ')).toBe('buye***@example.com')
  })

  it('is stable, so the owner can match repeat alerts from one customer', () => {
    expect(maskEmail('buyer@example.com')).toBe(maskEmail('buyer@example.com'))
  })
})
