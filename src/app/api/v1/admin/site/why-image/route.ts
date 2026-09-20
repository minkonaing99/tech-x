import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { fail, ok, rateLimited } from '@/lib/api-response'
import sharp from 'sharp'
import { requireAdmin } from '@/lib/admin-guard'
import { clientKey, rateLimit } from '@/lib/rate-limit'
import { r2PublicUrl } from '@/lib/cdn'
import { deletePublic, putPublic } from '@/lib/r2'
import { getSetting, setSetting, deleteSetting } from '@/lib/site-settings'
import { revalidateTag } from 'next/cache'

const SETTING_KEY = 'why_image'
const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

/**
 * Content-addressed key. `putPublic` serves public objects
 * `max-age=31536000, immutable`, so a replacement written to a fixed key would
 * sit behind the year-old cached copy at the CDN edge and in every browser that
 * had already loaded it. Naming the object after its own bytes makes that
 * promise true: different image, different URL, nothing to purge.
 */
function keyFor(webp: Buffer): string {
  return `site/why-${createHash('sha256').update(webp).digest('hex').slice(0, 16)}.webp`
}

export async function POST(req: Request): Promise<NextResponse> {
  const denied = await requireAdmin()
  if (denied) return denied

  const limit = rateLimit({ key: clientKey(req, 'admin:why-image'), limit: 20, windowMs: 60 * 60 * 1000 })
  if (!limit.allowed) {
    return rateLimited('Too many uploads.', limit.retryAfterSeconds)
  }

  const form = await req.formData().catch(() => null)
  if (!form) return fail('VALIDATION_ERROR', 'Invalid form data.', 400)
  const file = form.get('image')
  if (!(file instanceof File)) return fail('VALIDATION_ERROR', 'Missing image file.', 400)
  if (file.size > MAX_BYTES) return fail('VALIDATION_ERROR', 'File over 10 MB.', 413)
  if (!ALLOWED_MIME.has(file.type)) return fail('VALIDATION_ERROR', 'Use JPG, PNG, or WEBP.', 415)

  const buffer = Buffer.from(await file.arrayBuffer())
  let processed: Buffer
  try {
    processed = await sharp(buffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 88, alphaQuality: 100 })
      .toBuffer()
  } catch {
    return fail('VALIDATION_ERROR', 'Could not read image.', 400)
  }

  const key = keyFor(processed)
  try {
    await putPublic(key, processed, 'image/webp')
  } catch {
    return fail('UPSTREAM_ERROR', 'Could not store image.', 502)
  }

  // Point at the new object before dropping the old one, so a failure here
  // leaves an orphan rather than a setting aimed at a deleted key.
  const previous = await getSetting(SETTING_KEY)
  await setSetting(SETTING_KEY, key)
  if (previous && previous !== key) await deletePublic(previous)
  revalidateTag('site-settings')

  return ok({ url: r2PublicUrl(key) })
}

export async function GET(): Promise<NextResponse> {
  const denied = await requireAdmin()
  if (denied) return denied

  const key = await getSetting(SETTING_KEY)
  return ok({ url: key ? r2PublicUrl(key) : null })
}

export async function DELETE(): Promise<NextResponse> {
  const denied = await requireAdmin()
  if (denied) return denied

  // Whatever the setting points at, including a legacy fixed `site/why.webp`.
  const key = await getSetting(SETTING_KEY)
  if (key) await deletePublic(key)
  await deleteSetting(SETTING_KEY)
  revalidateTag('site-settings')

  return ok({ ok: true })
}
