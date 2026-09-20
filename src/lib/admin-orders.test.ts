import { beforeEach, describe, expect, it, vi } from 'vitest'

// The module imports the Drizzle client at load time; tests only exercise the
// pure helpers, so a stub keeps MySQL out of the run.
vi.mock('@/db', () => ({ db: {} }))

const getSetting = vi.fn<(key: string) => Promise<string | null>>()
vi.mock('@/lib/site-settings', () => ({ getSetting: (k: string) => getSetting(k) }))

const { escapeLike, getStaleDays, parsePage, parseStatus, STALE_DAYS_MAX, STALE_DAYS_MIN } =
  await import('./admin-orders')

describe('parseStatus', () => {
  it('accepts every real status', () => {
    for (const s of [
      'pending_payment',
      'payment_submitted',
      'confirmed',
      'delivered',
      'cancelled',
    ]) {
      expect(parseStatus(s)).toBe(s)
    }
  })

  it('drops anything else, so ?status= cannot reach SQL', () => {
    for (const bad of [undefined, '', 'paid', 'shipped', 'DROP TABLE orders', "' OR 1=1"]) {
      expect(parseStatus(bad as string | undefined), String(bad)).toBeUndefined()
    }
  })
})

describe('parsePage', () => {
  it('keeps valid page numbers', () => {
    expect(parsePage('1')).toBe(1)
    expect(parsePage('7')).toBe(7)
  })

  it('floors junk to page 1 rather than producing a negative OFFSET', () => {
    for (const bad of [undefined, '', '0', '-4', 'abc', 'NaN', 'Infinity']) {
      expect(parsePage(bad as string | undefined), String(bad)).toBe(1)
    }
  })

  it('truncates decimals', () => {
    expect(parsePage('3.9')).toBe(3)
  })
})

describe('escapeLike', () => {
  it('neutralises wildcards so a search cannot match everything', () => {
    expect(escapeLike('%')).toBe('\\%')
    expect(escapeLike('_')).toBe('\\_')
    expect(escapeLike('100%_off')).toBe('100\\%\\_off')
  })

  it('escapes the escape character itself', () => {
    expect(escapeLike('\\')).toBe('\\\\')
  })

  it('leaves ordinary search terms untouched', () => {
    expect(escapeLike('minkonaing@store.merxylab.com')).toBe('minkonaing@store.merxylab.com')
    expect(escapeLike('8380bc6a')).toBe('8380bc6a')
  })
})

describe('getStaleDays', () => {
  beforeEach(() => getSetting.mockReset())

  it('defaults to 3 when unset - Number(null) is 0 and must not clamp to the minimum', async () => {
    getSetting.mockResolvedValue(null)
    expect(await getStaleDays()).toBe(3)
  })

  it('defaults when the stored value is blank or unparseable', async () => {
    getSetting.mockResolvedValue('   ')
    expect(await getStaleDays()).toBe(3)
    getSetting.mockResolvedValue('abc')
    expect(await getStaleDays()).toBe(3)
  })

  it('returns a stored value inside the allowed range', async () => {
    getSetting.mockResolvedValue('7')
    expect(await getStaleDays()).toBe(7)
  })

  it('clamps out-of-range values', async () => {
    getSetting.mockResolvedValue('999')
    expect(await getStaleDays()).toBe(STALE_DAYS_MAX)
    getSetting.mockResolvedValue('-5')
    expect(await getStaleDays()).toBe(STALE_DAYS_MIN)
  })

  it('truncates decimals', async () => {
    getSetting.mockResolvedValue('4.8')
    expect(await getStaleDays()).toBe(4)
  })
})
