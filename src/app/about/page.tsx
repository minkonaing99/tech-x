import { ABOUT_META, ABOUT_PATH, AboutView } from '@/components/pages/about'

export const metadata = {
  ...ABOUT_META,
  alternates: { canonical: ABOUT_PATH },
}

export default function AboutPage() {
  return <AboutView />
}
