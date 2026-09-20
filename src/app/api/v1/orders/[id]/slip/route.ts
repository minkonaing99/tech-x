import { NextResponse } from 'next/server'
import { fail, ok, rateLimited } from '@/lib/api-response'
import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import sharp from 'sharp'
import { db } from '@/db'
import { orders } from '@/db/schema/orders'
import { paymentMethods } from '@/db/schema/payment-methods'
import { auth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin-guard'
import { UUID_RE } from '@/lib/ids'
import { sendMail } from '@/lib/mail'
import { sendTelegram } from '@/lib/telegram'
import { formatMmk } from '@/lib/money'
import { clientKey, rateLimit } from '@/lib/rate-limit'
import { deletePrivate, getPrivateBytes, putPrivate } from '@/lib/r2'
import { adminOrderUrl, orderUrl } from '@/lib/links'
import { shortOrderId } from '@/lib/order-status'
import { SlipSubmittedAlert } from '@emails/slip-submitted-alert'
import { SlipReceived } from '@emails/slip-received'

function slipBasename(stored: string | null | undefined): string | null {
  if (!stored) return null
  const trimmed = stored.split('/').pop() ?? ''
  return /^[0-9a-f-]{36}\.webp$/i.test(trimmed) ? trimmed : null
}

function slipKey(orderId: string, basename: string): string {
  return `slips/${orderId}/${basename}`
}

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES = 8 * 1024 * 1024

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) return fail('UNAUTHENTICATED', 'Sign in required.', 401)
  const userId = session.user.id

  const { id } = await params
  if (!UUID_RE.test(id)) return fail('VALIDATION_ERROR', 'Invalid id.', 400)

  const limit = rateLimit({
    key: clientKey(req, `slip:${userId}`),
    limit: 10,
    windowMs: 60 * 60 * 1000,
  })
  if (!limit.allowed) {
    return rateLimited('Too many uploads.', limit.retryAfterSeconds)
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, id), eq(orders.userId, userId)))
    .limit(1)
  if (!order) return fail('NOT_FOUND', 'Order not found.', 404)
  if (order.status !== 'pending_payment' && order.status !== 'payment_submitted') {
    return fail('CONFLICT', 'Order no longer accepts slip uploads.', 409)
  }

  const [method] = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.id, order.paymentMethodId))
    .limit(1)
  if (method?.kind === 'cod') {
    return fail('CONFLICT', 'Cash on Delivery orders do not need a slip.', 409)
  }

  const form = await req.formData().catch(() => null)
  if (!form) return fail('VALIDATION_ERROR', 'Invalid form data.', 400)
  const file = form.get('slip')
  const txRef = form.get('txRef')

  if (!(file instanceof File)) return fail('VALIDATION_ERROR', 'Missing slip file.', 400)
  if (file.size > MAX_BYTES) return fail('VALIDATION_ERROR', 'File over 8 MB.', 413)
  if (!ALLOWED_MIME.has(file.type)) {
    return fail('VALIDATION_ERROR', 'Use JPG, PNG, or WEBP.', 415)
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let processed: Buffer
  try {
    processed = await sharp(buffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()
  } catch {
    return fail('VALIDATION_ERROR', 'Could not read image.', 400)
  }

  const fileName = `${randomUUID()}.webp`
  const newKey = slipKey(id, fileName)

  try {
    await putPrivate(newKey, processed, 'image/webp')
  } catch {
    return fail('UPSTREAM_ERROR', 'Could not store slip.', 502)
  }

  const priorBasename = slipBasename(order.paymentProofUrl)
  if (priorBasename && priorBasename !== fileName) {
    await deletePrivate(slipKey(id, priorBasename))
  }

  await db
    .update(orders)
    .set({
      status: 'payment_submitted',
      paymentProofUrl: fileName,
      paymentTxRef: typeof txRef === 'string' && txRef ? txRef.slice(0, 120) : null,
    })
    .where(eq(orders.id, id))

  // The money has already left the customer's account and the page state is
  // gone the moment they close the tab. This is the receipt for that wait.
  if (session.user.email) {
    await sendMail({
      to: session.user.email,
      subject: `Order ${shortOrderId(id)} - slip received`,
      react: SlipReceived({
        orderId: id,
        orderUrl: orderUrl(id),
        total: formatMmk(Number(order.totalMmk)),
        method: method?.name ?? order.paymentMethodId,
        placedAt: order.placedAt.toISOString(),
        submittedAt: new Date().toISOString(),
      }),
    }).catch(() => {})
  }

  const ownerEmail = process.env.EMAIL_FROM?.match(/<(.+)>/)?.[1] ?? 'admin@localhost'
  await sendMail({
    to: ownerEmail,
    subject: `Slip submitted ${shortOrderId(id)} - verify ${formatMmk(Number(order.totalMmk))}`,
    react: SlipSubmittedAlert({
      orderId: id,
      adminUrl: adminOrderUrl(id),
      total: formatMmk(Number(order.totalMmk)),
      method: method?.name ?? order.paymentMethodId,
      recipient: order.shipRecipient ?? 'Not given',
      phone: order.shipPhone,
      txRef: typeof txRef === 'string' && txRef ? txRef.slice(0, 120) : null,
    }),
  }).catch(() => {})

  await sendTelegram(
    `💳 Slip submitted for ${id.slice(0, 8)}\nMethod: ${method?.name ?? order.paymentMethodId}\nTotal: ${formatMmk(Number(order.totalMmk))}`,
  )

  return ok({ ok: true })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) return fail('UNAUTHENTICATED', 'Sign in required.', 401)

  const { id } = await params
  if (!UUID_RE.test(id)) return fail('VALIDATION_ERROR', 'Invalid id.', 400)

  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1)
  if (!order) return fail('NOT_FOUND', 'Order not found.', 404)

  // Reading someone else's payment slip is an admin act, so the role comes from
  // the database rather than the 30-day token. The owner path never pays for the
  // lookup.
  const isOwner = order.userId === session.user.id
  if (!isOwner && !(await isAdmin())) return fail('FORBIDDEN', 'Not your order.', 403)

  const basename = slipBasename(order.paymentProofUrl)
  if (!basename) return fail('NOT_FOUND', 'No slip on this order.', 404)

  const bytes = await getPrivateBytes(slipKey(id, basename))
  if (!bytes) return fail('NOT_FOUND', 'Slip file missing.', 404)

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': 'image/webp',
      'Content-Length': String(bytes.byteLength),
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `inline; filename="${basename}"`,
    },
  })
}
