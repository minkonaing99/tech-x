import { SHIPPING_META, SHIPPING_PATH, ShippingView } from '@/components/pages/shipping'
import { getDeliveryFees } from '@/lib/delivery-fees'
import { languageAlternates } from '@/lib/i18n'

export const metadata = {
  ...SHIPPING_META.en,
  alternates: { canonical: SHIPPING_PATH, languages: languageAlternates(SHIPPING_PATH) },
}

export const dynamic = 'force-dynamic'

export default async function ShippingPage() {
  const rows = await getDeliveryFees()
  return <ShippingView locale="en" rows={rows} />
}
