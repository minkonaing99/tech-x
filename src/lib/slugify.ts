/**
 * Normalize a product name into a URL-safe slug.
 * Lowercased, non-alnum collapsed to "-", no leading/trailing dashes.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/
