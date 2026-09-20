import { describe, expect, it } from 'vitest'
import { PRODUCT_ID_RE, UUID_RE } from './ids'
import { SLUG_REGEX } from './slugify'

describe('UUID_RE', () => {
  it('accepts a v4 UUID in either case', () => {
    expect(UUID_RE.test('3f2504e0-4f89-41d3-9a0c-0305e82c3301')).toBe(true)
    expect(UUID_RE.test('3F2504E0-4F89-41D3-9A0C-0305E82C3301')).toBe(true)
  })

  it('rejects the shapes a path segment can actually carry', () => {
    for (const bad of [
      '',
      'not-a-uuid',
      '3f2504e0-4f89-41d3-9a0c-0305e82c330', // one short
      '3f2504e0-4f89-41d3-9a0c-0305e82c33011', // one long
      ' 3f2504e0-4f89-41d3-9a0c-0305e82c3301', // padded
      '3f2504e0_4f89_41d3_9a0c_0305e82c3301', // underscores
    ]) {
      expect(UUID_RE.test(bad), bad).toBe(false)
    }
  })
})

describe('PRODUCT_ID_RE', () => {
  it('accepts a product slug', () => {
    expect(PRODUCT_ID_RE.test('vxe-dragonfly-r1-se')).toBe(true)
    expect(PRODUCT_ID_RE.test('mxk65')).toBe(true)
  })

  it('rejects anything that could escape a lookup or a storage key', () => {
    for (const bad of ['', 'Upper', 'has space', '../etc/passwd', 'semi;colon', 'slash/ed']) {
      expect(PRODUCT_ID_RE.test(bad), bad).toBe(false)
    }
  })

  /*
   * The looseness is the point, and it is the reason these are two constants
   * rather than one. `SLUG_REGEX` is the minting rule; `PRODUCT_ID_RE` is the
   * lookup guard, and it must keep matching any row the admin API let through
   * before the stricter rule existed.
   */
  it('stays looser than the slug-minting rule', () => {
    expect(PRODUCT_ID_RE.test('-leading-dash')).toBe(true)
    expect(SLUG_REGEX.test('-leading-dash')).toBe(false)
  })
})
