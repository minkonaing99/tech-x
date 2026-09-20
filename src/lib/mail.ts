import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { render } from '@react-email/render'
import type { ReactElement } from 'react'
import { maskEmail } from './mask'

const isProd = process.env.NODE_ENV === 'production'

interface MailTextParams {
  to: string
  subject: string
  text: string
  html?: string
}

interface MailReactParams {
  to: string
  subject: string
  react: ReactElement
  text?: string
}

type MailParams = MailTextParams | MailReactParams

let cached: Transporter | null = null

function buildTransport(): Transporter | null {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

function isReactParams(p: MailParams): p is MailReactParams {
  return 'react' in p
}

export async function sendMail(params: MailParams): Promise<{ delivered: boolean }> {
  if (!cached) cached = buildTransport()

  const html = isReactParams(params) ? await render(params.react) : params.html
  const text = isReactParams(params)
    ? params.text ?? (await render(params.react, { plainText: true }))
    : params.text

  if (!cached) {
    // Dev prints the whole message on purpose - it is how you get the
    // verification link without an SMTP account. In production that same branch
    // fires whenever SMTP credentials break or expire, and the body carries
    // single-use tokens: a verification link in the log is a live account
    // takeover for anyone who can read the log.
    if (isProd) {
      console.warn('[mail] SMTP not configured; message dropped.', {
        to: maskEmail(params.to),
        subject: params.subject,
      })
    } else {
      console.warn('[mail] SMTP not configured. Would send:', {
        to: params.to,
        subject: params.subject,
      })
      console.warn(text)
    }
    return { delivered: false }
  }

  const from = process.env.EMAIL_FROM ?? 'noreply@localhost'
  await cached.sendMail({ from, to: params.to, subject: params.subject, text, html })
  return { delivered: true }
}
