import type { ReactNode } from 'react'
import { LangSwitch } from './lang-switch'
import { cn } from '@/lib/utils'
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n'

interface PageShellProps {
  eyebrow: string
  title: string
  lead?: string
  /** Printed under the lead, e.g. 'Last updated 16 August 2026'. */
  meta?: string
  /** Path without a locale prefix, e.g. '/faq'. Drives the language switch. */
  path: string
  locale: Locale
  /** False for pages that exist in English only - hides the language switch. */
  translated?: boolean
  children: ReactNode
}

export function PageShell({
  eyebrow,
  title,
  lead,
  meta,
  path,
  locale,
  translated = true,
  children,
}: PageShellProps) {
  const my = locale !== DEFAULT_LOCALE
  return (
    <section
      lang={locale}
      className={cn('container-prose py-16 md:py-20', my && 'font-my')}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="eyebrow">{eyebrow}</div>
        {translated && <LangSwitch path={path} active={locale} />}
      </div>

      <h1
        className={cn(
          'mt-3 max-w-[22ch] text-balance text-ink',
          my
            ? 'text-[30px] leading-[1.35] md:text-[40px]'
            : 'font-display text-[40px] leading-[1.05] tracking-[-0.015em] md:text-[56px]',
        )}
      >
        {title}
      </h1>
      {lead && (
        <p className={cn('mt-5 max-w-[56ch] text-[16px] text-ink-soft', my ? 'leading-[1.9]' : 'leading-relaxed')}>
          {lead}
        </p>
      )}
      {meta && <p className="mt-4 text-[12px] text-muted">{meta}</p>}

      <div className="mt-12 max-w-[66ch] space-y-10 md:mt-14">{children}</div>
    </section>
  )
}

interface SectionProps {
  title: string
  /** Anchor target, so footer links can deep-link into a page. */
  id?: string
  children: ReactNode
}

export function Section({ title, id, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line pt-8 first:border-0 first:pt-0">
      <h2 className="font-display text-[22px] leading-tight text-ink md:text-[26px] [.font-my_&]:font-sans [.font-my_&]:text-[19px] [.font-my_&]:leading-[1.6] md:[.font-my_&]:text-[22px]">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-soft [.font-my_&]:leading-[1.9]">
        {children}
      </div>
    </section>
  )
}

/** Bulleted list with the same rhythm as body copy. */
export function List({ items }: { items: readonly string[] }) {
  return (
    <ul className="space-y-2 text-[15px] leading-relaxed text-ink-soft [.font-my_&]:leading-[1.9]">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span aria-hidden className="mt-[9px] size-[5px] shrink-0 rounded-full bg-muted" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
