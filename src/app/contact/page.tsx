import { CONTACT_META, CONTACT_PATH, ContactView } from '@/components/pages/contact'
import { languageAlternates } from '@/lib/i18n'

export const metadata = {
  ...CONTACT_META.en,
  alternates: { canonical: CONTACT_PATH, languages: languageAlternates(CONTACT_PATH) },
}

export default function ContactPage() {
  return <ContactView locale="en" />
}
