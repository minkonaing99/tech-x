'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { api } from '@/lib/api-client'

interface Row {
  id: string
  name: string
  kind: 'wallet' | 'cod'
  accountName: string | null
  accountPhone: string | null
  qrImageUrl: string | null
  instructionsMd: string | null
  sortOrder: number
  isActive: boolean
}

type Draft = {
  accountName: string
  accountPhone: string
  instructionsMd: string
  sortOrder: string
  isActive: boolean
  pendingFile: File | null
  pendingPreview: string | null
}

function fromRow(r: Row): Draft {
  return {
    accountName: r.accountName ?? '',
    accountPhone: r.accountPhone ?? '',
    instructionsMd: r.instructionsMd ?? '',
    sortOrder: String(r.sortOrder),
    isActive: r.isActive,
    pendingFile: null,
    pendingPreview: null,
  }
}

function diff(saved: Row, draft: Draft): Partial<Row> {
  const patch: Partial<Row> = {}
  const acctName = draft.accountName || null
  if (acctName !== saved.accountName) patch.accountName = acctName
  const acctPhone = draft.accountPhone || null
  if (acctPhone !== saved.accountPhone) patch.accountPhone = acctPhone
  const instr = draft.instructionsMd || null
  if (instr !== saved.instructionsMd) patch.instructionsMd = instr
  const sortNum = Number(draft.sortOrder) || 0
  if (sortNum !== saved.sortOrder) patch.sortOrder = sortNum
  if (draft.isActive !== saved.isActive) patch.isActive = draft.isActive
  return patch
}

export function PaymentMethodTable({ initial }: { initial: Row[] }) {
  const [saved, setSaved] = useState<Row[]>(initial)
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(initial.map((r) => [r.id, fromRow(r)])),
  )
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [uploadError, setUploadError] = useState<Record<string, string>>({})

  function updateDraft(id: string, patch: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [id]: { ...d[id]!, ...patch } }))
  }

  function pickFile(id: string, file: File | null) {
    setUploadError((m) => ({ ...m, [id]: '' }))
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      const msg = 'Use JPG, PNG, or WEBP.'
      setUploadError((m) => ({ ...m, [id]: msg }))
      return
    }
    if (file.size > 4 * 1024 * 1024) {
      const msg = 'File over 4 MB. Compress before uploading.'
      setUploadError((m) => ({ ...m, [id]: msg }))
      return
    }
    const url = URL.createObjectURL(file)
    updateDraft(id, { pendingFile: file, pendingPreview: url })
  }

  async function saveRow(id: string) {
    const savedRow = saved.find((r) => r.id === id)
    const draft = drafts[id]
    if (!savedRow || !draft) return

    setSaving((m) => ({ ...m, [id]: true }))
    setUploadError((m) => ({ ...m, [id]: '' }))

    let nextQrUrl = savedRow.qrImageUrl

    // 1) Upload pending file if any.
    if (draft.pendingFile) {
      const form = new FormData()
      form.append('methodId', id)
      form.append('qr', draft.pendingFile)
      const res = await api<{ qrImageUrl: string }>('/api/v1/admin/payment-methods/qr', {
        method: 'POST',
        body: form,
      })
      if (!res.ok || !res.data) {
        const msg = res.error?.message ?? `Upload failed (HTTP ${res.status}).`
        setUploadError((m) => ({ ...m, [id]: msg }))
        toast(msg)
        setSaving((m) => ({ ...m, [id]: false }))
        return
      }
      nextQrUrl = res.data.qrImageUrl
    }

    // 2) Patch field diffs.
    const patch = diff(savedRow, draft)
    if (Object.keys(patch).length > 0) {
      const res = await api(`/api/v1/admin/payment-methods/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const msg = res.error?.message ?? 'Save failed.'
        toast(msg)
        setSaving((m) => ({ ...m, [id]: false }))
        return
      }
    }

    // 3) Commit local state.
    const updatedRow: Row = { ...savedRow, ...patch, qrImageUrl: nextQrUrl }
    setSaved((rs) => rs.map((r) => (r.id === id ? updatedRow : r)))
    if (draft.pendingPreview) URL.revokeObjectURL(draft.pendingPreview)
    setDrafts((d) => ({ ...d, [id]: fromRow(updatedRow) }))
    setSaving((m) => ({ ...m, [id]: false }))
    toast('Saved.')
  }

  function discardRow(id: string) {
    const savedRow = saved.find((r) => r.id === id)
    if (!savedRow) return
    const draft = drafts[id]
    if (draft?.pendingPreview) URL.revokeObjectURL(draft.pendingPreview)
    setDrafts((d) => ({ ...d, [id]: fromRow(savedRow) }))
    setUploadError((m) => ({ ...m, [id]: '' }))
  }

  return (
    <div className="mt-6 space-y-6">
      {saved.map((r) => {
        const d = drafts[r.id]!
        const isDirty = computeDirty(r, d)
        const previewUrl = d.pendingPreview ?? r.qrImageUrl
        return (
          <article
            key={r.id}
            className="rounded-[var(--radius-lg)] border border-line bg-surface p-5 md:p-6"
          >
            <header className="flex items-center justify-between gap-4">
              <div>
                <div className="font-display text-[20px]">{r.name}</div>
                <div className="text-[12px] uppercase tracking-[0.06em] text-muted">{r.kind}</div>
              </div>
              <label className="inline-flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={d.isActive}
                  onChange={(e) => updateDraft(r.id, { isActive: e.target.checked })}
                />
                Active
              </label>
            </header>

            {r.kind === 'wallet' ? (
              <div className="mt-5 grid gap-4 md:grid-cols-[160px_1fr]">
                <div>
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt={`${r.name} QR`}
                      className="aspect-square w-[160px] rounded border border-line bg-cream object-contain"
                    />
                  ) : (
                    <div className="aspect-square w-[160px] rounded border border-line bg-cream" />
                  )}
                  <div className="mt-2">
                    <label className="block text-[12px] text-muted">
                      Upload QR
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={Boolean(saving[r.id])}
                        onChange={(e) => {
                          pickFile(r.id, e.target.files?.[0] ?? null)
                          e.target.value = ''
                        }}
                        className="mt-1 block w-full text-[12px] file:mr-2 file:rounded-[var(--radius-pill)] file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-[11px] file:font-medium file:text-cream file:transition-colors hover:file:bg-accent disabled:opacity-60"
                      />
                    </label>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted">
                      JPG, PNG, or WEBP · max 4&nbsp;MB · square works best.
                      <br />
                      Server auto-resizes to 600&times;600.
                    </p>
                    {d.pendingFile && (
                      <p className="mt-1 text-[11px] text-accent">
                        New file selected - click Save to upload.
                      </p>
                    )}
                    {uploadError[r.id] && (
                      <p className="mt-1 text-[11px] text-error">{uploadError[r.id]}</p>
                    )}
                  </div>
                </div>
                <div className="grid gap-3">
                  <Field
                    label="Account name"
                    value={d.accountName}
                    onChange={(v) => updateDraft(r.id, { accountName: v })}
                  />
                  <Field
                    label="Account phone"
                    value={d.accountPhone}
                    onChange={(v) => updateDraft(r.id, { accountPhone: v })}
                  />
                  <label className="block">
                    <span className="text-[12px] text-muted">Instructions (markdown, optional)</span>
                    <textarea
                      value={d.instructionsMd}
                      rows={3}
                      onChange={(e) => updateDraft(r.id, { instructionsMd: e.target.value })}
                      className="mt-1 w-full rounded-[var(--radius)] border border-line bg-cream px-3 py-2 text-[13px] focus:outline-none focus:border-ink/40"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[12px] text-muted">Sort order</span>
                    <select
                      value={d.sortOrder}
                      onChange={(e) => updateDraft(r.id, { sortOrder: e.target.value })}
                      className="mt-1 w-full rounded-[var(--radius)] border border-line bg-cream px-3 py-2 text-[13px] focus:outline-none focus:border-ink/40"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={String(n)}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ) : (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <p className="text-[13px] text-muted">
                  Cash on Delivery has no account info. Toggle Active to enable it for eligible orders.
                </p>
                <label className="block max-w-[160px]">
                  <span className="text-[12px] text-muted">Sort order</span>
                  <select
                    value={d.sortOrder}
                    onChange={(e) => updateDraft(r.id, { sortOrder: e.target.value })}
                    className="mt-1 w-full rounded-[var(--radius)] border border-line bg-cream px-3 py-2 text-[13px] focus:outline-none focus:border-ink/40"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={String(n)}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              {isDirty && (
                <span className="text-[12px] text-muted sm:mr-auto">Unsaved changes.</span>
              )}
              <button
                type="button"
                disabled={!isDirty || Boolean(saving[r.id])}
                onClick={() => discardRow(r.id)}
                className="inline-flex items-center justify-center rounded-[var(--radius-pill)] border border-line bg-cream px-5 py-2 text-[13px] font-medium text-ink transition-colors hover:border-ink/40 disabled:opacity-50"
              >
                Discard
              </button>
              <button
                type="button"
                disabled={!isDirty || Boolean(saving[r.id])}
                onClick={() => saveRow(r.id)}
                className="inline-flex items-center justify-center rounded-[var(--radius-pill)] bg-ink px-6 py-2 text-[13px] font-medium text-cream transition-colors hover:bg-accent disabled:opacity-50"
              >
                {saving[r.id] ? 'Saving…' : 'Save'}
              </button>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function computeDirty(saved: Row, draft: Draft): boolean {
  if (draft.pendingFile) return true
  return Object.keys(diff(saved, draft)).length > 0
}

interface FieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}

function Field({ label, value, onChange, type = 'text' }: FieldProps) {
  return (
    <label className="block">
      <span className="text-[12px] text-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-[var(--radius)] border border-line bg-cream px-3 py-2 text-[13px] focus:outline-none focus:border-ink/40"
      />
    </label>
  )
}
