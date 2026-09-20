import { NextResponse } from 'next/server'
import { fail, ok } from '@/lib/api-response'
import { z } from 'zod'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { addresses } from '@/db/schema/addresses'
import { orders } from '@/db/schema/orders'
import { auth } from '@/lib/auth'
import { UUID_RE } from '@/lib/ids'
import { ADDRESS_LOCK_STATUSES, ADDRESS_LOCKED_MESSAGE } from '@/lib/address-lock'
import { optionalMapsUrl, optionalTelegram, phoneField } from '@/lib/address-fields'



const patchSchema = z
  .object({
    label: z.string().min(1).max(40),
    recipient: z.string().min(1).max(120),
    phone: phoneField,
    divisionId: z.string().min(1).max(40),
    city: z.string().min(1).max(120),
    township: z.string().min(1).max(120),
    street: z.string().min(1).max(200),
    landmark: z.string().max(200).nullable(),
    isDefault: z.boolean(),
  })
  .partial()
  // Kept outside `.partial()`: these two carry a transform, and making them
  // partial as well would let `undefined` through as "clear the field".
  .and(z.object({ telegramUsername: optionalTelegram, mapsUrl: optionalMapsUrl }).partial())

async function requireSession() {
  const session = await auth()
  return session?.user?.id ?? null
}

/**
 * True when a confirmed order is relying on this address right now.
 *
 * Scoped to the caller's own orders, so the answer never reveals anything
 * about an address id belonging to somebody else.
 */
async function isLocked(addressId: string, userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      and(
        eq(orders.shippingAddressId, addressId),
        eq(orders.userId, userId),
        inArray(orders.status, [...ADDRESS_LOCK_STATUSES]),
      ),
    )
    .limit(1)
  return Boolean(row)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const userId = await requireSession()
  if (!userId) {
    return fail('UNAUTHENTICATED', 'Sign in required.', 401)
  }
  const { id } = await params
  if (!UUID_RE.test(id)) {
    return fail('VALIDATION_ERROR', 'Invalid id.', 400)
  }
  const raw = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return fail('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid body.', 400)
  }
  if (await isLocked(id, userId)) {
    return fail('CONFLICT', ADDRESS_LOCKED_MESSAGE, 409)
  }
  await db
    .update(addresses)
    .set(parsed.data)
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
  return ok({ ok: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const userId = await requireSession()
  if (!userId) {
    return fail('UNAUTHENTICATED', 'Sign in required.', 401)
  }
  const { id } = await params
  if (!UUID_RE.test(id)) {
    return fail('VALIDATION_ERROR', 'Invalid id.', 400)
  }
  if (await isLocked(id, userId)) {
    return fail('CONFLICT', ADDRESS_LOCKED_MESSAGE, 409)
  }
  await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
  return ok({ ok: true })
}
