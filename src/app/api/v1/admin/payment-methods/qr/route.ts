import { NextResponse } from 'next/server'
import { fail, ok } from '@/lib/api-response'
import sharp from 'sharp'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { paymentMethods } from '@/db/schema/payment-methods'
import { requireAdmin } from '@/lib/admin-guard'
import { r2PublicUrl } from '@/lib/cdn'
import { deletePublic, putPublic } from '@/lib/r2'

const ID_RE = /^[a-z0-9_]+$/i
const MAX_BYTES = 4 * 1024 * 1024
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

function qrKey(methodId: string): string {
  return `payment-qr/${methodId}.webp`
}

export async function POST(req: Request): Promise<NextResponse> {
  const denied = await requireAdmin()
  if (denied) return denied

  const form = await req.formData().catch(() => null)
  if (!form) return fail('VALIDATION_ERROR', 'Invalid form data.', 400)

  const methodId = form.get('methodId')
  const file = form.get('qr')
  if (typeof methodId !== 'string' || !ID_RE.test(methodId)) {
    return fail('VALIDATION_ERROR', 'Invalid method id.', 400)
  }
  if (!(file instanceof File)) return fail('VALIDATION_ERROR', 'Missing QR file.', 400)
  if (file.size > MAX_BYTES) return fail('VALIDATION_ERROR', 'File over 4 MB.', 413)
  if (!ALLOWED_MIME.has(file.type)) {
    return fail('VALIDATION_ERROR', 'Use JPG, PNG, or WEBP.', 415)
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  let processed: Buffer
  try {
    processed = await sharp(buffer)
      .rotate()
      .resize({ width: 600, height: 600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 92 })
      .toBuffer()
  } catch {
    return fail('VALIDATION_ERROR', 'Could not read image.', 400)
  }

  const key = qrKey(methodId)

  // Replace any legacy disk-path value with the new R2 key. Old paths like
  // /payment-qr/<id>.webp become payment-qr/<id>.webp by stripping the prefix.
  try {
    await putPublic(key, processed, 'image/webp')
  } catch {
    return fail('UPSTREAM_ERROR', 'Could not store QR.', 502)
  }

  await db.update(paymentMethods).set({ qrImageUrl: key }).where(eq(paymentMethods.id, methodId))

  return ok({ qrImageUrl: r2PublicUrl(key) })
}

export async function DELETE(req: Request): Promise<NextResponse> {
  const denied = await requireAdmin()
  if (denied) return denied

  const url = new URL(req.url)
  const methodId = url.searchParams.get('methodId') ?? ''
  if (!ID_RE.test(methodId)) {
    return fail('VALIDATION_ERROR', 'Invalid method id.', 400)
  }

  await deletePublic(qrKey(methodId))
  await db.update(paymentMethods).set({ qrImageUrl: null }).where(eq(paymentMethods.id, methodId))

  return ok({ ok: true })
}
