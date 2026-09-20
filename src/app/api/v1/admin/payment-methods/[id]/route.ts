import { NextResponse } from 'next/server'
import { fail, ok } from '@/lib/api-response'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { paymentMethods } from '@/db/schema/payment-methods'
import { requireAdmin } from '@/lib/admin-guard'

const ID_RE = /^[a-z0-9_]+$/i

const patchSchema = z
  .object({
    name: z.string().min(1).max(60),
    accountName: z.string().max(120).nullable(),
    accountPhone: z.string().max(20).nullable(),
    qrImageUrl: z.string().max(255).nullable(),
    instructionsMd: z.string().max(4000).nullable(),
    sortOrder: z.number().int().min(0).max(999),
    isActive: z.boolean(),
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
  await db.update(paymentMethods).set(parsed.data).where(eq(paymentMethods.id, id))
  return ok({ ok: true })
}
