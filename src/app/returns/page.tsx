import { RETURNS_META, RETURNS_PATH, ReturnsView } from '@/components/pages/returns'
import { languageAlternates } from '@/lib/i18n'

export const metadata = {
  ...RETURNS_META.en,
  alternates: { canonical: RETURNS_PATH, languages: languageAlternates(RETURNS_PATH) },
}

export default function ReturnsPage() {
  return <ReturnsView locale="en" />
}
