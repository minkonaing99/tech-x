import { sendTelegram } from '@/lib/telegram'

/** Same fault repeating gets one alert per window, not one per request. */
const THROTTLE_MS = 10 * 60 * 1000
const MAX_TRACKED = 200
const seen = new Map<string, number>()

/** Telegram messages are HTML - escape anything interpolated into them. */
function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Distinct faults are (message + first stack frame), not every request. */
function fingerprint(error: Error): string {
  const frame = error.stack?.split('\n')[1]?.trim() ?? ''
  return `${error.name}:${error.message}:${frame}`
}

function shouldSend(key: string, now: number): boolean {
  const last = seen.get(key)
  if (last !== undefined && now - last < THROTTLE_MS) return false

  // Bounded map - drop the oldest entry rather than grow forever.
  if (seen.size >= MAX_TRACKED) {
    const oldest = [...seen.entries()].sort((a, b) => a[1] - b[1])[0]
    if (oldest) seen.delete(oldest[0])
  }
  seen.set(key, now)
  return true
}

export interface ErrorContext {
  path?: string
  method?: string
  /** Next's request id, also printed on the customer's error page. */
  digest?: string
}

/**
 * Push a server fault to the owner's Telegram. Best-effort by design: this
 * runs inside an error handler, so it must never throw or block.
 */
export async function reportError(error: unknown, context: ErrorContext = {}): Promise<void> {
  try {
    const err = error instanceof Error ? error : new Error(String(error))
    if (!shouldSend(fingerprint(err), Date.now())) return

    const where = [context.method, context.path].filter(Boolean).join(' ')
    const lines = [
      '<b>Site error</b>',
      where ? escapeHtml(where) : null,
      escapeHtml(`${err.name}: ${err.message}`),
      context.digest ? `digest ${escapeHtml(context.digest)}` : null,
      err.stack ? `<pre>${escapeHtml(err.stack.split('\n').slice(1, 4).join('\n'))}</pre>` : null,
    ].filter(Boolean)

    // The only caller that wants markup; every value above is escaped.
    await sendTelegram(lines.join('\n'), { html: true })
  } catch {
    // Reporting must never become the failure it is reporting on.
  }
}

/** Test seam - the throttle map is module state. */
export function resetErrorThrottle(): void {
  seen.clear()
}
