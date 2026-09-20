'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { PHOTO_BASE } from '@/lib/types'
import { api } from '@/lib/api-client'

const SLOTS = ['01', '02', '03', '04'] as const
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_BYTES = 10 * 1024 * 1024

function thumbUrlFor(slug: string, slot: string): string {
  return `${PHOTO_BASE}/${slug}/${slot}-thumb.webp`
}

interface Props {
  productId: string
  slug: string
  swatch: string
  onChange: (hasAnyHero01: boolean) => void
}

interface SlotState {
  thumbUrl: string | null
  busy: boolean
  error: string | null
  bust: number // cache-busting query string
}

export function ProductPhotoGrid({ productId, slug, swatch, onChange }: Props) {
  const [slots, setSlots] = useState<Record<string, SlotState>>(() =>
    Object.fromEntries(
      SLOTS.map((s) => [
        s,
        { thumbUrl: thumbUrlFor(slug, s), busy: false, error: null, bust: Date.now() },
      ]),
    ),
  )

  useEffect(() => {
    setSlots(
      Object.fromEntries(
        SLOTS.map((s) => [
          s,
          { thumbUrl: thumbUrlFor(slug, s), busy: false, error: null, bust: Date.now() },
        ]),
      ),
    )
  }, [slug])

  function setSlot(slot: string, patch: Partial<SlotState>) {
    setSlots((m) => ({ ...m, [slot]: { ...m[slot]!, ...patch } }))
  }

  async function upload(slot: string, file: File) {
    setSlot(slot, { error: null })
    if (!ALLOWED_MIME.has(file.type)) {
      const msg = 'Use JPG, PNG, or WEBP.'
      setSlot(slot, { error: msg })
      toast(msg)
      return
    }
    if (file.size > MAX_BYTES) {
      const msg = 'File over 10 MB.'
      setSlot(slot, { error: msg })
      toast(msg)
      return
    }
    setSlot(slot, { busy: true })
    const form = new FormData()
    form.append('photo', file)
    const res = await api(`/api/v1/admin/products/${productId}/photos/${slot}`, {
      method: 'POST',
      body: form,
    })
    setSlot(slot, { busy: false })
    if (!res.ok) {
      const msg = res.error?.message ?? `Upload failed (HTTP ${res.status}).`
      setSlot(slot, { error: msg })
      toast(msg)
      return
    }
    setSlot(slot, { bust: Date.now() })
    onChange(true)
    toast(`Slot ${slot} uploaded.`)
  }

  async function remove(slot: string) {
    if (!confirm(`Remove photo slot ${slot}?`)) return
    setSlot(slot, { busy: true, error: null })
    const res = await api(`/api/v1/admin/products/${productId}/photos/${slot}`, {
      method: 'DELETE',
    })
    setSlot(slot, { busy: false })
    if (!res.ok) {
      const msg = res.error?.message ?? `Remove failed (HTTP ${res.status}).`
      setSlot(slot, { error: msg })
      toast(msg)
      return
    }
    setSlot(slot, { bust: Date.now() })
    // 01 removal may flip hasPhotos false. Server already synced. We optimistically
    // tell parent based on whether 01 thumb might still resolve.
    if (slot === '01') onChange(false)
    toast(`Slot ${slot} removed.`)
  }

  return (
    <div>
      <p className="text-[12px] text-muted">
        JPG, PNG, or WEBP · max 10 MB per file. Server saves a 1600×1600 hero and a 600×600 thumb,
        EXIF stripped.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SLOTS.map((slot) => {
          const s = slots[slot]!
          const url = s.thumbUrl ? `${s.thumbUrl}?v=${s.bust}` : null
          return (
            <div key={slot} className="space-y-2">
              <div
                className="relative aspect-square w-full overflow-hidden rounded-[var(--radius)] border border-line"
                style={{ backgroundColor: swatch }}
              >
                {url && (
                  <img
                    src={url}
                    alt={`Slot ${slot}`}
                    onError={(e) => {
                      e.currentTarget.style.visibility = 'hidden'
                    }}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                )}
                <div className="absolute left-2 top-2 rounded bg-ink/70 px-1.5 py-0.5 text-[10px] font-medium text-cream">
                  {slot}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-[var(--radius-pill)] border border-line bg-cream px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:border-ink/40">
                  {s.busy ? 'Working…' : 'Replace'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={s.busy}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void upload(slot, file)
                      e.target.value = ''
                    }}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => remove(slot)}
                  disabled={s.busy}
                  aria-label={`Remove slot ${slot}`}
                  className="rounded-[var(--radius-pill)] border border-line bg-cream p-2 text-muted hover:text-error disabled:opacity-50"
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </div>
              {s.error && <p className="text-[11px] text-error">{s.error}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
