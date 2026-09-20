/**
 * Two-locale setup for the static content pages only (about, contact, support,
 * legal). The shop, cart and checkout stay English.
 *
 * English lives at `/faq`, Burmese at `/my/faq`.
 */
export const LOCALES = ['en', 'my'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

/** Copy keyed by locale. Every page dictionary uses this shape. */
export type Dict<T> = Readonly<Record<Locale, T>>

export const LOCALE_LABEL: Dict<string> = {
  en: 'English',
  my: 'မြန်မာ',
}

/** `/faq` -> `/my/faq`. Path must start with a slash and carry no prefix. */
export function localePath(locale: Locale, path: string): string {
  return locale === DEFAULT_LOCALE ? path : `/${locale}${path}`
}

/** Both URLs for a page, for `alternates.languages`. */
export function languageAlternates(path: string): Record<string, string> {
  return { en: path, my: localePath('my', path) }
}
