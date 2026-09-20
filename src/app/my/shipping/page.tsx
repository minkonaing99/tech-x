import { SHIPPING_META, SHIPPING_PATH, ShippingView } from '@/components/pages/shipping'
import { getDeliveryFees } from '@/lib/delivery-fees'
import { languageAlternates, localePath } from '@/lib/i18n'

export const metadata = {
  ...SHIPPING_META.my,
  alternates: {
    canonical: localePath('my', SHIPPING_PATH),
    languages: languageAlternates(SHIPPING_PATH),
  },
}

export const dynamic = 'force-dynamic'

export default async function ShippingPageMy() {
  const rows = await getDeliveryFees()
  return <ShippingView locale="my" rows={rows} />
}
