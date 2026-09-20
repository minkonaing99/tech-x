/**
 * Telegram owner-alert helper.
 *
 * When TELEGRAM_BOT_TOKEN + TELEGRAM_OWNER_CHAT_ID are unset, this is a no-op.
 * Failures are swallowed so the caller's transactional success path is never blocked
 * by an external service outage.
 */

const API = 'https://api.telegram.org'

/**
 * Plain text unless a caller opts in to markup.
 *
 * ponytail: `html` is a boolean rather than an escaping helper because only one
 * caller wants markup. With HTML on by default, any interpolated value carrying
 * a `<` made Telegram reject the whole message - so an order alert was one
 * awkward payment-method name away from silently not arriving.
 */
export async function sendTelegram(text: string, opts: { html?: boolean } = {}): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_OWNER_CHAT_ID
  if (!token || !chatId) return

  try {
    await fetch(`${API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...(opts.html ? { parse_mode: 'HTML' } : {}),
        disable_web_page_preview: true,
      }),
    })
  } catch {
    // Owner alert is best-effort; do not surface to caller.
  }
}
