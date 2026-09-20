'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Pencil, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'
import { isGoogleMapsUrl } from '@/lib/validators'
import { AddressFields } from './address-form'
import { EMPTY, toPayload, type AddressForm } from './address-form-values'

interface DivisionLite {
  id: string
  name: string
}

interface ManagerProps {
  initial: AddressForm[]
  divisions: DivisionLite[]
}

export function AddressManager({ initial, divisions }: ManagerProps) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  /** Remounts the add form on success, which is how it gets cleared. */
  const [addKey, setAddKey] = useState(0)

  async function create(values: AddressForm) {
    setSaving(true)
    const res = await api('/api/v1/addresses', {
      method: 'POST',
      body: JSON.stringify(toPayload(values)),
    })
    setSaving(false)
    if (!res.ok) {
      toast(res.error?.message ?? 'Failed to save address.')
      return
    }
    toast('Address saved.')
    setAddKey((k) => k + 1)
    router.refresh()
  }

  async function update(id: string, values: AddressForm) {
    setSaving(true)
    const res = await api(`/api/v1/addresses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(toPayload(values)),
    })
    setSaving(false)
    if (!res.ok) {
      // 409 carries the reason an address is frozen mid-delivery, same as delete.
      toast(res.error?.message ?? 'Failed to update address.')
      return
    }
    toast('Address updated.')
    setEditingId(null)
    router.refresh()
  }

  async function remove(id: string) {
    const res = await api(`/api/v1/addresses/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      // 409 carries the reason an address is frozen mid-delivery. Showing the
      // generic failure instead would leave the customer clicking a dead button.
      toast(res.error?.message ?? 'Failed to delete.')
      return
    }
    router.refresh()
  }

  return (
    <div className="mt-8 space-y-10">
      {initial.length > 0 && (
        <section>
          <ul className="divide-y divide-line border-y border-line">
            {initial.map((a) => {
              const div = divisions.find((d) => d.id === a.divisionId)
              const editing = editingId === a.id
              return (
                <li key={a.id} className="py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-display text-[16px]">
                        {a.label}{' '}
                        {a.isDefault && (
                          <span className="ml-1 rounded-[var(--radius-pill)] bg-sand px-2 py-0.5 text-[11px] text-ink">
                            default
                          </span>
                        )}
                      </div>
                      {!editing && (
                        <>
                          <div className="mt-1 text-[13px] text-ink-soft">
                            {a.recipient} · {a.street}, {a.township}, {a.city}
                            {div ? `, ${div.name}` : ''}
                          </div>
                          {a.landmark && (
                            <div className="text-[12px] text-muted">{a.landmark}</div>
                          )}
                          <div className="mt-0.5 text-[12px] text-muted">
                            {a.phone}
                            {a.telegramUsername ? ` · Telegram @${a.telegramUsername}` : ''}
                          </div>
                          {a.mapsUrl && isGoogleMapsUrl(a.mapsUrl) && (
                            <a
                              href={a.mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              className="mt-1 inline-flex items-center gap-1 text-[12px] text-ink underline underline-offset-4 hover:text-accent"
                            >
                              <MapPin className="h-3 w-3" strokeWidth={1.5} aria-hidden />
                              Map pin
                            </a>
                          )}
                        </>
                      )}
                    </div>
                    {editing ? (
                      <button
                        onClick={() => setEditingId(null)}
                        aria-label={`Stop editing ${a.label}`}
                        className="text-muted hover:text-ink"
                      >
                        <X size={16} strokeWidth={1.5} />
                      </button>
                    ) : (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => a.id && setEditingId(a.id)}
                          aria-label={`Edit ${a.label}`}
                          className="text-muted hover:text-ink"
                        >
                          <Pencil size={16} strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => a.id && remove(a.id)}
                          aria-label={`Delete ${a.label}`}
                          className="text-muted hover:text-error"
                        >
                          <Trash2 size={16} strokeWidth={1.5} />
                        </button>
                      </div>
                    )}
                  </div>
                  {editing && a.id && (
                    <AddressFields
                      initial={a}
                      divisions={divisions}
                      submitLabel="Save changes"
                      saving={saving}
                      onSubmit={(values) => update(a.id as string, values)}
                      onCancel={() => setEditingId(null)}
                    />
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section>
        <h3 className="font-display text-[20px]">Add address</h3>
        <AddressFields
          key={addKey}
          initial={EMPTY}
          divisions={divisions}
          submitLabel="Save address"
          saving={saving}
          onSubmit={create}
        />
      </section>
    </div>
  )
}
