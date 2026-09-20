import type { OrderStatus } from '@/db/schema/orders'

/**
 * Statuses that freeze the address row they point at.
 *
 * `confirmed` is the window where the shop has committed and a courier is
 * working from the address. Deleting it there would blank the FK on a live
 * delivery; editing it would leave the customer's address book disagreeing
 * with the parcel already in transit.
 *
 * Before confirmation the buyer may still be correcting a typo, and after
 * delivery the order is history the snapshot already preserves. Both stay
 * unlocked on purpose.
 */
export const ADDRESS_LOCK_STATUSES = ['confirmed'] as const satisfies readonly OrderStatus[]

export function locksAddress(status: OrderStatus): boolean {
  return (ADDRESS_LOCK_STATUSES as readonly OrderStatus[]).includes(status)
}

export const ADDRESS_LOCKED_MESSAGE =
  'This address is on a confirmed order that is out for delivery. Add a new address instead, or message us to change that order.'
