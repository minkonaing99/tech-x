'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import type { OrderStatus } from '@/db/schema/orders'
import type { MethodKind } from '@/db/schema/payment-methods'

// Both unions used to be restated here by hand. Type-only imports, so no part
// of the schema module reaches the client bundle.
type Status = OrderStatus

interface Props {
  orderId: string
  status: Status
  methodKind: MethodKind
  hasSlip: boolean
}

interface Action {
  label: string
  target: Status
  variant: 'primary' | 'secondary' | 'danger'
  disabled?: boolean
  hint?: string
}

function actionsFor(status: Status, methodKind: MethodKind, hasSlip: boolean): Action[] {
  const isWallet = methodKind === 'wallet'
  const out: Action[] = []

  if (status === 'pending_payment') {
    if (isWallet) {
      out.push({
        label: 'Mark slip submitted',
        target: 'payment_submitted',
        variant: 'secondary',
        hint: 'Use only if the customer transferred but did not upload through the app.',
      })
    } else {
      out.push({
        label: 'Confirm order (phone-verified)',
        target: 'confirmed',
        variant: 'primary',
        hint: 'COD: phone-confirm the buyer before marking confirmed. Decrements stock.',
      })
    }
  }

  if (status === 'payment_submitted') {
    out.push({
      label: 'Confirm payment',
      target: 'confirmed',
      variant: 'primary',
      disabled: !hasSlip,
      hint: hasSlip
        ? 'Cross-check the slip above against your bank app. Confirming decrements stock and emails the customer an invoice.'
        : 'No slip uploaded yet.',
    })
    out.push({
      label: 'Reject slip (back to pending)',
      target: 'pending_payment',
      variant: 'secondary',
      hint: 'Use when the uploaded slip is wrong / amount mismatched / unreadable.',
    })
  }

  if (status === 'confirmed') {
    out.push({
      label: 'Mark delivered',
      target: 'delivered',
      variant: 'primary',
    })
  }

  if (status !== 'delivered' && status !== 'cancelled') {
    out.push({ label: 'Cancel order', target: 'cancelled', variant: 'danger' })
  }

  return out
}

export function AdminOrderActions({ orderId, status, methodKind, hasSlip }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState<Status | null>(null)
  // Cancelling is terminal and emails the customer - require a second click.
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const actions = actionsFor(status, methodKind, hasSlip)

  async function go(target: Status) {
    if (target === 'cancelled' && !confirmingCancel) {
      setConfirmingCancel(true)
      return
    }
    setConfirmingCancel(false)
    setPending(target)
    const res = await api(`/api/v1/admin/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: target }),
    })
    setPending(null)
    if (res.ok) {
      toast(`Status → ${target.replace('_', ' ')}`)
      router.refresh()
      return
    }
    // Every refusal this route makes carries its own sentence, including the
    // out-of-stock one - it names the product in `message` and repeats the id
    // in `details`. Nothing left to reconstruct here.
    toast(res.error?.message ?? `Action failed (${res.status}).`)
  }

  if (actions.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-line bg-surface p-5 text-[13px] text-muted">
        Order is in a terminal state - no further actions.
      </div>
    )
  }

  return (
    <div className="rounded-[var(--radius)] border border-line bg-surface p-5">
      <h3 className="font-display text-[15px]">Actions</h3>
      <div className="mt-4 flex flex-wrap gap-3">
        {actions.map((a) => {
          const busy = pending === a.target
          const armed = a.target === 'cancelled' && confirmingCancel
          const styleByVariant =
            a.variant === 'primary'
              ? 'bg-ink text-cream hover:bg-accent'
              : a.variant === 'danger'
                ? 'border border-error/40 text-error hover:bg-error/5'
                : 'border border-line text-ink hover:border-ink/40'
          return (
            <button
              key={a.target}
              type="button"
              onClick={() => go(a.target)}
              onBlur={() => a.target === 'cancelled' && setConfirmingCancel(false)}
              disabled={busy || a.disabled}
              className={`inline-flex items-center justify-center rounded-[var(--radius-pill)] px-5 py-2.5 text-[13px] font-medium transition-colors disabled:opacity-50 ${
                armed ? 'border border-error bg-error text-cream' : styleByVariant
              }`}
            >
              {busy ? 'Saving…' : armed ? 'Click again to cancel order' : a.label}
            </button>
          )
        })}
      </div>
      {actions
        .filter((a) => a.hint)
        .map((a) => (
          <p key={a.target} className="mt-3 text-[12px] text-muted">
            <span className="font-medium text-ink">{a.label}:</span> {a.hint}
          </p>
        ))}
    </div>
  )
}
