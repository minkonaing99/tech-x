import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_BUCKETS, bucketCount, clientIp, rateLimit, resetBuckets } from './rate-limit'

function req(headers: Record<string, string>): Request {
  return new Request('https://merxylab.com/api/v1/orders', { headers })
}

describe('clientIp', () => {
  it('takes the entry the nearest trusted proxy appended, not the caller-supplied one', () => {
    // A proxy appends the address it saw. Everything left of that is whatever
    // the caller sent, so the rightmost hop is the only trustworthy entry.
    expect(clientIp(req({ 'x-forwarded-for': '1.1.1.1, 203.0.113.9' }), 1)).toBe('203.0.113.9')
  })

  it('ignores a forged chain of any length', () => {
    const forged = ['9.9.9.9', '8.8.8.8', '7.7.7.7'].join(', ')
    expect(clientIp(req({ 'x-forwarded-for': `${forged}, 203.0.113.9` }), 1)).toBe('203.0.113.9')
  })

  it('walks back further when two proxies are trusted', () => {
    expect(
      clientIp(req({ 'x-forwarded-for': '1.1.1.1, 203.0.113.9, 10.0.0.1' }), 2),
    ).toBe('203.0.113.9')
  })

  it('does not fall off the front of a short chain', () => {
    expect(clientIp(req({ 'x-forwarded-for': '203.0.113.9' }), 3)).toBe('203.0.113.9')
  })

  it('ignores X-Forwarded-For entirely when no proxy is trusted', () => {
    const r = req({ 'x-forwarded-for': '9.9.9.9', 'x-real-ip': '203.0.113.9' })
    expect(clientIp(r, 0)).toBe('203.0.113.9')
  })

  it('falls back to x-real-ip when the chain is absent', () => {
    expect(clientIp(req({ 'x-real-ip': '203.0.113.9' }), 1)).toBe('203.0.113.9')
  })

  it('shares one bucket when no address can be established', () => {
    expect(clientIp(req({}), 1)).toBe('unknown')
    expect(clientIp(req({ 'x-forwarded-for': ' , ' }), 1)).toBe('unknown')
  })
})

describe('rateLimit', () => {
  beforeEach(resetBuckets)

  it('counts requests inside the window and refuses the one past the limit', () => {
    const opts = { key: 'orders:203.0.113.9', limit: 2, windowMs: 60_000 }
    expect(rateLimit(opts).allowed).toBe(true)
    expect(rateLimit(opts).allowed).toBe(true)

    const blocked = rateLimit(opts)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('gives a fresh allowance once the window has passed', () => {
    vi.useFakeTimers()
    try {
      const opts = { key: 'orders:203.0.113.9', limit: 1, windowMs: 60_000 }
      expect(rateLimit(opts).allowed).toBe(true)
      expect(rateLimit(opts).allowed).toBe(false)

      vi.advanceTimersByTime(60_001)
      expect(rateLimit(opts).allowed).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps separate keys on separate counters', () => {
    expect(rateLimit({ key: 'a', limit: 1, windowMs: 60_000 }).allowed).toBe(true)
    expect(rateLimit({ key: 'b', limit: 1, windowMs: 60_000 }).allowed).toBe(true)
  })
})

describe('rateLimit bucket store', () => {
  beforeEach(resetBuckets)
  afterEach(() => {
    vi.useRealTimers()
    resetBuckets()
  })

  it('drops expired buckets rather than holding one per address forever', () => {
    // The leak this guards against is accumulation over uptime: a bucket is
    // inserted for every distinct caller and, without a sweep, is never removed
    // again once its window has passed.
    vi.useFakeTimers()
    for (let i = 0; i < MAX_BUCKETS; i += 1) {
      rateLimit({ key: `signup:${i}`, limit: 5, windowMs: 60_000 })
    }
    expect(bucketCount()).toBe(MAX_BUCKETS)

    vi.advanceTimersByTime(60_001)
    rateLimit({ key: 'signup:203.0.113.9', limit: 5, windowMs: 60_000 })

    expect(bucketCount()).toBe(1)
  })

  it('stays under the cap even when every bucket is still live', () => {
    for (let i = 0; i <= MAX_BUCKETS + 10; i += 1) {
      rateLimit({ key: `live:${i}`, limit: 5, windowMs: 60 * 60 * 1000 })
    }
    expect(bucketCount()).toBeLessThanOrEqual(MAX_BUCKETS)
  })

  it('does not evict a live bucket while the store is under the cap', () => {
    const opts = { key: 'kept', limit: 5, windowMs: 60 * 60 * 1000 }
    rateLimit(opts)
    rateLimit({ key: 'other', limit: 5, windowMs: 60 * 60 * 1000 })
    expect(rateLimit(opts).remaining).toBe(3)
  })
})
