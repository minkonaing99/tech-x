'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { SelectField, TextAreaField, TextField } from '@/components/ui/field'
import { api } from '@/lib/api-client'

export interface ContactFormCopy {
  name: string
  email: string
  topicLabel: string
  topics: Readonly<Record<'order' | 'product' | 'returns' | 'press' | 'other', string>>
  orderId: string
  orderIdHelper: string
  message: string
  tooShort: string
  send: string
  sending: string
  sent: string
  failed: string
}

const EMPTY = { name: '', email: '', topic: 'order', orderId: '', message: '', website: '' }

export function ContactForm({ copy }: { copy: ContactFormCopy }) {
  const [form, setForm] = useState(EMPTY)
  const [sending, setSending] = useState(false)

  function set(key: keyof typeof EMPTY, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (sending) return

    if (form.message.trim().length < 10) {
      toast(copy.tooShort)
      return
    }

    setSending(true)
    const res = await api('/api/v1/contact', {
      method: 'POST',
      body: JSON.stringify({
        name: form.name.trim(),
        email: form.email.trim(),
        topic: form.topic,
        orderId: form.orderId.trim() || undefined,
        message: form.message.trim(),
        website: form.website,
      }),
    })
    setSending(false)

    if (!res.ok) {
      toast(res.error?.message ?? copy.failed)
      return
    }

    toast(copy.sent)
    setForm(EMPTY)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[var(--radius-lg)] border border-line bg-surface p-6 md:p-8"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={copy.name}
          required
          maxLength={80}
          autoComplete="name"
          value={form.name}
          onChange={(v) => set('name', v)}
        />
        <TextField
          label={copy.email}
          type="email"
          required
          maxLength={254}
          autoComplete="email"
          value={form.email}
          onChange={(v) => set('email', v)}
        />
        <SelectField
          label={copy.topicLabel}
          required
          value={form.topic}
          onChange={(v) => set('topic', v)}
        >
          {Object.entries(copy.topics).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        <TextField
          label={copy.orderId}
          helper={copy.orderIdHelper}
          maxLength={64}
          value={form.orderId}
          onChange={(v) => set('orderId', v)}
        />
      </div>

      <TextAreaField
        label={copy.message}
        required
        rows={6}
        maxLength={4000}
        className="mt-4"
        value={form.message}
        onChange={(v) => set('message', v)}
      />

      {/* Honeypot - hidden from people, tempting to bots. */}
      <div aria-hidden className="hidden">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => set('website', e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={sending}
        className="mt-6 rounded-[var(--radius-pill)] bg-ink px-6 py-3 text-[14px] font-medium text-cream transition-colors hover:bg-accent disabled:opacity-60"
      >
        {sending ? copy.sending : copy.send}
      </button>
    </form>
  )
}
