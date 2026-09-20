import { FAQ_META, FAQ_PATH, FaqView } from '@/components/pages/faq'
import { languageAlternates } from '@/lib/i18n'

export const metadata = {
  ...FAQ_META.en,
  alternates: { canonical: FAQ_PATH, languages: languageAlternates(FAQ_PATH) },
}

export default function FaqPage() {
  return <FaqView locale="en" />
}
