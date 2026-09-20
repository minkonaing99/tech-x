import Link from 'next/link'
import Image from 'next/image'
import { CATEGORIES } from '@/lib/categories'

const STATIC_COLUMNS = [
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Support',
    links: [
      { href: '/shipping', label: 'Shipping' },
      { href: '/returns', label: 'Returns' },
      { href: '/returns#warranty', label: 'Warranty' },
      { href: '/faq', label: 'FAQ' },
    ],
  },
] as const

const COLUMNS = [
  {
    title: 'Shop',
    links: CATEGORIES.map((c) => ({ href: `/shop/${c.id}`, label: c.name })),
  },
  ...STATIC_COLUMNS,
]

export function Footer() {
  return (
    <footer className="mt-24 bg-[var(--color-dark-bg)] text-[var(--color-dark-ink)]">
      <div className="container-prose grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Link href="/" className="flex items-center gap-3" aria-label="Tech X home">
            <Image src="/brand/wordmark-reverse.png" alt="Tech X" width={160} height={48} className="h-auto w-40" />
          </Link>
          <p className="mt-4 max-w-[28ch] text-[14px] leading-relaxed text-cream/60">
            Technology, made clear. Gear for work, play and everything in between.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <div className="text-[11px] tracking-[0.14em] uppercase text-cream/50">{col.title}</div>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-[14px] text-cream/85 transition-colors hover:text-[var(--color-accent-soft)]"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-cream/10">
        <div className="container-prose flex flex-col items-start justify-between gap-3 py-6 text-[12px] text-cream/55 md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} Tech X - Technology, made clear.</p>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="transition-colors hover:text-[var(--color-accent-soft)]"
            >
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
