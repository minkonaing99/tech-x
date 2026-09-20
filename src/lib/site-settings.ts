import 'server-only'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { siteSettings } from '@/db/schema/site-settings'

export async function getSetting(key: string): Promise<string | null> {
  const [row] = await db
    .select({ value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.key, key))
    .limit(1)
  return row?.value ?? null
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(siteSettings)
    .values({ key, value })
    .onDuplicateKeyUpdate({ set: { value } })
}

export async function deleteSetting(key: string): Promise<void> {
  await db.delete(siteSettings).where(eq(siteSettings.key, key))
}
