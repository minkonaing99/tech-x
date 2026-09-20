import { Font, Head } from '@react-email/components'
import { siteOrigin } from '@/lib/links'

export function BrandHead() {
  return (
    <Head>
      <Font
        fontFamily="Montserrat"
        fallbackFontFamily="Arial"
        webFont={{ url: `${siteOrigin()}/brand/montserrat.ttf`, format: 'truetype' }}
        fontWeight={400}
        fontStyle="normal"
      />
    </Head>
  )
}

export default BrandHead
