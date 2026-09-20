import { FAQ_META, FAQ_PATH, FaqView } from '@/components/pages/faq'
import { languageAlternates, localePath } from '@/lib/i18n'

export const metadata = {
  ...FAQ_META.my,
  alternates: {
    canonical: localePath('my', FAQ_PATH),
    languages: languageAlternates(FAQ_PATH),
  },
}

export default function FaqPageMy() {
  return <FaqView locale="my" />
}
