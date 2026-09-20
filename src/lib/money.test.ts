import { describe, expect, it } from 'vitest'
import { formatMmk } from './money'
import { clampQty } from './utils'
import { timeAgo } from './relative-time'

describe('formatMmk', () => {
  it('groups thousands and prefixes Ks', () => {
    expect(formatMmk(153000)).toBe('Ks 153,000')
    expect(formatMmk(0)).toBe('Ks 0')
    expect(formatMmk(1_000_000)).toBe('Ks 1,000,000')
  })

  it('has no subunit - MMK is whole kyat', () => {
    expect(formatMmk(1500.6)).toBe('Ks 1,501')
    expect(formatMmk(1500.4)).toBe('Ks 1,500')
  })

  it('never renders a negative price', () => {
    expect(formatMmk(-5000)).toBe('Ks 0')
  })
})

describe('clampQty', () => {
  it('keeps values inside the range', () => {
    expect(clampQty(5, 1, 99)).toBe(5)
    expect(clampQty(1, 1, 99)).toBe(1)
    expect(clampQty(99, 1, 99)).toBe(99)
  })

  it('clamps out-of-range input', () => {
    expect(clampQty(0, 1, 99)).toBe(1)
    expect(clampQty(-3, 1, 99)).toBe(1)
    expect(clampQty(1000, 1, 99)).toBe(99)
  })

  it('floors decimals and rejects junk - a cart line is a whole number', () => {
    expect(clampQty(2.9, 1, 99)).toBe(2)
    expect(clampQty(Number.NaN, 1, 99)).toBe(1)
    expect(clampQty(Number.POSITIVE_INFINITY, 1, 99)).toBe(1)
  })
})

describe('timeAgo', () => {
  const now = new Date('2026-08-17T12:00:00Z').getTime()
  const ago = (ms: number) => new Date(now - ms).toISOString()

  it('describes recent moments', () => {
    expect(timeAgo(ago(5_000), now)).toBe('just now')
    expect(timeAgo(ago(12 * 60_000), now)).toBe('12m ago')
    expect(timeAgo(ago(3 * 3_600_000), now)).toBe('3h ago')
    expect(timeAgo(ago(4 * 86_400_000), now)).toBe('4d ago')
    expect(timeAgo(ago(75 * 86_400_000), now)).toBe('2mo ago')
  })

  it('does not show a negative age when a clock runs ahead', () => {
    expect(timeAgo(new Date(now + 60_000).toISOString(), now)).toBe('just now')
  })

  it('survives an unparseable timestamp', () => {
    expect(timeAgo('not a date', now)).toBe('just now')
  })
})
