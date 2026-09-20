import { NextResponse } from 'next/server'
import { fail, ok } from '@/lib/api-response'
import { z } from 'zod'
import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { addresses } from '@/db/schema/addresses'
import { auth } from '@/lib/auth'
import { optionalMapsUrl, optionalTelegram, phoneField } from '@/lib/address-fields'


const addressSchema = z.object({
  label: z.string().min(1).max(40),
  recipient: z.string().min(1).max(120),
  phone: phoneField,
  divisionId: z.string().min(1).max(40),
  city: z.string().min(1).max(120),
  township: z.string().min(1).max(120),
  street: z.string().min(1).max(200),
  landmark: z.string().max(200).optional().nullable(),
  telegramUsername: optionalTelegram,
  mapsUrl: optionalMapsUrl,
  isDefault: z.boolean().optional().default(false),
})

export async function GET(): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return fail('UNAUTHENTICATED', 'Sign in required.', 401)
  }
  const rows = await db.select().from(addresses).where(eq(addresses.userId, session.user.id))
  return ok(rows)
}

export async function POST(req: Request): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return fail('UNAUTHENTICATED', 'Sign in required.', 401)
  }

  const raw = await req.json().catch(() => null)
  const parsed = addressSchema.safeParse(raw)
  if (!parsed.success) {
    return fail('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid body.', 400)
  }

  const id = randomUUID()
  await db.insert(addresses).values({
    id,
    userId: session.user.id,
    label: parsed.data.label,
    recipient: parsed.data.recipient,
    phone: parsed.data.phone,
    divisionId: parsed.data.divisionId,
    city: parsed.data.city,
    township: parsed.data.township,
    street: parsed.data.street,
    landmark: parsed.data.landmark ?? null,
    telegramUsername: parsed.data.telegramUsername,
    mapsUrl: parsed.data.mapsUrl,
    isDefault: parsed.data.isDefault,
  })
  return ok({ id })
}
