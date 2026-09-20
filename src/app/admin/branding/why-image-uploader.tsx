'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Trash2, Upload } from 'lucide-react'
import { api } from '@/lib/api-client'

interface Props {
  initialUrl: string | null
}

export function WhyImageUploader({ initialUrl }: Props) {
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [preview, setPreview] = useState<string | null>(null)
  const [pending, setPending] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function pickFile(file: File | null) {
    setError('')
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Use JPG, PNG, or WEBP.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File over 10 MB.')
      return
    }
    setPending(file)
    setPreview(URL.createObjectURL(file))
  }

  async function save() {
    if (!pending) return
    setSaving(true)
    setError('')
    const form = new FormData()
    form.append('image', pending)
    const res = await api<{ url: string }>('/api/v1/admin/site/why-image', {
      method: 'POST',
      body: form,
    })
    if (!res.ok) {
      setError(res.error?.message ?? `Upload failed (HTTP ${res.status}).`)
    } else {
      setUrl(res.data?.url ?? null)
      setPreview(null)
      setPending(null)
      if (inputRef.current) inputRef.current.value = ''
    }
    setSaving(false)
  }

  async function remove() {
    setRemoving(true)
    setError('')
    const res = await api('/api/v1/admin/site/why-image', { method: 'DELETE' })
    if (!res.ok) {
      setError(res.error?.message ?? 'Remove failed.')
    } else {
      setUrl(null)
      setPreview(null)
      setPending(null)
      if (inputRef.current) inputRef.current.value = ''
    }
    setRemoving(false)
  }

  const displayUrl = preview ?? url

  return (
    <div className="space-y-4">
      <div className="relative aspect-square max-w-[320px] overflow-hidden rounded-[var(--radius)] border border-line bg-sand">
        {displayUrl ? (
          <Image src={displayUrl} alt="Why section image" fill className="object-cover" unoptimized={Boolean(preview)} />
        ) : (
          <div className="flex h-full items-center justify-center text-[13px] text-muted">No image set</div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-line bg-cream px-4 py-2 text-[13px] text-ink hover:bg-line">
          <Upload size={14} />
          Choose image
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          />
        </label>

        {pending && (
          <button
            onClick={save}
            disabled={saving}
            className="rounded bg-ink px-4 py-2 text-[13px] text-cream disabled:opacity-50"
          >
            {saving ? 'Uploading...' : 'Upload'}
          </button>
        )}

        {url && !preview && (
          <button
            onClick={remove}
            disabled={removing}
            className="inline-flex items-center gap-1.5 rounded border border-line px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={14} />
            {removing ? 'Removing...' : 'Remove'}
          </button>
        )}

        {preview && (
          <button
            onClick={() => { setPreview(null); setPending(null); if (inputRef.current) inputRef.current.value = '' }}
            className="text-[13px] text-muted underline"
          >
            Cancel
          </button>
        )}
      </div>

      {error && <p className="text-[13px] text-red-600">{error}</p>}
      <p className="text-[12px] text-muted">JPG, PNG, or WEBP. Max 10 MB. Displayed in the &ldquo;Why Tech X&rdquo; section on the homepage.</p>
    </div>
  )
}
