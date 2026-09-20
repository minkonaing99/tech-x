import { asc } from 'drizzle-orm'
import { db } from '@/db'
import { paymentMethods } from '@/db/schema/payment-methods'
import { r2PublicUrl } from '@/lib/cdn'
import { PaymentMethodTable } from './payment-method-table'

export default async function AdminPaymentMethodsPage() {
  const rows = await db.select().from(paymentMethods).orderBy(asc(paymentMethods.sortOrder))

  return (
    <div>
      <h2 className="font-display text-[28px]">Payment methods</h2>
      <p className="mt-2 text-[14px] text-muted">
        Configure wallet account info + QR. Active wallets show on checkout when complete.
      </p>
      <PaymentMethodTable
        initial={rows.map((r) => ({
          id: r.id,
          name: r.name,
          kind: r.kind,
          accountName: r.accountName,
          accountPhone: r.accountPhone,
          qrImageUrl: r2PublicUrl(r.qrImageUrl),
          instructionsMd: r.instructionsMd,
          sortOrder: r.sortOrder,
          isActive: r.isActive,
        }))}
      />
    </div>
  )
}
