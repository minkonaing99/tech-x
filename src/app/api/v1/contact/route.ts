import { NextResponse } from 'next/server'
import { fail, ok, rateLimited } from '@/lib/api-response'
import { z } from 'zod'
import { clientKey, rateLimit } from '@/lib/rate-limit'
import { sendMail } from '@/lib/mail'
import { contactInbox } from '@/lib/site-info'

const TOPICS = ['order', 'product', 'returns', 'press', 'other'] as const

const bodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().email().max(254).toLowerCase(),
  topic: z.enum(TOPICS),
  // Interpolated into the mail Subject. Nodemailer encodes headers, so a
  // newline is not injectable through it - but an order reference has no reason
  // to contain anything but the characters a UUID uses, and refusing the rest
  // means the guarantee does not depend on a library's escaping.
  orderId: z
    .string()
    .trim()
    .max(64)
    .regex(/^[A-Za-z0-9-]*$/)
    .optional(),
  message: z.string().trim().min(10).max(4000),
  // Honeypot - the field is hidden, so any content means a bot. `max(0)` makes
  // a filled one fail validation like any other bad input (400).
  website: z.string().max(0).optional(),
})

export async function POST(req: Request): Promise<NextResponse> {
  const limit = rateLimit({ key: clientKey(req, 'contact'), limit: 5, windowMs: 60 * 60 * 1000 })
  if (!limit.allowed) {
    return rateLimited('Too many messages. Try again later.', limit.retryAfterSeconds)
  }

  const raw = await req.json().catch(() => null)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return fail('VALIDATION_ERROR', 'Check the form and try again.', 400)
  }

  const { name, email, topic, orderId, message } = parsed.data

  const inbox = contactInbox()
  if (!inbox) {
    return fail('NOT_CONFIGURED', 'Email is down right now. Please reach us on Telegram.', 503)
  }

  const lines = [
    `Topic: ${topic}`,
    orderId ? `Order: ${orderId}` : null,
    `From: ${name} <${email}>`,
    '',
    message,
  ].filter(Boolean)

  const { delivered } = await sendMail({
    to: inbox,
    subject: `Contact form - ${topic}${orderId ? ` - ${orderId}` : ''}`,
    text: lines.join('\n'),
  })

  if (!delivered) {
    return fail('SEND_FAILED', 'Message could not be sent. Please reach us on Telegram.', 502)
  }

  return ok({ ok: true })
}
