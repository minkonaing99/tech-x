import Link from 'next/link'
import { PageShell } from '@/components/page/shell'
import { SITE } from '@/lib/site-info'
import { localePath, type Dict, type Locale } from '@/lib/i18n'

export const FAQ_PATH = '/faq'

interface QA {
  q: string
  a: string
}

interface FaqCopy {
  eyebrow: string
  title: string
  lead: string
  groups: readonly { title: string; items: readonly QA[] }[]
  stuck: { before: string; link: string; after: string }
}

const COPY: Dict<FaqCopy> = {
  en: {
    eyebrow: 'FAQ',
    title: 'Questions people actually ask.',
    lead: 'Payment, delivery, stock and warranty in short answers. If yours is not here, ask us directly.',
    groups: [
      {
        title: 'Ordering and payment',
        items: [
          {
            q: 'How do I pay?',
            a: 'Bank transfer or mobile wallet. Place the order, then upload the payment slip on your order page. We confirm it by hand, usually the same day.',
          },
          {
            q: 'Is cash on delivery available?',
            a: 'Yes, in Yangon and Mandalay, for orders under Ks 500,000. Everywhere else is prepaid.',
          },
          {
            q: 'Do you take cards?',
            a: 'No. There is no card gateway on the site, so nothing sensitive is ever typed into it.',
          },
          {
            q: 'How long do I have to pay?',
            a: 'Twenty-four hours. Unpaid orders cancel automatically after that and the stock goes back on the shelf.',
          },
          {
            q: 'Are prices in kyat?',
            a: 'Yes, every price is in Myanmar kyat (MMK) and includes nothing hidden. Delivery is added at checkout.',
          },
        ],
      },
      {
        title: 'Delivery',
        items: [
          {
            q: 'Where do you ship?',
            a: `Anywhere in Myanmar, from ${SITE.city}. We do not ship internationally.`,
          },
          {
            q: 'How much is delivery?',
            a: 'It depends on your division. The full fee table is on the shipping page, and the exact amount appears at checkout before you pay.',
          },
          {
            q: 'How long does it take?',
            a: 'One to two days inside Mandalay, two to four days for main cities, up to a week for remote townships.',
          },
          {
            q: 'Can I track it?',
            a: 'Your order page shows the current status. Once a parcel is with the courier, message us and we will pass on the tracking.',
          },
        ],
      },
      {
        title: 'Products and stock',
        items: [
          {
            q: 'Is the stock genuine?',
            a: 'Yes. Sealed retail boxes with the manufacturer warranty intact. No refurbished units, no grey-market imports.',
          },
          {
            q: 'Why is the catalogue so small?',
            a: 'We only list what we have used. A short shelf is the point, not a limitation.',
          },
          {
            q: 'Something is out of stock. Will it come back?',
            a: 'Usually. Message us with the product name and we will tell you whether it is on the next order and roughly when.',
          },
          {
            q: 'Do you sell keycaps, cables and pads?',
            a: 'Yes, they live under Accessories along with stands and mounts.',
          },
        ],
      },
      {
        title: 'After the sale',
        items: [
          {
            q: 'What if it arrives faulty?',
            a: 'Tell us within two weeks and we refund or replace it ourselves. Full details are on the returns and warranty page.',
          },
          {
            q: 'What happens after the first two weeks?',
            a: 'A fault becomes a warranty claim. We send the product to the company and follow their warranty policy, so you are not dealing with the manufacturer alone.',
          },
          {
            q: 'How long is the warranty?',
            a: 'Whatever the manufacturer gives, typically one to two years. It is listed in each product spec sheet, and we handle the claim for you.',
          },
          {
            q: 'Can I return something I simply did not like?',
            a: 'No - returns cover factory faults and our own mistakes, not a change of mind. Ask us anything before you order and we will tell you straight whether a product suits you.',
          },
        ],
      },
      {
        title: 'Account and privacy',
        items: [
          {
            q: 'Do I need an account to order?',
            a: 'You can browse and fill a cart as a guest. An account saves your addresses and order history, and lets you upload a payment slip later.',
          },
          {
            q: 'Can I sign in with Google?',
            a: 'Yes, or with an email address and password.',
          },
          {
            q: 'What do you do with my details?',
            a: 'We use them to deliver your order and nothing else - name, phone and address go to the courier, and that is it. We do not sell data or run advertising trackers.',
          },
        ],
      },
    ],
    stuck: {
      before: 'Still stuck? ',
      link: 'Send us a message',
      after: ' - replies land within two working days.',
    },
  },
  my: {
    eyebrow: 'မေးလေ့ရှိသော မေးခွန်းများ',
    title: 'အမေးများသော မေးခွန်းများ',
    lead: 'ငွေပေးချေမှု၊ ပို့ဆောင်ရေး၊ ပစ္စည်းလက်ကျန်နှင့် အာမခံအတွက် အဖြေတိုများ။ သင့်မေးခွန်း မပါလျှင် တိုက်ရိုက် မေးနိုင်သည်။',
    groups: [
      {
        title: 'မှာယူခြင်းနှင့် ငွေပေးချေခြင်း',
        items: [
          {
            q: 'ဘယ်လို ငွေပေးရမလဲ',
            a: 'ဘဏ်လွှဲ သို့မဟုတ် မိုဘိုင်းပိုက်ဆံအိတ်ဖြင့် ပေးနိုင်သည်။ အော်ဒါတင်ပြီး ငွေလွှဲပြေစာကို အော်ဒါစာမျက်နှာတွင် တင်ပါ။ ပုံမှန်အားဖြင့် ထိုနေ့အတွင်း လူကိုယ်တိုင် စစ်ဆေး အတည်ပြုပါသည်။',
          },
          {
            q: 'အိမ်ရောက် ငွေချေလို့ ရလား',
            a: 'ရန်ကုန်နှင့် မန္တလေးတွင် ကျပ် ၅၀၀,၀၀၀ အောက် အော်ဒါများအတွက် ရပါသည်။ အခြားနေရာများတွင် ကြိုတင် ငွေပေးရပါမည်။',
          },
          {
            q: 'Card နဲ့ ပေးလို့ ရလား',
            a: 'မရပါ။ ဆိုက်တွင် card payment gateway မထားပါ - ထို့ကြောင့် အရေးကြီးသော card အချက်အလက် ရိုက်ထည့်စရာ မလိုပါ။',
          },
          {
            q: 'ငွေပေးရန် အချိန် ဘယ်လောက် ရလဲ',
            a: '၂၄ နာရီ။ ထိုအချိန်ကျော်လျှင် အော်ဒါကို အလိုအလျောက် ပယ်ဖျက်ပြီး ပစ္စည်းကို စင်ပေါ် ပြန်တင်ပါသည်။',
          },
          {
            q: 'စျေးနှုန်းများသည် ကျပ်ငွေလား',
            a: 'ဟုတ်ပါသည်။ စျေးနှုန်းအားလုံး မြန်မာကျပ်ငွေ (MMK) ဖြင့်ဖြစ်ပြီး ဝှက်ထားသော ကုန်ကျစရိတ် မရှိပါ။ ပို့ခကို ငွေရှင်းချိန်တွင် ပေါင်းထည့်သည်။',
          },
        ],
      },
      {
        title: 'ပို့ဆောင်ရေး',
        items: [
          {
            q: 'ဘယ်နေရာတွေကို ပို့ပေးလဲ',
            a: `${SITE.city}မြို့မှ မြန်မာနိုင်ငံ တစ်ဝန်းလုံးသို့ ပို့ပေးသည်။ နိုင်ငံရပ်ခြားသို့ မပို့ပါ။`,
          },
          {
            q: 'ပို့ခ ဘယ်လောက်လဲ',
            a: 'တိုင်းဒေသကြီးပေါ် မူတည်သည်။ နှုန်းထားအပြည့်အစုံကို ပို့ဆောင်ရေး စာမျက်နှာတွင် ဖော်ပြထားပြီး အတိအကျ ပမာဏကို ငွေမပေးမီ ငွေရှင်းချိန်တွင် ပြပါသည်။',
          },
          {
            q: 'ဘယ်လောက် ကြာလဲ',
            a: 'မန္တလေးတွင်း ၁ ရက်မှ ၂ ရက်၊ မြို့ကြီးများ ၂ ရက်မှ ၄ ရက်၊ ဝေးလံသော မြို့နယ်များ တစ်ပတ်အထိ ကြာနိုင်သည်။',
          },
          {
            q: 'ပစ္စည်း ဘယ်ရောက်နေလဲ သိနိုင်လား',
            a: 'အော်ဒါစာမျက်နှာတွင် လက်ရှိအခြေအနေကို ပြပါသည်။ ပစ္စည်း ကားဂိတ်ရောက်ပြီးလျှင် စာပို့လိုက်ပါ၊ tracking ကို ပြန်ပေးပါမည်။',
          },
        ],
      },
      {
        title: 'ပစ္စည်းများနှင့် လက်ကျန်',
        items: [
          {
            q: 'ပစ္စည်းတွေ အစစ်လား',
            a: 'အစစ်ပါ။ ချိပ်ပိတ်ထားသော ဘူးအတွင်း ထုတ်လုပ်သူ အာမခံ အပြည့်အဝဖြင့် ရောင်းပါသည်။ ပြန်လည်ပြုပြင်ထားသော ပစ္စည်းများ၊ တရားမဝင် သွင်းကုန်များ မရောင်းပါ။',
          },
          {
            q: 'ပစ္စည်းစာရင်း ဘာကြောင့် နည်းနေတာလဲ',
            a: 'ကိုယ်တိုင် သုံးကြည့်ပြီးသား ပစ္စည်းများကိုသာ တင်သည်။ စာရင်းတိုခြင်းသည် ရည်ရွယ်ချက်ဖြစ်ပြီး အားနည်းချက် မဟုတ်ပါ။',
          },
          {
            q: 'ပစ္စည်း ကုန်နေသည်။ ပြန်ဝင်မလား',
            a: 'များသောအားဖြင့် ပြန်ဝင်ပါသည်။ ပစ္စည်းအမည်နှင့် စာပို့လိုက်ပါ - နောက်တစ်ခေါက် မှာမည်ဟုတ်မဟုတ်နှင့် ခန့်မှန်းချိန်ကို ပြောပြပါမည်။',
          },
          {
            q: 'Keycap, cable, mousepad တွေ ရောင်းလား',
            a: 'ရောင်းပါသည်။ stand, mount များနှင့်အတူ Accessories အောက်တွင် ရှိပါသည်။',
          },
        ],
      },
      {
        title: 'ဝယ်ပြီးနောက်',
        items: [
          {
            q: 'ပစ္စည်း ချွတ်ယွင်းနေရင် ဘယ်လိုလုပ်ရမလဲ',
            a: 'နှစ်ပတ်အတွင်း အကြောင်းကြားပါ - ကျွန်ုပ်တို့ ကိုယ်တိုင် ငွေပြန်အမ်း သို့မဟုတ် အသစ်လဲပေးပါသည်။ အသေးစိတ်ကို ပြန်အမ်းခြင်းနှင့် အာမခံ စာမျက်နှာတွင် ကြည့်ပါ။',
          },
          {
            q: 'ပထမ နှစ်ပတ် ကျော်ပြီးရင် ဘယ်လိုလဲ',
            a: 'ချွတ်ယွင်းချက်သည် အာမခံကိစ္စ ဖြစ်လာသည်။ ပစ္စည်းကို ကုမ္ပဏီထံ ပို့ပြီး ၎င်းတို့၏ အာမခံ စည်းမျဉ်းအတိုင်း ဆောင်ရွက်ပေးသဖြင့် ထုတ်လုပ်သူနှင့် သင်တစ်ယောက်တည်း ဆက်သွယ်စရာ မလိုပါ။',
          },
          {
            q: 'အာမခံ ဘယ်လောက် ကြာလဲ',
            a: 'ထုတ်လုပ်သူ ပေးသည့်အတိုင်း၊ ပုံမှန်အားဖြင့် တစ်နှစ်မှ နှစ်နှစ်။ ပစ္စည်းတစ်ခုချင်းစီ၏ အသေးစိတ်တွင် ဖော်ပြထားပြီး အာမခံကိစ္စကို ကျွန်ုပ်တို့ ကိုယ်စား ဆောင်ရွက်ပေးသည်။',
          },
          {
            q: 'သဘောမကျလို့ ပြန်အမ်းလို့ ရလား',
            a: 'မရပါ - ထုတ်လုပ်မှု ချွတ်ယွင်းချက်နှင့် ကျွန်ုပ်တို့ အမှားများအတွက်သာ ပြန်အမ်းပါသည်၊ စိတ်ပြောင်းသွားခြင်းအတွက် မဟုတ်ပါ။ မဝယ်ခင် လိုအပ်သည်များ မေးနိုင်ပါသည် - သင့်အတွက် သင့်မသင့် ဖြောင့်ဖြောင့် ပြောပါမည်။',
          },
        ],
      },
      {
        title: 'အကောင့်နှင့် ကိုယ်ရေးအချက်အလက်',
        items: [
          {
            q: 'မှာယူဖို့ အကောင့် လိုလား',
            a: 'ဧည့်သည်အဖြစ် ကြည့်ရှုပြီး စျေးခြင်းထဲ ထည့်နိုင်သည်။ အကောင့်ရှိလျှင် လိပ်စာနှင့် အော်ဒါမှတ်တမ်း သိမ်းထားပေးပြီး ငွေလွှဲပြေစာကို နောက်မှ တင်နိုင်သည်။',
          },
          {
            q: 'Google နဲ့ ဝင်လို့ ရလား',
            a: 'ရပါသည်။ Email နှင့် စကားဝှက်ဖြင့်လည်း ဝင်နိုင်သည်။',
          },
          {
            q: 'ကျွန်ုပ်၏ အချက်အလက်များကို ဘာလုပ်လဲ',
            a: 'အော်ဒါ ပို့ဆောင်ရန်အတွက်သာ သုံးပါသည် - အမည်၊ ဖုန်းနံပါတ်နှင့် လိပ်စာကို ပို့ဆောင်ရေးဌာနသို့သာ ပေးသည်။ အချက်အလက် မရောင်းချပါ၊ ကြော်ငြာ ခြေရာခံစနစ်လည်း မသုံးပါ။',
          },
        ],
      },
    ],
    stuck: {
      before: 'အဖြေ မတွေ့သေးဘူးလား။ ',
      link: 'စာပို့လိုက်ပါ',
      after: ' - အလုပ်ရက် နှစ်ရက်အတွင်း ပြန်ဖြေပါသည်။',
    },
  },
}

export const FAQ_META: Dict<{ title: string; description: string }> = {
  en: {
    title: 'FAQ',
    description: `Payment, delivery, stock, warranty and account questions, answered for ${SITE.name} customers.`,
  },
  my: {
    title: 'မေးလေ့ရှိသော မေးခွန်းများ',
    description: 'ငွေပေးချေမှု၊ ပို့ဆောင်ရေး၊ အာမခံနှင့် အကောင့်ဆိုင်ရာ မေးခွန်းများ။',
  },
}

export function FaqView({ locale }: { locale: Locale }) {
  const t = COPY[locale]

  return (
    <PageShell eyebrow={t.eyebrow} title={t.title} lead={t.lead} path={FAQ_PATH} locale={locale}>
      {t.groups.map((group) => (
        <section key={group.title} className="border-t border-line pt-8 first:border-0 first:pt-0">
          <h2 className="font-display text-[22px] leading-tight text-ink md:text-[26px] [.font-my_&]:font-sans [.font-my_&]:text-[19px] [.font-my_&]:leading-[1.6] md:[.font-my_&]:text-[22px]">
            {group.title}
          </h2>
          <dl className="mt-5 space-y-5">
            {group.items.map((item) => (
              <div key={item.q}>
                <dt className="text-[15px] font-medium text-ink [.font-my_&]:leading-[1.8]">
                  {item.q}
                </dt>
                <dd className="mt-1.5 text-[15px] leading-relaxed text-ink-soft [.font-my_&]:leading-[1.9]">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      <section className="border-t border-line pt-8">
        <p className="text-[15px] leading-relaxed text-ink-soft [.font-my_&]:leading-[1.9]">
          {t.stuck.before}
          <Link
            href={localePath(locale, '/contact')}
            className="text-ink underline underline-offset-4 hover:text-accent"
          >
            {t.stuck.link}
          </Link>
          {t.stuck.after}
        </p>
      </section>
    </PageShell>
  )
}
