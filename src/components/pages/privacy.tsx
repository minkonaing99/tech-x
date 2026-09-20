import Link from 'next/link'
import { PageShell, Section, List } from '@/components/page/shell'
import { LEGAL_UPDATED, LOCATION, SITE } from '@/lib/site-info'

export const PRIVACY_PATH = '/privacy'

export const PRIVACY_META = {
  title: 'Privacy',
  description: `What ${SITE.name} collects, why, who else sees it, and how to have it deleted.`,
}

const COLLECT = [
  'Account: your name and email address.',
  'Orders: recipient name, phone number, delivery address, the items you bought, and the order total.',
  'Optional delivery extras: a Telegram handle we can use to confirm the order, and a Google Maps pin for your door. Both are optional, and you can leave either blank.',
  'Payments: the payment slip image you upload and any reference number on it.',
  'Support: whatever you write in the contact form, plus the email address you send it from.',
  'Technical: a cart session cookie, a sign-in cookie, and the server logs your request creates.',
] as const

const WHY = [
  'To take payment, pack your order, and get it delivered.',
  'To answer your messages and handle returns or warranty claims.',
  'To keep your cart, addresses and order history available when you sign back in.',
  'To spot fraud and abuse, and to keep the shop running.',
] as const

const SHARED = [
  'The courier delivering your parcel - name, phone number, address, and the map pin if you gave one.',
  'Google, if you choose to sign in with a Google account.',
  'Cloudflare, which stores product photos and payment slips. Slips sit in a private bucket that only the site can read.',
  'Our email provider, which sends order and account emails on our behalf.',
  'Government authorities, where the law requires it.',
] as const

const PROTECT = [
  'Passwords are stored as bcrypt hashes, never as text.',
  'The site is served over HTTPS with strict transport security.',
  'Payment slips are held in a private bucket and streamed only to signed-in owners of the order.',
  'Admin screens are limited to shop staff accounts.',
] as const

const CHOICES = [
  'Ask for a copy of what we hold about you.',
  'Correct anything wrong - addresses and account details are editable in your account.',
  'Ask us to delete your account and its data, where no legal duty requires us to keep it.',
] as const

/** English only - no Burmese translation until a native speaker reviews it. */
export function PrivacyView() {
  const link = 'text-ink underline underline-offset-4 hover:text-accent'

  return (
    <PageShell
      eyebrow="Privacy"
      title="What we know about you."
      lead={`${SITE.legalName} collects the minimum needed to deliver an order. We do not sell data, and we do not run advertising trackers.`}
      meta={`Last updated ${LEGAL_UPDATED}`}
      path={PRIVACY_PATH}
      locale="en"
      translated={false}
    >
      <Section title="What we collect">
        <List items={COLLECT} />
        <p>We never see or store card numbers - there is no card gateway on this site.</p>
      </Section>

      <Section title="Why we hold it">
        <List items={WHY} />
        <p>We do not use your details for advertising, and we do not build profiles on you.</p>
      </Section>

      <Section title="Who else sees it">
        <List items={SHARED} />
        <p>
          Order alerts to the shop owner go through a Telegram bot. Those messages contain an order
          reference, not your full address.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          Order records stay while the account exists, and afterwards only for as long as tax and
          accounting rules require. Payment slips are kept while a claim or refund is still
          possible. Contact messages are cleared once the question is closed.
        </p>
      </Section>

      <Section title="How it is protected">
        <List items={PROTECT} />
      </Section>

      <Section title="Cookies">
        <p>
          The site sets two cookies, both strictly necessary: one keeps your cart attached to your
          browser for 30 days, the other keeps you signed in until you sign out. Your browser also
          holds a little local storage for the guest cart and wishlist.
        </p>
        <p>
          There is no Google Analytics, no advertising or retargeting pixel, and no cross-site
          tracking - which is why you are not asked to click through a consent banner. Any browser
          can clear cookies for a single site from its privacy settings.
        </p>
      </Section>

      <Section title="Your choices">
        <List items={CHOICES} />
        <p>
          Send any of these through the{' '}
          <Link href="/contact" className={link}>
            contact page
          </Link>{' '}
          and we will act within 30 days.
        </p>
      </Section>

      <Section title="Children">
        <p>
          The shop is meant for adults. We do not knowingly create accounts for anyone under 16. If
          one exists, tell us and we will remove it.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          If this notice changes we update the date at the top of the page. {SITE.legalName} operates
          from {LOCATION}, and data is processed under Myanmar law. Anything unclear goes through the{' '}
          <Link href="/contact" className={link}>
            contact page
          </Link>
          .
        </p>
      </Section>
    </PageShell>
  )
}
