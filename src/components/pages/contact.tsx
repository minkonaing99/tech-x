import Link from 'next/link'
import { ContactForm, type ContactFormCopy } from '@/app/contact/contact-form'
import { PageShell, Section } from '@/components/page/shell'
import { LOCATION, SITE } from '@/lib/site-info'
import { localePath, type Dict, type Locale } from '@/lib/i18n'

export const CONTACT_PATH = '/contact'

interface ContactCopy {
  eyebrow: string
  title: string
  lead: string
  channelsTitle: string
  labels: {
    email: string
    telegram: string
    phone: string
    line: string
    facebook: string
    where: string
    hours: string
  }
  telegramNote: string
  viberNote: string
  facebookValue: string
  formTitle: string
  formIntro: string
  form: ContactFormCopy
  beforeTitle: string
  before: { a: string; shipping: string; b: string; faq: string; c: string }
}

const COPY: Dict<ContactCopy> = {
  en: {
    eyebrow: 'Contact',
    title: 'Ask us anything about your desk.',
    lead: 'Orders, stock, returns, or a product we do not carry yet. One person reads every message, and replies land within two working days.',
    channelsTitle: 'Direct channels',
    labels: {
      email: 'Email',
      telegram: 'Telegram',
      phone: 'Phone',
      line: 'LINE',
      facebook: 'Facebook',
      where: 'Where we are',
      hours: 'Hours',
    },
    telegramNote: 'Fastest for order questions.',
    viberNote: 'Same number on Viber.',
    facebookValue: 'Tech X on Facebook',
    formTitle: 'Send a message',
    formIntro:
      'Already placed an order? Add the order number so we can find it without asking twice.',
    form: {
      name: 'Your name',
      email: 'Email',
      topicLabel: 'What is it about',
      topics: {
        order: 'An order I placed',
        product: 'A product question',
        returns: 'Return or warranty',
        press: 'Press',
        other: 'Something else',
      },
      orderId: 'Order number',
      orderIdHelper: 'Only if it is about an order.',
      message: 'Message',
      tooShort: 'Tell us a little more - at least a sentence.',
      send: 'Send message',
      sending: 'Sending...',
      sent: 'Message sent. We reply within two working days.',
      failed: 'Message could not be sent.',
    },
    beforeTitle: 'Before you write',
    before: {
      a: 'Delivery times and fees are on the ',
      shipping: 'shipping page',
      b: ', and the ',
      faq: 'FAQ',
      c: ' covers payment, stock and account questions. Both are faster than waiting on a reply.',
    },
  },
  my: {
    eyebrow: 'ဆက်သွယ်ရန်',
    title: 'သင့်စားပွဲအတွက် ဘာမဆို မေးနိုင်ပါသည်',
    lead: 'အော်ဒါ၊ ပစ္စည်းလက်ကျန်၊ ပြန်အမ်းခြင်း သို့မဟုတ် ကျွန်ုပ်တို့ မရောင်းသေးသော ပစ္စည်းများ။ စာတိုင်းကို လူကိုယ်တိုင် ဖတ်ပြီး အလုပ်ရက် နှစ်ရက်အတွင်း ပြန်ဖြေပါသည်။',
    channelsTitle: 'တိုက်ရိုက် ဆက်သွယ်ရန်',
    labels: {
      email: 'Email',
      telegram: 'Telegram',
      phone: 'ဖုန်း',
      line: 'LINE',
      facebook: 'Facebook',
      where: 'တည်နေရာ',
      hours: 'ဖွင့်ချိန်',
    },
    telegramNote: 'အော်ဒါကိစ္စအတွက် အမြန်ဆုံး။',
    viberNote: 'Viber သည် ဤဖုန်းနံပါတ်အတိုင်းပင်။',
    facebookValue: 'Facebook စာမျက်နှာ',
    formTitle: 'စာပို့ရန်',
    formIntro:
      'အော်ဒါ မှာပြီးသားလား။ အော်ဒါနံပါတ် ထည့်ပေးပါ - ထပ်မေးစရာ မလိုအောင် ရှာလို့ရပါမည်။',
    form: {
      name: 'အမည်',
      email: 'Email',
      topicLabel: 'ဘာအကြောင်း မေးမလဲ',
      topics: {
        order: 'ကျွန်ုပ် မှာထားသော အော်ဒါ',
        product: 'ပစ္စည်းအကြောင်း မေးခွန်း',
        returns: 'ပြန်အမ်းခြင်း သို့မဟုတ် အာမခံ',
        press: 'သတင်းမီဒီယာ',
        other: 'အခြား',
      },
      orderId: 'အော်ဒါနံပါတ်',
      orderIdHelper: 'အော်ဒါနှင့် သက်ဆိုင်မှသာ ဖြည့်ပါ။',
      message: 'စာ',
      tooShort: 'နည်းနည်း ပိုရေးပြပါ - အနည်းဆုံး ဝါကျတစ်ကြောင်း။',
      send: 'စာပို့မည်',
      sending: 'ပို့နေသည်...',
      sent: 'စာပို့ပြီးပါပြီ။ အလုပ်ရက် နှစ်ရက်အတွင်း ပြန်ဖြေပါမည်။',
      failed: 'စာ မပို့နိုင်ပါ။',
    },
    beforeTitle: 'မမေးခင် ကြည့်သင့်သည်များ',
    before: {
      a: 'ပို့ဆောင်ချိန်နှင့် ပို့ခများကို ',
      shipping: 'ပို့ဆောင်ရေး စာမျက်နှာ',
      b: ' တွင် ကြည့်နိုင်ပြီး ငွေပေးချေမှု၊ ပစ္စည်းလက်ကျန်နှင့် အကောင့်ဆိုင်ရာ မေးခွန်းများကို ',
      faq: 'မေးလေ့ရှိသော မေးခွန်းများ',
      c: ' တွင် ဖြေထားပါသည်။ ပြန်စာ စောင့်ရသည်ထက် မြန်ပါသည်။',
    },
  },
}

export const CONTACT_META: Dict<{ title: string; description: string }> = {
  en: {
    title: 'Contact',
    description: `Reach ${SITE.name} about an order, a product, a return, or press. Based in ${LOCATION}.`,
  },
  my: {
    title: 'ဆက်သွယ်ရန်',
    description: `${SITE.name} ကို အော်ဒါ၊ ပစ္စည်း သို့မဟုတ် ပြန်အမ်းကိစ္စအတွက် ဆက်သွယ်ပါ။ မန္တလေးမြို့။`,
  },
}

interface Channel {
  label: string
  value: string
  href?: string
  note?: string
}

function channels(t: ContactCopy): Channel[] {
  const list: Channel[] = []
  if (SITE.email) {
    list.push({ label: t.labels.email, value: SITE.email, href: `mailto:${SITE.email}` })
  }
  if (SITE.telegram) {
    list.push({
      label: t.labels.telegram,
      value: `@${SITE.telegram}`,
      href: `https://t.me/${SITE.telegram}`,
      note: t.telegramNote,
    })
  }
  if (SITE.phone) {
    list.push({
      label: t.labels.phone,
      value: SITE.phone,
      href: SITE.phoneDigits ? `tel:${SITE.phoneDigits}` : undefined,
      note: SITE.viber ? t.viberNote : undefined,
    })
  }
  if (SITE.line) {
    list.push({
      label: t.labels.line,
      value: SITE.line,
      href: `https://line.me/ti/p/~${SITE.line}`,
    })
  }
  if (SITE.facebook) {
    list.push({ label: t.labels.facebook, value: t.facebookValue, href: SITE.facebook })
  }
  list.push({
    label: t.labels.where,
    value: SITE.street ? `${SITE.street}, ${LOCATION}` : LOCATION,
  })
  if (SITE.hours) list.push({ label: t.labels.hours, value: SITE.hours })
  return list
}

export function ContactView({ locale }: { locale: Locale }) {
  const t = COPY[locale]
  const list = channels(t)
  const link = 'text-ink underline underline-offset-4 hover:text-accent'

  return (
    <PageShell
      eyebrow={t.eyebrow}
      title={t.title}
      lead={t.lead}
      path={CONTACT_PATH}
      locale={locale}
    >
      <Section title={t.channelsTitle}>
        <dl className="divide-y divide-line border-y border-line">
          {list.map((c) => (
            <div key={c.label} className="grid gap-1 py-4 sm:grid-cols-[14ch_1fr] sm:gap-6">
              <dt className="text-[12px] tracking-[0.08em] text-muted uppercase">{c.label}</dt>
              <dd className="text-[15px] text-ink">
                {c.href ? (
                  <a
                    href={c.href}
                    className="underline underline-offset-4 hover:text-accent"
                    target={c.href.startsWith('http') ? '_blank' : undefined}
                    rel={c.href.startsWith('http') ? 'noreferrer' : undefined}
                  >
                    {c.value}
                  </a>
                ) : (
                  c.value
                )}
                {c.note && <span className="mt-0.5 block text-[13px] text-muted">{c.note}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title={t.formTitle}>
        <p>{t.formIntro}</p>
        <div className="pt-2">
          <ContactForm copy={t.form} />
        </div>
      </Section>

      <Section title={t.beforeTitle}>
        <p>
          {t.before.a}
          <Link href={localePath(locale, '/shipping')} className={link}>
            {t.before.shipping}
          </Link>
          {t.before.b}
          <Link href={localePath(locale, '/faq')} className={link}>
            {t.before.faq}
          </Link>
          {t.before.c}
        </p>
      </Section>
    </PageShell>
  )
}
