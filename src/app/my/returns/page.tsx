import { RETURNS_META, RETURNS_PATH, ReturnsView } from '@/components/pages/returns'
import { languageAlternates, localePath } from '@/lib/i18n'

export const metadata = {
  ...RETURNS_META.my,
  alternates: {
    canonical: localePath('my', RETURNS_PATH),
    languages: languageAlternates(RETURNS_PATH),
  },
}

export default function ReturnsPageMy() {
  return <ReturnsView locale="my" />
}
