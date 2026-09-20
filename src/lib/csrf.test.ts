import { describe, expect, it } from 'vitest'
import { isCrossSiteWrite } from './csrf'

const SITE = 'https://merxylab.com'

function req(method: string, headers: Record<string, string> = {}): Request {
  return new Request(`${SITE}/api/v1/orders`, { method, headers })
}

describe('isCrossSiteWrite', () => {
  it('allows safe methods regardless of origin', () => {
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      expect(isCrossSiteWrite(req(method, { origin: 'https://evil.test' }), SITE)).toBe(false)
    }
  })

  it('allows a write from our own origin', () => {
    expect(isCrossSiteWrite(req('POST', { origin: SITE }), SITE)).toBe(false)
  })

  it('blocks a write from another origin', () => {
    expect(isCrossSiteWrite(req('POST', { origin: 'https://evil.test' }), SITE)).toBe(true)
  })

  it('accepts the host the request was addressed to, so a wrong site URL cannot brick writes', () => {
    // Host is written by the browser from the URL being fetched, never by the
    // calling page, so it is safe to trust for this comparison.
    const r = req('POST', { origin: 'https://merxylab.com', host: 'merxylab.com' })
    expect(isCrossSiteWrite(r, 'https://stale-config.example')).toBe(false)
  })

  it('still blocks a foreign origin when the site URL is stale', () => {
    const r = req('POST', { origin: 'https://evil.test', host: 'merxylab.com' })
    expect(isCrossSiteWrite(r, 'https://stale-config.example')).toBe(true)
  })

  it('blocks a subdomain of our site', () => {
    expect(isCrossSiteWrite(req('POST', { origin: 'https://evil.merxylab.com' }), SITE)).toBe(true)
  })

  it('blocks a write with no Origin header', () => {
    expect(isCrossSiteWrite(req('POST'), SITE)).toBe(true)
  })

  it('blocks a malformed Origin rather than throwing', () => {
    expect(isCrossSiteWrite(req('POST', { origin: 'not a url' }), SITE)).toBe(true)
  })

  it('falls back to the Origin/Referer pair when no site URL is configured', () => {
    const r = req('POST', { origin: SITE, host: 'merxylab.com' })
    expect(isCrossSiteWrite(r, null)).toBe(false)
  })

  it('blocks a forged origin when falling back to Host', () => {
    const r = req('POST', { origin: 'https://evil.test', host: 'merxylab.com' })
    expect(isCrossSiteWrite(r, null)).toBe(true)
  })

  it('treats every non-safe method as a write', () => {
    for (const method of ['POST', 'PATCH', 'PUT', 'DELETE']) {
      expect(isCrossSiteWrite(req(method, { origin: 'https://evil.test' }), SITE)).toBe(true)
    }
  })
})
