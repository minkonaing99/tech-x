import { CONTACT_META, CONTACT_PATH, ContactView } from '@/components/pages/contact'
import { languageAlternates, localePath } from '@/lib/i18n'

export const metadata = {
  ...CONTACT_META.my,
  alternates: {
    canonical: localePath('my', CONTACT_PATH),
    languages: languageAlternates(CONTACT_PATH),
  },
}

export default function ContactPageMy() {
  return <ContactView locale="my" />
}
