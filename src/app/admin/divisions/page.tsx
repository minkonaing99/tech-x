import { asc } from 'drizzle-orm'
import { db } from '@/db'
import { divisions } from '@/db/schema/divisions'
import { DivisionTable } from './division-table'

export default async function AdminDivisionsPage() {
  const rows = await db.select().from(divisions).orderBy(asc(divisions.sortOrder))

  return (
    <div>
      <h2 className="font-display text-[28px]">Divisions</h2>
      <p className="mt-2 text-[14px] text-muted">
        Per-division shipping fees + COD eligibility + block toggle.
      </p>
      <DivisionTable
        initial={rows.map((r) => ({
          id: r.id,
          name: r.name,
          deliveryFeeMmk: r.deliveryFeeMmk,
          codAllowed: r.codAllowed,
          isBlocked: r.isBlocked,
          sortOrder: r.sortOrder,
        }))}
      />
    </div>
  )
}
