import type { Metadata, Viewport } from 'next'
import { Inter, Manrope, Noto_Sans_Myanmar } from 'next/font/google'
import { Toaster } from 'sonner'
import { Nav } from '@/components/nav'
import { Footer } from '@/components/footer'
import { CartDrawer } from '@/components/cart-drawer'
import { CartHydrator } from '@/components/cart-hydrator'
import { WishlistHydrator } from '@/components/wishlist/wishlist-hydrator'
import { MotionProvider } from '@/components/motion-provider'
import { AuthProvider } from '@/components/auth-provider'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
})

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

// Manrope and Inter carry no Burmese glyphs - the /my/* content pages need this.
const notoMyanmar = Noto_Sans_Myanmar({
  subsets: ['myanmar'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-noto-myanmar',
})

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://merxylab.example'

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'Tech X - Technology, made clear.',
    template: '%s · Tech X',
  },
  description:
    'Keyboards, mice, monitors, audio and accessories. Upgrade your everyday.',
  applicationName: 'Tech X',
  icons: { icon: '/brand/icon.svg' },
  openGraph: {
    type: 'website',
    title: 'Tech X - Technology, made clear.',
    description:
      'Keyboards, mice, monitors, audio and accessories. Upgrade your everyday.',
    siteName: 'Tech X',
    images: ['/brand/social-cover.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tech X',
    description: 'Technology, made clear.',
    images: ['/brand/social-cover.jpg'],
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  colorScheme: 'light',
}

/**
 * The CSP nonce in `src/middleware.ts` is minted per request, so a page has to
 * be rendered per request for Next to stamp it onto the script tags it emits.
 * Prerendered HTML is built without one, and under a nonce policy every script
 * on it is refused - the page arrives as dead markup.
 *
 * This costs static generation on the content pages (about, faq, legal, the
 * Burmese mirrors, signin/signup). None of them query the database, so the
 * per-request work is React rendering only. Remove this line and the
 * `'unsafe-inline'` fallback returns in `src/lib/csp.ts`.
 */
export const dynamic = 'force-dynamic'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${inter.variable} ${notoMyanmar.variable}`}
    >
      <body className="bg-cream text-ink min-h-screen flex flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-ink text-cream px-3 py-2 rounded z-50"
        >
          Skip to content
        </a>
        <AuthProvider>
          <MotionProvider>
            <Nav />
            <main id="main" className="flex-1">
              {children}
            </main>
            <Footer />
            <CartDrawer />
            <CartHydrator />
            <WishlistHydrator />
          </MotionProvider>
        </AuthProvider>
        {/*
          Top-center, docked under the 64px sticky nav, near the cart button the
          toast is talking about. The bottom-right corner is where the cart
          drawer parks its own "View cart" footer, so a toast landing there
          covers the control it is pointing at.

          5s rather than the 4s default: these toasts carry an action now, and
          the reader has to notice it, aim, and click.
        */}
        <Toaster
          position="top-center"
          offset={{ top: 76 }}
          mobileOffset={{ top: 76 }}
          duration={5000}
          toastOptions={{
            style: {
              background: 'var(--color-surface)',
              color: 'var(--color-ink)',
              border: '1px solid var(--color-line)',
            },
          }}
        />
      </body>
    </html>
  )
}
