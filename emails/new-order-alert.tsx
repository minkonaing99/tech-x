import {
  Body,
  Button,
  Column,
  Container,
  Heading,
  Hr,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components'
import { telHref } from '@/lib/links'
import type { MethodKind } from '@/lib/order-status'
import * as s from './_styles'
import { BrandHead } from './_head'
import { OrderMeta } from './_meta'
import { FactList, type Fact } from './_facts'
import { ItemTable, type LineItem } from './_items'

interface NewOrderAlertProps {
  orderId: string
  adminUrl: string
  total: string
  subtotal: string
  deliveryFee: string
  method: string
  kind: MethodKind
  customer: string
  recipient: string
  phone: string | null
  destination: string
  items: LineItem[]
}

/**
 * Operational triage, not a brand moment. The headline states the next action,
 * because the two payment kinds need opposite things from the owner: a COD
 * order needs a phone call, a wallet order needs waiting for a slip.
 */
export function NewOrderAlert({
  orderId,
  adminUrl,
  total,
  subtotal,
  deliveryFee,
  method,
  kind,
  customer,
  recipient,
  phone,
  destination,
  items,
}: NewOrderAlertProps) {
  const isCod = kind === 'cod'
  const dial = telHref(phone)

  const facts: Fact[] = [
    {
      label: 'Payment',
      value: isCod ? `${method} - cash on delivery` : `${method} - online transfer`,
    },
    { label: 'Recipient', value: recipient },
    ...(phone ? [{ label: 'Phone', value: phone, href: dial }] : []),
    { label: 'Deliver to', value: destination },
    { label: 'Account', value: customer },
  ]

  return (
    <Html>
      <BrandHead />
      <Preview>
        {isCod ? `Call to confirm - ${total}` : `New order awaiting payment - ${total}`}
      </Preview>
      <Body style={s.body}>
        <Container style={s.shell}>
          <Section style={s.content}>
            <OrderMeta orderId={orderId} note="owner alert" />
            <Heading style={s.display}>
              {isCod ? 'Cash on delivery. Call to confirm.' : 'New order. Waiting on the slip.'}
            </Heading>
            <Text style={s.amount}>{total}</Text>

            {isCod && (
              <Section style={s.noteBox}>
                <Text style={s.noteText}>
                  COD orders are confirmed by phone within 3 hours. No stock is held until you
                  confirm.
                </Text>
              </Section>
            )}

            <Hr style={s.hr} />
            <FactList facts={facts} />

            <Row style={s.buttonRow}>
              <Column style={{ width: '1px', whiteSpace: 'nowrap', paddingRight: '10px' }}>
                <Button href={adminUrl} style={s.buttonPrimary}>
                  Open in admin
                </Button>
              </Column>
              {dial && (
                <Column>
                  <Button href={dial} style={s.buttonGhost}>
                    Call {recipient}
                  </Button>
                </Column>
              )}
            </Row>

            <ItemTable
              items={items}
              subtotal={subtotal}
              deliveryFee={deliveryFee}
              total={total}
              heading="To pack"
              totalLabel="Order total"
            />
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

NewOrderAlert.PreviewProps = {
  orderId: '1c34b3b6-1234-5678-9abc-def012345678',
  adminUrl: 'https://store.merxylab.com/admin/orders/1c34b3b6-1234-5678-9abc-def012345678',
  total: 'Ks 555,000',
  subtotal: 'Ks 550,000',
  deliveryFee: 'Ks 5,000',
  method: 'KBZ Pay',
  kind: 'wallet',
  customer: 'buyer@example.com',
  recipient: 'Ko Aung',
  phone: '09 765 432 100',
  destination: 'Chan Aye Thar Zan, Mandalay, Mandalay Region',
  items: [
    { qty: 1, name: 'Keychron K2 Pro', lineTotal: 'Ks 545,000' },
    { qty: 1, name: 'PBT Keycap Set - Sand', lineTotal: 'Ks 5,000' },
  ],
} satisfies NewOrderAlertProps

export default NewOrderAlert
