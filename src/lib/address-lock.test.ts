import { describe, expect, it } from 'vitest'
import { ORDER_STATUSES } from '@/db/schema/orders'
import { ADDRESS_LOCK_STATUSES, locksAddress } from './address-lock'

describe('locksAddress', () => {
  it('locks once the shop has committed to the delivery', () => {
    expect(locksAddress('confirmed')).toBe(true)
  })

  it('leaves the address editable while the order is still being placed', () => {
    // Before confirmation the buyer may still be fixing a typo, and the order
    // carries its own snapshot anyway.
    expect(locksAddress('pending_payment')).toBe(false)
    expect(locksAddress('payment_submitted')).toBe(false)
  })

  it('releases the lock once the order is off the books', () => {
    expect(locksAddress('delivered')).toBe(false)
    expect(locksAddress('cancelled')).toBe(false)
  })

  it('has an answer for every status the enum can hold', () => {
    for (const status of ORDER_STATUSES) {
      expect(typeof locksAddress(status), status).toBe('boolean')
    }
  })

  it('exposes the locking set for the query that enforces it', () => {
    expect([...ADDRESS_LOCK_STATUSES]).toEqual(ORDER_STATUSES.filter(locksAddress))
  })
})
