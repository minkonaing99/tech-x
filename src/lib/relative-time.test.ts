import { describe, expect, it } from 'vitest'
import { orderTimestamp, shortTimestamp } from './relative-time'

describe('orderTimestamp', () => {
  it('renders in shop time, not whatever timezone the host runs in', () => {
    // Asia/Yangon is UTC+6:30, so this instant is the evening of the 17th for
    // the customer even though it is still afternoon in UTC.
    expect(orderTimestamp('2026-08-17T14:22:17.000Z')).toBe('17 Aug 2026, 20:52')
  })

  it('rolls the date forward when shop time is a day ahead of UTC', () => {
    expect(orderTimestamp('2026-01-04T20:00:00.000Z')).toBe('5 Jan 2026, 02:30')
  })

  it('drops seconds - a purchase time is not machine output', () => {
    expect(orderTimestamp('2026-08-17T14:22:17.000Z')).not.toMatch(/:\d\d:\d\d/)
  })

  it('never renders an ambiguous all-numeric date', () => {
    // 8/17/2026 vs 17/8/2026 reads differently either side of the Pacific.
    expect(orderTimestamp('2026-08-17T14:22:17.000Z')).toMatch(/[A-Za-z]{3}/)
  })
})

describe('shortTimestamp', () => {
  it('drops the year - a progress rail column is too narrow to carry it', () => {
    expect(shortTimestamp('2026-08-17T14:22:17.000Z')).toBe('17 Aug, 20:52')
  })

  it('stays on shop time like every other order date', () => {
    expect(shortTimestamp('2026-01-04T20:00:00.000Z')).toBe('5 Jan, 02:30')
  })

  it('keeps the month as letters so the date never reads ambiguously', () => {
    expect(shortTimestamp('2026-08-17T14:22:17.000Z')).toMatch(/[A-Za-z]{3}/)
  })
})
