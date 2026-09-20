import type { OrderStatus } from '@/db/schema/orders'
import type { MethodKind } from '@/db/schema/payment-methods'

// Re-exported so the consumers of these functions get the argument type from
// the same import as the function itself.
export type { MethodKind }

/**
 * Customer-facing status wording.
 *
 * `pending_payment` means two different things depending on how the order is
 * paid: a wallet customer owes a transfer, a COD customer owes nothing until
 * the courier arrives and is simply waiting on our confirmation call. Never
 * show the raw enum to a customer.
 */
export function customerStatusLabel(status: OrderStatus, kind: MethodKind): string {
  switch (status) {
    case 'pending_payment':
      return kind === 'cod' ? 'Awaiting confirmation' : 'Awaiting payment'
    case 'payment_submitted':
      return 'Slip received'
    case 'confirmed':
      return kind === 'cod' ? 'Confirmed - pay on delivery' : 'Confirmed'
    case 'delivered':
      return 'Delivered'
    case 'cancelled':
      return 'Cancelled'
  }
}

/**
 * The customer-facing order reference. Order ids are UUIDs, which wrap on a
 * phone and read as debug output; these 8 characters are what the order page,
 * every subject line and every email body show.
 */
export function shortOrderId(id: string): string {
  return id.slice(0, 8).toUpperCase()
}

export type ProgressState = 'done' | 'current' | 'todo'

export interface ProgressStep {
  /** The order status this step represents - also drives progress position. */
  status: OrderStatus
  label: string
  state: ProgressState
}

/**
 * Wallet orders carry an extra slip-verification step. COD orders skip
 * straight from placed to confirmed, because the shop confirms by phone.
 */
const WALLET_RAIL: readonly Omit<ProgressStep, 'state'>[] = [
  { status: 'pending_payment', label: 'Order placed' },
  { status: 'payment_submitted', label: 'Payment sent' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'delivered', label: 'Delivered' },
]

const COD_RAIL: readonly Omit<ProgressStep, 'state'>[] = [
  { status: 'pending_payment', label: 'Order placed' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'delivered', label: 'Delivered' },
]

/**
 * The order rail, shared by the order page and the customer emails so the two
 * can never drift. Cancelled returns no steps: it is progress stopping, not a
 * stage of it, and a rail would tell the customer the order is still moving.
 */
export function progressSteps(status: OrderStatus, kind: MethodKind): ProgressStep[] {
  if (status === 'cancelled') return []

  const rail = kind === 'cod' ? COD_RAIL : WALLET_RAIL
  // A wallet-only status on a COD order is a bad row, not a later stage. Fall
  // back to the first step rather than marking the whole rail done.
  const current = Math.max(
    0,
    rail.findIndex((s) => s.status === status),
  )

  return rail.map((step, i) => ({
    ...step,
    state: i < current ? 'done' : i === current ? 'current' : 'todo',
  }))
}

/** One line of "what happens next", or null when nothing is expected of anyone. */
export function customerStatusHint(status: OrderStatus, kind: MethodKind): string | null {
  if (status === 'pending_payment') {
    return kind === 'cod'
      ? 'We will call to confirm this order within 3 hours. Pay the courier in cash on delivery.'
      : 'Transfer the total, then upload your payment slip. Unpaid orders are cancelled after 24 hours.'
  }
  if (status === 'payment_submitted') return 'We are checking your slip against our bank records.'
  if (status === 'confirmed') {
    return kind === 'cod'
      ? 'Packed and on the way. Have the exact amount ready for the courier.'
      : 'Payment confirmed. Your order is on its way.'
  }
  return null
}
