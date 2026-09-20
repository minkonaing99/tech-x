import { describe, expect, it } from 'vitest'
import { CATEGORIES, CATEGORY_IDS, CATEGORY_NAME, getCategory, isCategoryId } from './categories'

describe('CATEGORIES', () => {
  it('has no duplicate ids, which would silently shadow a shop route', () => {
    expect(new Set(CATEGORY_IDS).size).toBe(CATEGORY_IDS.length)
  })

  it('uses url-safe ids, since the id is the /shop/<id> segment', () => {
    for (const c of CATEGORIES) {
      expect(c.id, c.id).toMatch(/^[a-z0-9-]+$/)
    }
  })

  it('carries a name and a description for every entry', () => {
    for (const c of CATEGORIES) {
      expect(c.name.length, c.id).toBeGreaterThan(0)
      expect(c.description.length, c.id).toBeGreaterThan(0)
    }
  })

  it('maps every id to its label', () => {
    for (const c of CATEGORIES) {
      expect(CATEGORY_NAME[c.id]).toBe(c.name)
    }
  })
})

describe('isCategoryId', () => {
  it('accepts what the shop sells', () => {
    expect(isCategoryId('monitors')).toBe(true)
  })

  it('rejects anything else - this is what replaced the foreign key', () => {
    expect(isCategoryId('laptops')).toBe(false)
    expect(isCategoryId('')).toBe(false)
    expect(isCategoryId('KEYBOARDS')).toBe(false)
  })
})

describe('getCategory', () => {
  it('returns the row a category page renders from', () => {
    expect(getCategory('mice')?.name).toBe('Mice')
  })

  it('returns undefined for an unknown slug, so the page can 404', () => {
    expect(getCategory('nope')).toBeUndefined()
  })
})
