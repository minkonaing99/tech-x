import Link from 'next/link'
import { PageShell, Section, List } from '@/components/page/shell'
import { LOCATION, SITE } from '@/lib/site-info'

export const ABOUT_PATH = '/about'

export const ABOUT_META = {
  title: 'About',
  description: `${SITE.name} is a small peripheral shop in ${LOCATION}. Keyboards, mice, headsets, mics, speakers and accessories, picked one at a time.`,
}

const HOW_IT_WORKS = [
  'Order online, pay by bank transfer or mobile wallet, and upload the slip on your order page.',
  'Cash on delivery is available in Yangon and Mandalay for orders under Ks 500,000.',
  'We ship nationwide from Mandalay. The delivery fee depends on your division and is shown at checkout.',
  'A factory fault in the first two weeks? We refund or replace it here in Myanmar. After that we take the warranty claim to the company for you - nothing is your problem to ship overseas.',
] as const

/** English only - this page is deliberately not translated. */
export function AboutView() {
  return (
    <PageShell
      eyebrow="About"
      title="A small shop for desk hardware."
      lead={`${SITE.name} sells computer peripherals from ${LOCATION}. We keep a short shelf and know every item on it.`}
      path={ABOUT_PATH}
      locale="en"
      translated={false}
    >
      <Section title="What we sell">
        <p>
          Mechanical keyboards, wireless and wired mice, headsets, USB microphones, desk speakers,
          and the accessories around them - keycaps, pads, cables and stands.
        </p>
        <p>
          Everything is genuine stock in a sealed box with the manufacturer warranty intact. We do
          not sell refurbished units or grey-market imports.
        </p>
      </Section>

      <Section title="How we pick it">
        <p>
          We use the hardware before we list it. If a board rattles, a mouse feels hollow, or a mic
          hisses, it does not reach the shelf. That is why the catalogue is small - a wall of
          options is easy to stock and hard to trust.
        </p>
      </Section>

      <Section title="How it works">
        <List items={HOW_IT_WORKS} />
      </Section>

      <Section title="Talk to us">
        <p>
          Questions about a product, an order, or stock we do not carry yet -{' '}
          <Link href="/contact" className="text-ink underline underline-offset-4 hover:text-accent">
            get in touch
          </Link>
          . One person reads every message.
        </p>
      </Section>
    </PageShell>
  )
}
