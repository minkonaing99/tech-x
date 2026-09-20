import {
  Body,
  Button,
  Container,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import { telHref } from '@/lib/links'
import * as s from './_styles'
import { BrandHead } from './_head'
import { OrderMeta } from './_meta'
import { FactList, type Fact } from './_facts'

interface SlipSubmittedAlertProps {
  orderId: string
  adminUrl: string
  total: string
  method: string
  recipient: string
  phone: string | null
  txRef: string | null
}

/**
 * The money claim is unverified until the owner looks at their bank app, so
 * this email never says "paid". It carries the exact figure to match against.
 */
export function SlipSubmittedAlert({
  orderId,
  adminUrl,
  total,
  method,
  recipient,
  phone,
  txRef,
}: SlipSubmittedAlertProps) {
  const facts: Fact[] = [
    { label: 'Method', value: method },
    { label: 'Amount', value: total },
    ...(txRef ? [{ label: 'Reference', value: txRef }] : []),
    { label: 'Recipient', value: recipient },
    ...(phone ? [{ label: 'Phone', value: phone, href: telHref(phone) }] : []),
  ]

  return (
    <Html>
      <BrandHead />
      <Preview>Slip submitted - verify against your bank app</Preview>
      <Body style={s.body}>
        <Container style={s.shell}>
          <Section style={s.content}>
            <OrderMeta orderId={orderId} note="owner alert" />
            <Heading style={s.display}>Slip submitted.</Heading>
            <Text style={s.amount}>{total}</Text>

            <Section style={s.noteBox}>
              <Text style={s.noteText}>
                Nothing is confirmed yet. Match this figure against your bank app before you flip
                the order to confirmed, and the customer is told their payment went through.
              </Text>
            </Section>

            <Hr style={s.hr} />
            <FactList facts={facts} />

            <Section style={s.buttonRow}>
              <Button href={adminUrl} style={s.buttonPrimary}>
                Review the slip
              </Button>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

SlipSubmittedAlert.PreviewProps = {
  orderId: '1c34b3b6-1234-5678-9abc-def012345678',
  adminUrl: 'https://store.merxylab.com/admin/orders/1c34b3b6-1234-5678-9abc-def012345678',
  total: 'Ks 555,000',
  method: 'KBZ Pay',
  recipient: 'Ko Aung',
  phone: '09 765 432 100',
  txRef: 'KBZ2608190041',
} satisfies SlipSubmittedAlertProps

export default SlipSubmittedAlert
