// Public CDN URL builder. Safe to import from client OR server - relies only
// on NEXT_PUBLIC_CDN_URL. Pass it any R2 key or legacy disk path; it returns
// a fully-qualified public URL, an already-absolute URL untouched, or null
// when the input is null/empty.

const CDN_BASE = (process.env.NEXT_PUBLIC_CDN_URL ?? '').replace(/\/$/, '')

export function r2PublicUrl(keyOrLegacy: string | null | undefined): string | null {
  if (!keyOrLegacy) return null
  if (keyOrLegacy.startsWith('http://') || keyOrLegacy.startsWith('https://')) {
    return keyOrLegacy
  }
  const key = keyOrLegacy.replace(/^\//, '')
  if (!CDN_BASE) return `/${key}`
  return `${CDN_BASE}/${key}`
}
