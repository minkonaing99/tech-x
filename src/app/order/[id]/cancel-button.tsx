'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'

export function CancelButton({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function cancel() {
    // No stock claim: the route only accepts `pending_payment`, and a pending
    // order never held inventory under the commit-at-payment model.
    if (!confirm('Cancel this order? This cannot be undone.')) return
    setPending(true)
    const res = await api(`/api/v1/orders/${orderId}/cancel`, { method: 'POST' })
    setPending(false)
    if (!res.ok) {
      toast(res.error?.message ?? 'Cancel failed.')
      return
    }
    toast('Order cancelled.')
    router.refresh()
  }

  return (
    <button
      onClick={cancel}
      disabled={pending}
      className="text-[13px] text-error underline underline-offset-4 disabled:opacity-50"
    >
      {pending ? 'Cancelling…' : 'Cancel order'}
    </button>
  )
}
