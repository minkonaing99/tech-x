import { afterEach, describe, expect, it } from 'vitest'
import { adminOrderUrl, adminProductsUrl, orderUrl, shopUrl, siteOrigin, telHref } from './links'

const ORIGINAL = { site: process.env.NEXT_PUBLIC_SITE_URL, auth: process.env.AUTH_URL }

afterEach(() => {
  process.env.NEXT_PUBLIC_SITE_URL = ORIGINAL.site
  process.env.AUTH_URL = ORIGINAL.auth
})

function setEnv(site?: string, authUrl?: string): void {
  if (site === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
  else process.env.NEXT_PUBLIC_SITE_URL = site
  if (authUrl === undefined) delete process.env.AUTH_URL
  else process.env.AUTH_URL = authUrl
}

describe('siteOrigin', () => {
  it('prefers the public site URL', () => {
    setEnv('https://staging.example.com', 'https://auth.example.com')
    expect(siteOrigin()).toBe('https://staging.example.com')
  })

  it('falls back to AUTH_URL when the public one is unset', () => {
    setEnv(undefined, 'https://auth.example.com')
    expect(siteOrigin()).toBe('https://auth.example.com')
  })

  it('falls back to the live store when nothing is configured', () => {
    // An email link is written once and read forever. A relative or empty href
    // in a customer inbox is worse than a hardcoded single-tenant domain.
    setEnv(undefined, undefined)
    expect(siteOrigin()).toBe('https://store.merxylab.com')
  })

  it('ignores a blank env var instead of emitting an empty origin', () => {
    setEnv('', '')
    expect(siteOrigin()).toBe('https://store.merxylab.com')
  })

  it('strips a trailing slash so joins never double up', () => {
    setEnv('https://example.com/', undefined)
    expect(siteOrigin()).toBe('https://example.com')
  })
})

describe('orderUrl', () => {
  it('builds an absolute link to the order page', () => {
    setEnv('https://example.com', undefined)
    expect(orderUrl('1c34b3b6-1234-5678-9abc-def012345678')).toBe(
      'https://example.com/order/1c34b3b6-1234-5678-9abc-def012345678',
    )
  })

  it('never emits a double slash', () => {
    setEnv('https://example.com/', undefined)
    expect(orderUrl('abc')).toBe('https://example.com/order/abc')
  })
})

describe('shopUrl', () => {
  it('points at the catalogue', () => {
    setEnv('https://example.com', undefined)
    expect(shopUrl()).toBe('https://example.com/shop')
  })
})

describe('adminOrderUrl', () => {
  it('deep links to the order in the admin panel', () => {
    setEnv('https://example.com', undefined)
    expect(adminOrderUrl('1c34b3b6-1234')).toBe('https://example.com/admin/orders/1c34b3b6-1234')
  })
})

describe('adminProductsUrl', () => {
  it('points at the product list, where stock is edited', () => {
    setEnv('https://example.com', undefined)
    expect(adminProductsUrl()).toBe('https://example.com/admin/products')
  })
})

describe('telHref', () => {
  it('strips the spaces a Myanmar number is written with', () => {
    expect(telHref('09 765 432 100')).toBe('tel:09765432100')
  })

  it('keeps a leading plus so an international number still dials', () => {
    expect(telHref('+95 9 123 456 789')).toBe('tel:+959123456789')
  })

  it('drops punctuation a human typed into the field', () => {
    expect(telHref('(09) 765-432-100')).toBe('tel:09765432100')
  })

  it('returns null for nothing dialable, so the button can be omitted', () => {
    expect(telHref(null)).toBeNull()
    expect(telHref('')).toBeNull()
    expect(telHref('call me')).toBeNull()
  })
})
