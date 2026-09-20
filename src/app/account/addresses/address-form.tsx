'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { PhoneField, SelectField, TextField } from '@/components/ui/field'
import {
  MAPS_URL_HINT,
  PHONE_HINT,
  PHONE_PREFIX,
  TELEGRAM_HINT,
  normalizePhoneLocal,
} from '@/lib/validators'
import {
  ALL_TOUCHED,
  validate,
  type AddressForm as Values,
  type Errors,
  type FieldKey,
  type Touched,
} from './address-form-values'

interface DivisionLite {
  id: string
  name: string
}

interface AddressFormProps {
  initial: Values
  divisions: DivisionLite[]
  submitLabel: string
  saving: boolean
  onSubmit: (values: Values) => void
  /** Passed only by the inline editor - the add form has nothing to cancel. */
  onCancel?: () => void
}

export function AddressFields({
  initial,
  divisions,
  submitLabel,
  saving,
  onSubmit,
  onCancel,
}: AddressFormProps) {
  const [form, setForm] = useState<Values>(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState<Touched>({})

  function set<K extends keyof Values>(key: K, val: Values[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  /** Re-runs validation as you type, but only for a field you have left once. */
  function edit<K extends FieldKey>(key: K, val: string) {
    set(key, val)
    if (touched[key]) setErrors(validate({ ...form, [key]: val }))
  }

  function markTouched(field: FieldKey) {
    setTouched((t) => ({ ...t, [field]: true }))
    setErrors(validate(form))
  }

  function liveError(field: FieldKey): string | null {
    if (!touched[field]) return null
    return errors[field] ?? null
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const v = validate(form)
    setErrors(v)
    setTouched(ALL_TOUCHED)
    if (Object.keys(v).length > 0) {
      toast('Fix the highlighted fields.')
      return
    }
    onSubmit(form)
  }

  return (
    <form onSubmit={submit} noValidate className="mt-4 grid gap-3 md:grid-cols-2">
      <TextField
        label="Label"
        required
        value={form.label}
        onChange={(v) => edit('label', v)}
        onBlur={() => markTouched('label')}
        error={liveError('label')}
      />
      <TextField
        label="Recipient name"
        required
        autoComplete="name"
        value={form.recipient}
        onChange={(v) => edit('recipient', v)}
        onBlur={() => markTouched('recipient')}
        error={liveError('recipient')}
      />
      <PhoneField
        label="Phone"
        required
        prefix={PHONE_PREFIX}
        helper={PHONE_HINT}
        value={form.phone}
        onChange={(v) => edit('phone', normalizePhoneLocal(v))}
        onBlur={() => markTouched('phone')}
        error={liveError('phone')}
      />
      <SelectField
        label="Division"
        required
        value={form.divisionId}
        onChange={(v) => edit('divisionId', v)}
        onBlur={() => markTouched('divisionId')}
        error={liveError('divisionId')}
      >
        <option value="">Choose a division</option>
        {divisions.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </SelectField>
      <TextField
        label="City"
        required
        autoComplete="address-level2"
        value={form.city}
        onChange={(v) => edit('city', v)}
        onBlur={() => markTouched('city')}
        error={liveError('city')}
      />
      <TextField
        label="Township"
        required
        value={form.township}
        onChange={(v) => edit('township', v)}
        onBlur={() => markTouched('township')}
        error={liveError('township')}
      />
      <TextField
        className="md:col-span-2"
        label="Street + house no."
        required
        autoComplete="street-address"
        value={form.street}
        onChange={(v) => edit('street', v)}
        onBlur={() => markTouched('street')}
        error={liveError('street')}
      />
      <TextField
        className="md:col-span-2"
        label="Landmark (optional)"
        value={form.landmark}
        onChange={(v) => set('landmark', v)}
      />
      <TextField
        label="Telegram (optional)"
        inputMode="text"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder="username"
        helper={TELEGRAM_HINT}
        value={form.telegramUsername}
        onChange={(v) => edit('telegramUsername', v)}
        onBlur={() => markTouched('telegramUsername')}
        error={liveError('telegramUsername')}
      />
      <TextField
        label="Map pin (optional)"
        type="url"
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder="https://maps.app.goo.gl/..."
        helper={MAPS_URL_HINT}
        value={form.mapsUrl}
        onChange={(v) => edit('mapsUrl', v)}
        onBlur={() => markTouched('mapsUrl')}
        error={liveError('mapsUrl')}
      />
      <label className="md:col-span-2 inline-flex items-center gap-2 text-[14px] text-ink-soft">
        <input
          type="checkbox"
          checked={form.isDefault}
          onChange={(e) => set('isDefault', e.target.checked)}
        />
        Set as default
      </label>
      <div className="md:col-span-2 flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex flex-1 items-center justify-center rounded-[var(--radius-pill)] bg-ink py-3 text-[14px] font-medium text-cream transition-colors hover:bg-accent disabled:opacity-60"
        >
          {saving ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-[14px] text-muted underline underline-offset-4 hover:text-ink"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
