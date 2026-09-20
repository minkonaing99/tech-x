import {
  Body,
  Button,
  Column,
  Container,
  Heading,
  Html,
  Preview,
  Row,
  Section,
  Text,
} from '@react-email/components'
import * as s from './_styles'
import { BrandHead } from './_head'
import { OrderMeta } from './_meta'
import { EmailFooter } from './_footer'

interface OrderCancelledProps {
  orderId: string
  orderUrl: string
  shopUrl: string
  reason: string
}

/**
 * No progress rail here. Cancellation is progress stopping, not a stage of it,
 * and a rail would tell the customer the order is still moving.
 */
export function OrderCancelled({ orderId, orderUrl, shopUrl, reason }: OrderCancelledProps) {
  return (
    <Html>
      <BrandHead />
      <Preview>Your Tech X order was cancelled</Preview>
      <Body style={s.body}>
        <Container style={s.shell}>
          <Section style={s.content}>
            <OrderMeta orderId={orderId} note="cancelled" />
            <Heading style={s.display}>This one didn&rsquo;t go through.</Heading>
            <Text style={s.lead}>
              Nothing is owed, and any reserved stock is back on the shelf.
            </Text>

            <Section style={s.noteBox}>
              <Text style={s.noteLabel}>Reason</Text>
              <Text style={s.noteText}>{reason}</Text>
            </Section>

            <Row style={s.buttonRow}>
              <Column style={{ width: '1px', whiteSpace: 'nowrap', paddingRight: '10px' }}>
                <Button href={orderUrl} style={s.buttonGhost}>
                  View this order
                </Button>
              </Column>
              <Column>
                <Button href={shopUrl} style={s.buttonPrimary}>
                  Back to the shop
                </Button>
              </Column>
            </Row>
          </Section>
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  )
}

OrderCancelled.PreviewProps = {
  orderId: '1c34b3b6-1234-5678-9abc-def012345678',
  orderUrl: 'https://store.merxylab.com/order/1c34b3b6-1234-5678-9abc-def012345678',
  shopUrl: 'https://store.merxylab.com/shop',
  reason: 'Payment was not received within 24 hours, so the order was released automatically.',
} satisfies OrderCancelledProps

export default OrderCancelled
