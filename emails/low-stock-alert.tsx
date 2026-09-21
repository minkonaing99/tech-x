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

interface LowStockProps {
  productName: string
  remaining: number
  adminUrl: string
}

export function LowStockAlert({ productName, remaining, adminUrl }: LowStockProps) {
  const soldOut = remaining <= 0

  return (
    <Html>
      <BrandHead />
      <Preview>{soldOut ? `Sold out: ${productName}` : `Low stock: ${productName}`}</Preview>
      <Body style={s.body}>
        <Container style={s.shell}>
          <Section style={s.content}>
            <Text style={s.metaKey}>Tech X · owner alert</Text>
            <Heading style={s.display}>{soldOut ? 'Sold out.' : 'Running low.'}</Heading>
            <Text style={s.lead}>
              <strong>{productName}</strong>
              {soldOut
                ? ' has no units left after the latest order. It is now unbuyable in the shop.'
                : ` has ${remaining} left after the latest order.`}
            </Text>

            <Section style={s.buttonRow}>
              <Button href={adminUrl} style={s.buttonPrimary}>
                Update stock
              </Button>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

LowStockAlert.PreviewProps = {
  productName: 'MXK-65 Walnut',
  remaining: 2,
  adminUrl: 'https://techx-store.shop/admin/products',
} satisfies LowStockProps

export default LowStockAlert
