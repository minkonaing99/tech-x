import type { OrderStatus } from '@/db/schema/orders'
import type { MethodKind } from '@/db/schema/payment-methods'

export type { MethodKind }

/**
 * Single source of truth for which status moves are legal. The API route
 * enforces these; the admin table renders them. Previously duplicated in both
 * with a "keep in sync" comment.
 *
 * `confirmed` is the payment-confirmation + stock-commit + invoice boundary for
 * both payment kinds. `delivered` closes the order. Cancel from any live state.
 */
const WALLET_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ['payment_submitted', 'cancelled'],
  payment_submitted: ['pending_payment', 'confirmed', 'cancelled'],
  confirmed: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

const COD_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ['confirmed', 'cancelled'],
  payment_submitted: [],
  confirmed: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

/** Statuses that end an order - nothing may follow them. */
export const TERMINAL_STATUSES: readonly OrderStatus[] = ['delivered', 'cancelled']

export function allowedTransitions(
  from: OrderStatus,
  kind: MethodKind,
): readonly OrderStatus[] {
  return (kind === 'cod' ? COD_TRANSITIONS : WALLET_TRANSITIONS)[from]
}

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  kind: MethodKind,
): boolean {
  return from === to || allowedTransitions(from, kind).includes(to)
}

/**
 * Options for the admin list dropdown: current status plus forward moves only.
 * Cancelling is terminal and emails the customer, so it lives on the detail
 * page behind a confirm step instead.
 */
export function forwardOptions(from: OrderStatus, kind: MethodKind): OrderStatus[] {
  return [from, ...allowedTransitions(from, kind).filter((s) => s !== 'cancelled')]
}
