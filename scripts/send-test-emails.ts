#!/usr/bin/env node
/**
 * scripts/send-test-emails.ts
 *
 * Sends every React Email template to one inbox using each template's own
 * PreviewProps, so you can eyeball the real rendering in a real mail client.
 *
 *   npm run mail:preview -- you@example.com
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
config({ path: '.env', override: false })

// PreviewProps carry production links. Without this, a local .env.local pointing
// at localhost:3000 would mail you buttons that only work on your own machine.
process.env.NEXT_PUBLIC_SITE_URL = 'https://store.merxylab.com'
delete process.env.AUTH_URL

import type { ReactElement } from 'react'
import { sendMail } from '../src/lib/mail'
import { LowStockAlert } from '../emails/low-stock-alert'
import { NewOrderAlert } from '../emails/new-order-alert'
import { OrderCancelled } from '../emails/order-cancelled'
import { OrderDelivered } from '../emails/order-delivered'
import { OrderInvoice } from '../emails/order-invoice'
import { OrderPlaced } from '../emails/order-placed'
import { SlipReceived } from '../emails/slip-received'
import { SlipSubmittedAlert } from '../emails/slip-submitted-alert'
import { VerifyEmail } from '../emails/verify-email'

const COD_PREVIEW = {
  ...OrderPlaced.PreviewProps,
  method: 'Cash on Delivery',
  kind: 'cod',
  accountName: null,
  accountPhone: null,
} satisfies Parameters<typeof OrderPlaced>[0]

const COD_ALERT_PREVIEW = {
  ...NewOrderAlert.PreviewProps,
  method: 'Cash on Delivery',
  kind: 'cod',
} satisfies Parameters<typeof NewOrderAlert>[0]

interface Sample {
  subject: string
  react: ReactElement
}

// Ordered as a customer meets them, owner alerts last.
const samples: Sample[] = [
  { subject: '[preview 1/11] Verify your merxylab account', react: VerifyEmail(VerifyEmail.PreviewProps) },
  { subject: '[preview 2/11] Order placed - wallet', react: OrderPlaced(OrderPlaced.PreviewProps) },
  { subject: '[preview 3/11] Order placed - COD', react: OrderPlaced(COD_PREVIEW) },
  { subject: '[preview 4/11] Slip received', react: SlipReceived(SlipReceived.PreviewProps) },
  { subject: '[preview 5/11] Payment confirmed - your invoice', react: OrderInvoice(OrderInvoice.PreviewProps) },
  { subject: '[preview 6/11] Your order has arrived', react: OrderDelivered(OrderDelivered.PreviewProps) },
  { subject: '[preview 7/11] Your order was cancelled', react: OrderCancelled(OrderCancelled.PreviewProps) },
  { subject: '[preview 8/11] Owner - new order, wallet', react: NewOrderAlert(NewOrderAlert.PreviewProps) },
  { subject: '[preview 9/11] Owner - new order, COD', react: NewOrderAlert(COD_ALERT_PREVIEW) },
  { subject: '[preview 10/11] Owner - slip submitted', react: SlipSubmittedAlert(SlipSubmittedAlert.PreviewProps) },
  { subject: '[preview 11/11] Owner - low stock', react: LowStockAlert(LowStockAlert.PreviewProps) },
]

async function main(): Promise<void> {
  const to = process.argv[2]
  if (!to) {
    console.error('usage: npm run mail:preview -- you@example.com')
    process.exit(1)
  }

  for (const sample of samples) {
    const { delivered } = await sendMail({ to, subject: sample.subject, react: sample.react })
    console.log(`${delivered ? 'sent' : 'DROPPED'}  ${sample.subject}`)
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err)
    process.exit(1)
  },
)
