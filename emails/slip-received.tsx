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
import * as s from './_styles'
import { BrandHead } from './_head'
import { OrderMeta } from './_meta'
import { OrderRail } from './_rail'
import { EmailFooter } from './_footer'

interface SlipReceivedProps {
  orderId: string
  orderUrl: string
  total: string
  method: string
  placedAt: string
  submittedAt: string
}

/**
 * Sent the moment the slip lands. This covers the one wait where the customer's
 * money is already gone and nothing is on screen any more - the page said it
 * once, this stays in the inbox until we confirm.
 */
export function SlipReceived({
  orderId,
  orderUrl,
  total,
  method,
  placedAt,
  submittedAt,
}: SlipReceivedProps) {
  return (
    <Html>
      <BrandHead />
      <Preview>Slip received - we are checking it against the bank</Preview>
      <Body style={s.body}>
        <Container style={s.shell}>
          <Section style={s.content}>
            <OrderMeta orderId={orderId} note={`${total} via ${method}`} />
            <Heading style={s.display}>Got your slip.</Heading>
            <Text style={s.lead}>
              We are checking it against our bank records. Nothing else is needed from you: the next
              email confirms the payment and tells you the order is being packed.
            </Text>

            <OrderRail
              status="payment_submitted"
              kind="wallet"
              placedAt={placedAt}
              updatedAt={submittedAt}
            />

            <Section style={s.buttonRow}>
              <Button href={orderUrl} style={s.buttonPrimary}>
                View this order
              </Button>
            </Section>

            <Text style={s.lead}>
              Transferred a different amount, or sent the wrong slip? Reply to this email before we
              confirm and we will sort it out.
            </Text>
          </Section>
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  )
}

SlipReceived.PreviewProps = {
  orderId: '1c34b3b6-1234-5678-9abc-def012345678',
  orderUrl: 'https://store.merxylab.com/order/1c34b3b6-1234-5678-9abc-def012345678',
  total: 'Ks 555,000',
  method: 'KBZ Pay',
  placedAt: '2026-08-19T03:35:00.000Z',
  submittedAt: '2026-08-19T05:12:00.000Z',
} satisfies SlipReceivedProps

export default SlipReceived
