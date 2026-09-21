import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { render } from '@react-email/render'
import { Footer } from '@/components/footer'
import { SITE } from './site-info'
import { PasswordReset } from '../../emails/password-reset'
import { CTABanner } from '@/components/home/cta-banner'
import { ReturnsView } from '@/components/pages/returns'
import { EmailFooter } from '../../emails/_footer'

describe('Tech X branding', () => {
  it('offers buying help without requiring a product and uses current contacts', async () => {
    const html = renderToStaticMarkup(<CTABanner />)
    expect(html).toContain('Talk to Tech X')
    expect(html).toContain('href="/contact"')
    for (const label of ['Your budget', 'Your setup', 'Your priorities']) expect(html).toContain(label)
    expect(html).not.toContain('/product/')
    expect(SITE.telegram).toBe('techxitstore')
    expect(SITE.facebook).toBe('https://www.facebook.com/share/1EPSg63RSt/?mibextid=wwXIfr')
    const emailFooter = await render(<EmailFooter />)
    expect(SITE.city).toBe('Yangon')
    expect(emailFooter).toContain('Yangon, Myanmar')
    expect(emailFooter).toContain('https://t.me/techxitstore')
  })
  it('uses the new identity while preserving storefront navigation', () => {
    const html = renderToStaticMarkup(<Footer />)
    expect(SITE.name).toBe('Tech X')
    expect(html).toContain('Tech X home')
    expect(decodeURIComponent(html)).toContain('/brand/wordmark-reverse.png')
    for (const path of ['/about', '/contact', '/shipping', '/returns', '/faq', '/privacy']) {
      expect(html).toContain(`href="${path}"`)
    }
    expect(html).not.toContain('merxylab')
  })

  it('rebrands password email without changing its action or expiry', async () => {
    const resetUrl = 'https://example.com/reset-password?token=abc'
    const html = await render(<PasswordReset resetUrl={resetUrl} ttlMinutes={15} />)
    expect(html).toContain('Reset your Tech X password')
    expect(html).toContain(`href="${resetUrl}"`)
    expect(html.replace(/<!--.*?-->/g, '')).toContain('15 minutes')
    expect(html).not.toContain('merxylab')
  })

  it('explains the two-week return window and Thailand warranty process', () => {
    const html = renderToStaticMarkup(<ReturnsView locale="en" />)
    expect(html).toContain('first two weeks')
    expect(html).toContain('Thailand')
    expect(html).toContain('about one month')
  })
})
