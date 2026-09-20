import Link from 'next/link'
import { PageShell, Section, List } from '@/components/page/shell'
import { SITE } from '@/lib/site-info'
import { localePath, type Dict, type Locale } from '@/lib/i18n'

export const RETURNS_PATH = '/returns'

interface ReturnsCopy {
  eyebrow: string
  title: string
  lead: string
  rule: { title: string; intro: string; items: readonly string[] }
  cannot: { title: string; items: readonly string[] }
  start: { title: string; items: readonly string[]; before: string; link: string; after: string }
  warranty: { title: string; intro: string; items: readonly string[] }
  cancel: { title: string; body: string }
}

const COPY: Dict<ReturnsCopy> = {
  en: {
    eyebrow: 'Support',
    title: 'Returns and warranty.',
    lead: 'If something is wrong, we sort it out here in Myanmar. Nothing gets shipped overseas and you never deal with the manufacturer alone.',
    rule: {
      title: 'The first two weeks',
      intro:
        'You have two weeks from delivery to tell us about a factory fault. We handle it ourselves in that window - refund or replacement, your choice, once we have seen the fault. After two weeks a fault becomes a warranty claim, which we take to the company for you.',
      items: [
        'Faulty on arrival: full refund or a replacement unit, delivery on us.',
        'A factory fault that shows up in the first two weeks: same - refund or replacement.',
        'Wrong item sent: our mistake, our cost, both ways.',
      ],
    },
    cannot: {
      title: 'What we cannot take back',
      items: [
        'A product you simply changed your mind about. Check the specs and ask us anything before you order - we would rather answer questions than process a return.',
        'Keycaps, switches, and other opened consumable parts, unless they arrived faulty.',
        'Products damaged by drops, liquid, power surges, or an attempted repair.',
        'Faults reported after two weeks, which move to the warranty process below.',
      ],
    },
    start: {
      title: 'How to start a return',
      items: [
        'Message us with your order number and a short description of the fault.',
        'Send a photo or a short video of the problem - it usually saves a round trip.',
        'We confirm the return and tell you where to send the parcel, or arrange a pickup.',
        'Refunds go back to the account you paid from, within 7 working days of the item arriving.',
      ],
      before: '',
      link: 'Start here',
      after: ' - the form asks for the order number up front.',
    },
    warranty: {
      title: 'Warranty',
      intro:
        'Every product is genuine, sealed stock and carries the manufacturer warranty that came with it - typically one to two years, depending on the brand. The warranty period for a specific product is listed in its specs. This is the route for any fault found after the first two weeks.',
      items: [
        'Keep your order number: it is your proof of purchase, so no paper receipt is needed.',
        'We send the product to the company and follow their warranty policy. The outcome - repair, replacement, or refusal - is theirs to decide, not ours.',
        'We handle the claim with the distributor on your behalf.',
        'Turnaround depends on the brand. We tell you the expected wait before you send anything in.',
        'Physical damage, liquid damage, and normal wear on cables or switches are not covered.',
      ],
    },
    cancel: {
      title: 'Cancelling an order',
      body: 'An order that has not been paid can be cancelled from your order page, and one that is unpaid for 24 hours cancels itself. After payment is confirmed, message us before it ships and we will stop the parcel if there is still time.',
    },
  },
  my: {
    eyebrow: 'ဝန်ဆောင်မှု',
    title: 'ပြန်အမ်းခြင်းနှင့် အာမခံ',
    lead: 'ပြဿနာ ရှိပါက မြန်မာပြည်တွင်းမှာပင် ဖြေရှင်းပေးပါသည်။ နိုင်ငံရပ်ခြားသို့ ပို့စရာ မလိုပါ၊ ထုတ်လုပ်သူနှင့် သင်တစ်ယောက်တည်း ဆက်သွယ်စရာလည်း မလိုပါ။',
    rule: {
      title: 'ပထမ နှစ်ပတ်',
      intro:
        'ပစ္စည်းရောက်ပြီးနောက် နှစ်ပတ်အတွင်း ထုတ်လုပ်မှု ချွတ်ယွင်းချက်ကို အကြောင်းကြားနိုင်သည်။ ထိုကာလအတွင်း ကျွန်ုပ်တို့ ကိုယ်တိုင် ဖြေရှင်းပေးသည် - ချွတ်ယွင်းချက်ကို စစ်ဆေးပြီးလျှင် ငွေပြန်အမ်းမလား၊ အသစ်လဲမလား သင် ရွေးနိုင်သည်။ နှစ်ပတ်ကျော်ပါက အာမခံကိစ္စ ဖြစ်လာပြီး ကုမ္ပဏီထံ ကျွန်ုပ်တို့ ကိုယ်စား ဆောင်ရွက်ပေးသည်။',
      items: [
        'ရောက်ကတည်းက ချွတ်ယွင်းနေပါက - ငွေအပြည့် ပြန်အမ်း သို့မဟုတ် အသစ်လဲပေးပြီး ပို့ခကို ကျွန်ုပ်တို့ ကျခံသည်။',
        'ပထမ နှစ်ပတ်အတွင်း ထုတ်လုပ်မှု ချွတ်ယွင်းချက် ပေါ်လာပါက - အတူတူပင် ငွေပြန်အမ်း သို့မဟုတ် အသစ်လဲပေးသည်။',
        'ပစ္စည်းမှား ပို့မိပါက - ကျွန်ုပ်တို့ အမှားဖြစ်၍ နှစ်ဖက်စလုံး ကျွန်ုပ်တို့ ကျခံသည်။',
      ],
    },
    cannot: {
      title: 'ပြန်မယူနိုင်သည့် အရာများ',
      items: [
        'စိတ်ပြောင်းသွားခြင်းအတွက် ပြန်အမ်းခြင်း မရှိပါ။ မဝယ်ခင် အသေးစိတ်ကို ကြည့်ပြီး လိုအပ်သည်များ မေးနိုင်ပါသည် - ပြန်အမ်းရသည်ထက် မေးခွန်းဖြေရတာ ကျွန်ုပ်တို့ ပိုလိုလားသည်။',
        'ဖွင့်ပြီးသား keycap, switch စသည့် အသုံးအဆောင် အပိုပစ္စည်းများ - ရောက်ကတည်းက ချွတ်ယွင်းနေခြင်း မဟုတ်လျှင်။',
        'ပြုတ်ကျခြင်း၊ အရည်ဖိတ်ခြင်း၊ လျှပ်စစ်ဓာတ်အား တက်ခြင်း သို့မဟုတ် ကိုယ်တိုင် ပြုပြင်ရာမှ ပျက်စီးသော ပစ္စည်းများ။',
        'နှစ်ပတ်ကျော်မှ အကြောင်းကြားသော ချွတ်ယွင်းချက်များ - ၎င်းတို့ကို အောက်ပါ အာမခံ လုပ်ငန်းစဉ်ဖြင့် ဆောင်ရွက်သည်။',
      ],
    },
    start: {
      title: 'ပြန်အမ်းရန် ဘယ်လို စတင်မလဲ',
      items: [
        'အော်ဒါနံပါတ်နှင့် ချွတ်ယွင်းချက်ကို အတိုချုံး ရေးပြီး စာပို့ပါ။',
        'ပြဿနာကို ဓာတ်ပုံ သို့မဟုတ် video တိုလေး ပို့ပါ - အသွားအပြန် သက်သာစေပါသည်။',
        'ကျွန်ုပ်တို့ အတည်ပြုပြီး ဘယ်ကို ပြန်ပို့ရမည်ကို အကြောင်းကြားမည်၊ သို့မဟုတ် လာယူရန် စီစဉ်ပေးမည်။',
        'ပစ္စည်းရောက်ပြီးနောက် အလုပ်ရက် ၇ ရက်အတွင်း ငွေပေးခဲ့သည့် အကောင့်သို့ ပြန်လွှဲပေးသည်။',
      ],
      before: '',
      link: 'ဤနေရာမှ စတင်ပါ',
      after: ' - ဖောင်တွင် အော်ဒါနံပါတ်ကို ဦးစွာ တောင်းပါသည်။',
    },
    warranty: {
      title: 'အာမခံ',
      intro:
        'ပစ္စည်းတိုင်းသည် ချိပ်ပိတ်ထားသော အစစ်အမှန်ဖြစ်ပြီး ထုတ်လုပ်သူ၏ အာမခံ ပါဝင်သည် - အမှတ်တံဆိပ်ပေါ် မူတည်၍ ပုံမှန်အားဖြင့် တစ်နှစ်မှ နှစ်နှစ်။ ပစ္စည်းတစ်ခုချင်းစီ၏ အာမခံကာလကို ၎င်း၏ အသေးစိတ်စာရင်းတွင် ဖော်ပြထားသည်။ ပထမ နှစ်ပတ်ကျော်ပြီးနောက် ပေါ်လာသော ချွတ်ယွင်းချက်များကို ဤလုပ်ငန်းစဉ်ဖြင့် ဆောင်ရွက်သည်။',
      items: [
        'အော်ဒါနံပါတ်ကို သိမ်းထားပါ - ဝယ်ယူကြောင်း သက်သေဖြစ်၍ စာရွက်ဘောက်ချာ မလိုပါ။',
        'ပစ္စည်းကို ကုမ္ပဏီထံ ပို့ပြီး ၎င်းတို့၏ အာမခံ စည်းမျဉ်းအတိုင်း ဆောင်ရွက်သည်။ ပြုပြင်မလား၊ အသစ်လဲမလား၊ ငြင်းပယ်မလားကို ကုမ္ပဏီမှ ဆုံးဖြတ်သည် - ကျွန်ုပ်တို့ မဆုံးဖြတ်ပါ။',
        'ဖြန့်ချိသူနှင့် အာမခံကိစ္စကို ကျွန်ုပ်တို့ ကိုယ်စား ဆောင်ရွက်ပေးသည်။',
        'ကြာချိန်သည် အမှတ်တံဆိပ်ပေါ် မူတည်သည်။ ပစ္စည်း မပို့ခင် ခန့်မှန်းကြာချိန်ကို ကြိုပြောပါသည်။',
        'ရုပ်ပိုင်းဆိုင်ရာ ပျက်စီးမှု၊ အရည်ဖိတ်မှုနှင့် cable, switch များ သဘာဝအလျောက် ဟောင်းနွမ်းမှုကို အာမခံ မပါဝင်ပါ။',
      ],
    },
    cancel: {
      title: 'အော်ဒါ ပယ်ဖျက်ခြင်း',
      body: 'ငွေမပေးရသေးသော အော်ဒါကို အော်ဒါစာမျက်နှာမှ ပယ်ဖျက်နိုင်ပြီး ၂၄ နာရီ ငွေမပေးပါက အလိုအလျောက် ပယ်ဖျက်သွားသည်။ ငွေပေးပြီးပါက ပစ္စည်းမထွက်ခင် အမြန် စာပို့ပါ - အချိန်မီပါက ရပ်ပေးပါမည်။',
    },
  },
}

export const RETURNS_META: Dict<{ title: string; description: string }> = {
  en: {
    title: 'Returns and warranty',
    description: `Two weeks to refund or replace a factory fault, plus the manufacturer warranty on every product ${SITE.name} sells.`,
  },
  my: {
    title: 'ပြန်အမ်းခြင်းနှင့် အာမခံ',
    description:
      'ထုတ်လုပ်မှု ချွတ်ယွင်းချက်အတွက် နှစ်ပတ်အတွင်း ငွေပြန်အမ်း သို့မဟုတ် အသစ်လဲပေးခြင်းနှင့် ထုတ်လုပ်သူ အာမခံ။',
  },
}

export function ReturnsView({ locale }: { locale: Locale }) {
  const t = COPY[locale]

  return (
    <PageShell
      eyebrow={t.eyebrow}
      title={t.title}
      lead={t.lead}
      path={RETURNS_PATH}
      locale={locale}
    >
      <Section title={t.rule.title}>
        <p>{t.rule.intro}</p>
        <List items={t.rule.items} />
      </Section>

      <Section title={t.cannot.title}>
        <List items={t.cannot.items} />
      </Section>

      <Section title={t.start.title}>
        <List items={t.start.items} />
        <p>
          {t.start.before}
          <Link
            href={localePath(locale, '/contact')}
            className="text-ink underline underline-offset-4 hover:text-accent"
          >
            {t.start.link}
          </Link>
          {t.start.after}
        </p>
      </Section>

      <Section title={t.warranty.title} id="warranty">
        <p>{t.warranty.intro}</p>
        <List items={t.warranty.items} />
      </Section>

      <Section title={t.cancel.title}>
        <p>{t.cancel.body}</p>
      </Section>
    </PageShell>
  )
}
