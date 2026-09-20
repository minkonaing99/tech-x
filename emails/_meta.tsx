import { Text } from '@react-email/components'
import { shortOrderId } from '@/lib/order-status'
import * as s from './_styles'

interface OrderMetaProps {
  orderId: string
  /** Trailing context, e.g. `paid via KBZ Pay`. Omit when there is none. */
  note?: string
}

/**
 * `ORDER 1C34B3B6 · paid via KBZ Pay`.
 *
 * The short form is the customer-facing reference everywhere else - the order
 * page header and every subject line already use these 8 characters. The full
 * UUID only ever appears inside the link.
 */
export function OrderMeta({ orderId, note }: OrderMetaProps) {
  return (
    <Text style={s.metaRow}>
      <span style={s.metaKey}>Order </span>
      <span style={s.metaId}>{shortOrderId(orderId)}</span>
      {note ? <span> · {note}</span> : null}
    </Text>
  )
}

export default OrderMeta
