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
import type { MethodKind } from '@/lib/order-status'
import * as s from './_styles'
import { BrandHead } from './_head'
import { OrderMeta } from './_meta'
import { OrderRail } from './_rail'
import { EmailFooter } from './_footer'

interface OrderDeliveredProps {
  orderId: string
  orderUrl: string
  kind: MethodKind
  placedAt: string
  updatedAt: string
}

export function OrderDelivered({
  orderId,
  orderUrl,
  kind,
  placedAt,
  updatedAt,
}: OrderDeliveredProps) {
  return (
    <Html>
      <BrandHead />
      <Preview>Your Tech X order has arrived</Preview>
      <Body style={s.body}>
        <Container style={s.shell}>
          <Section style={s.content}>
            <OrderMeta orderId={orderId} />
            <Heading style={s.display}>It&rsquo;s on your desk now.</Heading>
            <Text style={s.lead}>
              Thanks for picking Tech X. We hope it earns its place.
            </Text>

            <OrderRail status="delivered" kind={kind} placedAt={placedAt} updatedAt={updatedAt} />

            <Section style={s.buttonRow}>
              <Button href={orderUrl} style={s.buttonPrimary}>
                View this order
              </Button>
            </Section>

            <Text style={s.lead}>
              Anything missing, damaged, or just not right? Reply to this email and a real person
              sorts it out. No bots, no queue.
            </Text>
          </Section>
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  )
}

OrderDelivered.PreviewProps = {
  orderId: '1c34b3b6-1234-5678-9abc-def012345678',
  orderUrl: 'https://store.merxylab.com/order/1c34b3b6-1234-5678-9abc-def012345678',
  kind: 'wallet',
  placedAt: '2026-08-19T03:35:00.000Z',
  updatedAt: '2026-08-21T09:10:00.000Z',
} satisfies OrderDeliveredProps

export default OrderDelivered
