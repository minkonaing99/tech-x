import { getSetting } from '@/lib/site-settings'
import { r2PublicUrl } from '@/lib/cdn'
import { WhyImageUploader } from './why-image-uploader'

export const dynamic = 'force-dynamic'

export default async function BrandingPage() {
  const key = await getSetting('why_image')
  const url = key ? r2PublicUrl(key) : null

  return (
    <div>
      <h2 className="font-display text-[22px] text-ink">Branding</h2>
      <p className="mt-1 text-[14px] text-muted">Customise homepage assets.</p>

      <div className="mt-8 space-y-2">
        <h3 className="font-medium text-[15px] text-ink">Why Tech X - section image</h3>
        <p className="text-[13px] text-muted">Shown in the left panel of the &ldquo;Why Tech X&rdquo; section. PNG with transparent background supported.</p>
        <div className="mt-4">
          <WhyImageUploader initialUrl={url} />
        </div>
      </div>
    </div>
  )
}
