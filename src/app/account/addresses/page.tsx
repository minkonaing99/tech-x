import { asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { addresses } from '@/db/schema/addresses'
import { divisions } from '@/db/schema/divisions'
import { auth } from '@/lib/auth'
import { AddressManager } from './address-manager'

export default async function AddressesPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const [rows, divRows] = await Promise.all([
    db.select().from(addresses).where(eq(addresses.userId, session.user.id)),
    db
      .select()
      .from(divisions)
      .where(eq(divisions.isBlocked, false))
      .orderBy(asc(divisions.sortOrder)),
  ])

  return (
    <div>
      <h2 className="font-display text-[28px]">Addresses</h2>
      <p className="mt-2 text-[14px] text-muted">
        Saved shipping addresses. Used at checkout.
      </p>
      <AddressManager
        initial={rows.map((r) => ({
          id: r.id,
          label: r.label,
          recipient: r.recipient,
          phone: r.phone,
          divisionId: r.divisionId,
          city: r.city,
          township: r.township,
          street: r.street,
          landmark: r.landmark ?? '',
          telegramUsername: r.telegramUsername ?? '',
          mapsUrl: r.mapsUrl ?? '',
          isDefault: r.isDefault,
        }))}
        divisions={divRows.map((d) => ({ id: d.id, name: d.name }))}
      />
    </div>
  )
}
