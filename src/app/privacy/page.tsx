import { PRIVACY_META, PRIVACY_PATH, PrivacyView } from '@/components/pages/privacy'

export const metadata = {
  ...PRIVACY_META,
  alternates: { canonical: PRIVACY_PATH },
}

export default function PrivacyPage() {
  return <PrivacyView />
}
