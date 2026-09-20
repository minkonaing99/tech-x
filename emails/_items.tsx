import { Column, Hr, Row, Text } from '@react-email/components'
import * as s from './_styles'

export interface LineItem {
  qty: number
  name: string
  lineTotal: string
}

interface ItemTableProps {
  items: LineItem[]
  subtotal: string
  deliveryFee: string
  total: string
  /** Eyebrow above the lines: `Your order` before payment, `Invoice` after. */
  heading: string
  /** `Total due` before payment, `Total paid` after. */
  totalLabel: string
}

/**
 * Table-based so Outlook and Gmail keep the columns aligned. Shared by the
 * placed email (what you owe) and the invoice (what you paid) - same numbers,
 * different moment, so the framing is the only thing that changes.
 */
export function ItemTable({
  items,
  subtotal,
  deliveryFee,
  total,
  heading,
  totalLabel,
}: ItemTableProps) {
  return (
    <>
      <Hr style={s.hr} />
      <Text style={s.eyebrow}>{heading}</Text>

      {items.map((it, i) => (
        <Row key={i}>
          <Column style={s.cellItem}>
            {it.qty} × {it.name}
          </Column>
          <Column style={s.cellPrice}>{it.lineTotal}</Column>
        </Row>
      ))}

      <Hr style={s.hr} />

      <Row>
        <Column style={s.cellMeta}>Subtotal</Column>
        <Column style={s.cellMetaPrice}>{subtotal}</Column>
      </Row>
      <Row>
        <Column style={s.cellMeta}>Delivery</Column>
        <Column style={s.cellMetaPrice}>{deliveryFee}</Column>
      </Row>
      <Row>
        <Column style={s.totalLabelCell}>{totalLabel}</Column>
        <Column style={s.totalValCell}>{total}</Column>
      </Row>
    </>
  )
}

export default ItemTable
