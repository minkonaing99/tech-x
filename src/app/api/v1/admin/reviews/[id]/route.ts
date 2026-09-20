import { NextResponse } from 'next/server'
import { fail, ok } from '@/lib/api-response'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { reviews } from '@/db/schema/reviews'
import { requireAdmin } from '@/lib/admin-guard'
import { UUID_RE } from '@/lib/ids'


const patchSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const denied = await requireAdmin()
  if (denied) return denied
  const { id } = await params
  if (!UUID_RE.test(id)) {
    return fail('VALIDATION_ERROR', 'Invalid id.', 400)
  }
  const raw = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return fail('VALIDATION_ERROR', 'Invalid status.', 400)
  }
  await db.update(reviews).set({ status: parsed.data.status }).where(eq(reviews.id, id))
  return ok({ ok: true })
}
