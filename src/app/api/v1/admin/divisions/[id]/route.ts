import { NextResponse } from 'next/server'
import { fail, ok } from '@/lib/api-response'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { divisions } from '@/db/schema/divisions'
import { requireAdmin } from '@/lib/admin-guard'

const ID_RE = /^[a-z_]+$/i

const patchSchema = z
  .object({
    deliveryFeeMmk: z.number().int().min(0).max(1_000_000),
    codAllowed: z.boolean(),
    isBlocked: z.boolean(),
    sortOrder: z.number().int().min(0).max(999),
  })
  .partial()

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await params
  if (!ID_RE.test(id)) {
    return fail('VALIDATION_ERROR', 'Invalid id.', 400)
  }
  const raw = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return fail('VALIDATION_ERROR', 'Invalid body.', 400)
  }
  await db.update(divisions).set(parsed.data).where(eq(divisions.id, id))
  return ok({ ok: true })
}
