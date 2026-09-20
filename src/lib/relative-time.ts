const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Compact age label: 'just now', '12m ago', '3h ago', '4d ago', '2mo ago'. */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const diff = now - new Date(iso).getTime()
  if (!Number.isFinite(diff) || diff < 0) return 'just now'
  if (diff < MINUTE) return 'just now'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`
  if (diff < 60 * DAY) return `${Math.floor(diff / DAY)}d ago`
  return `${Math.floor(diff / (30 * DAY))}mo ago`
}

/**
 * Order times are pinned to the shop's clock. `toLocaleString()` follows the
 * host, so a server in UTC would have shown a Mandalay customer a time 6.5
 * hours off their own, on a date that could be the day before.
 */
const SHOP_TIME_ZONE = 'Asia/Yangon'

const ORDER_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: SHOP_TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const SHORT_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: SHOP_TIME_ZONE,
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const FULL_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: SHOP_TIME_ZONE,
  dateStyle: 'full',
  timeStyle: 'short',
})

/** Reading date for an order: `17 Aug 2026, 20:52`. No seconds. */
export function orderTimestamp(iso: string): string {
  return ORDER_FORMAT.format(new Date(iso))
}

/**
 * Yearless order date: `17 Aug, 20:52`. For narrow columns - the email progress
 * rail gives each step about 120px, which the year pushes onto a second line.
 */
export function shortTimestamp(iso: string): string {
  return SHORT_FORMAT.format(new Date(iso))
}

/** Full timestamp for the `title` tooltip behind a relative label. */
export function fullTimestamp(iso: string): string {
  return FULL_FORMAT.format(new Date(iso))
}
