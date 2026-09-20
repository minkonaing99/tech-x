import Link from 'next/link'
import { cn } from '@/lib/utils'
import { LOCALES, LOCALE_LABEL, localePath, type Locale } from '@/lib/i18n'

interface LangSwitchProps {
  /** Page path without a locale prefix, e.g. '/faq'. */
  path: string
  active: Locale
}

export function LangSwitch({ path, active }: LangSwitchProps) {
  return (
    <nav aria-label="Language" className="flex items-center gap-1">
      {LOCALES.map((locale) => {
        const current = locale === active
        return (
          <Link
            key={locale}
            href={localePath(locale, path)}
            hrefLang={locale}
            aria-current={current ? 'true' : undefined}
            className={cn(
              'rounded-[var(--radius-pill)] px-3 py-1.5 text-[12px] transition-colors',
              current
                ? 'bg-ink text-cream'
                : 'text-muted ring-1 ring-line hover:text-ink hover:ring-ink/20',
              locale === 'my' && 'font-my',
            )}
          >
            {LOCALE_LABEL[locale]}
          </Link>
        )
      })}
    </nav>
  )
}
