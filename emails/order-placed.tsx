import {
  Body,
  Button,
  Container,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { customerStatusHint, type MethodKind } from '@/lib/order-status'
import * as s from './_styles'
import { BrandHead } from './_head'
import { OrderMeta } from './_meta'
import { OrderRail } from './_rail'
import { ItemTable, type LineItem } from './_items'
import { EmailFooter } from './_footer'

interface OrderPlacedProps {
  orderId: string
  orderUrl: string
  method: string
  kind: MethodKind
  /** Wallet only: where the transfer goes. COD orders owe nothing yet. */
  accountName: string | null
  accountPhone: string | null
  total: string
  subtotal: string
  deliveryFee: string
  placedAt: string
  items: LineItem[]
}

export function OrderPlaced({
  orderId,
  orderUrl,
  method,
  kind,
  accountName,
  accountPhone,
  total,
  subtotal,
  deliveryFee,
  placedAt,
  items,
}: OrderPlacedProps) {
  const isWallet = kind === 'wallet'
  // Same sentence the order page shows, from the same function, so the two can
  // never drift apart on the one instruction that costs money to get wrong.
  const hint = customerStatusHint('pending_payment', kind)

  return (
    <Html>
      <BrandHead />
      <Preview>
        {isWallet ? 'Order placed - transfer to complete it' : 'Order placed - we will call you'}
      </Preview>
      <Body style={s.body}>
        <Container style={s.shell}>
          <Section style={s.content}>
            <OrderMeta orderId={orderId} note={method} />
            <Heading style={s.display}>
              {isWallet ? 'Order placed. Now the transfer.' : "Order placed. We'll call you."}
            </Heading>

            <OrderRail
              status="pending_payment"
              kind={kind}
              placedAt={placedAt}
              updatedAt={placedAt}
            />

            {hint && <Text style={s.lead}>{hint}</Text>}

            {isWallet && (accountName || accountPhone) && (
              <Section style={s.noteBox}>
                <Text style={s.noteLabel}>Pay to</Text>
                {accountName && <Text style={s.payLine}>{accountName}</Text>}
                {accountPhone && <Text style={s.payLine}>{accountPhone}</Text>}
                <Text style={s.payAmount}>{total}</Text>
              </Section>
            )}

            <Section style={s.buttonRow}>
              <Button href={orderUrl} style={s.buttonPrimary}>
                {isWallet ? 'Upload your slip' : 'View this order'}
              </Button>
            </Section>

            <ItemTable
              items={items}
              subtotal={subtotal}
              deliveryFee={deliveryFee}
              total={total}
              heading="Your order"
              totalLabel="Total due"
            />
          </Section>
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  )
}

OrderPlaced.PreviewProps = {
  orderId: '1c34b3b6-1234-5678-9abc-def012345678',
  orderUrl: 'https://store.merxylab.com/order/1c34b3b6-1234-5678-9abc-def012345678',
  method: 'KBZ Pay',
  kind: 'wallet',
  accountName: 'Merxy Lab',
  accountPhone: '09 7XX XXX XXX',
  total: 'Ks 555,000',
  subtotal: 'Ks 550,000',
  deliveryFee: 'Ks 5,000',
  placedAt: '2026-08-19T03:35:00.000Z',
  items: [
    { qty: 1, name: 'Keychron K2 Pro', lineTotal: 'Ks 545,000' },
    { qty: 1, name: 'PBT Keycap Set - Sand', lineTotal: 'Ks 5,000' },
  ],
} satisfies OrderPlacedProps

export default OrderPlaced
