'use client'

import { useId } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { slugify, SLUG_REGEX } from '@/lib/slugify'
import { CATEGORIES } from '@/lib/categories'

export interface ProductFormValues {
  name: string
  slug: string
  categoryId: string
  priceMmk: string
  /** Blank means no sale. */
  salePriceMmk: string
  tagline: string
  description: string
  swatch: string
  stockQty: string
  lowStockThreshold: string
  sortOrder: string
  isActive: boolean
  featured: boolean
  specs: Array<{ label: string; value: string }>
}

interface Props {
  values: ProductFormValues
  onChange: (next: ProductFormValues) => void
  mode: 'create' | 'edit'
}

export function ProductDetailsForm({ values, onChange, mode }: Props) {
  const slugId = useId()
  const slugInvalid = values.slug !== '' && !SLUG_REGEX.test(values.slug)

  function set<K extends keyof ProductFormValues>(key: K, val: ProductFormValues[K]) {
    onChange({ ...values, [key]: val })
  }

  function setName(name: string) {
    if (mode === 'create') {
      // Auto-slug only while user hasn't customised it.
      const expected = slugify(values.name)
      const shouldSync = values.slug === '' || values.slug === expected
      onChange({
        ...values,
        name,
        slug: shouldSync ? slugify(name) : values.slug,
      })
    } else {
      onChange({ ...values, name })
    }
  }

  function addSpec() {
    onChange({ ...values, specs: [...values.specs, { label: '', value: '' }] })
  }
  function updateSpec(i: number, field: 'label' | 'value', val: string) {
    const next = values.specs.map((s, idx) => (idx === i ? { ...s, [field]: val } : s))
    onChange({ ...values, specs: next })
  }
  function removeSpec(i: number) {
    onChange({ ...values, specs: values.specs.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <Field label="Name" required value={values.name} onChange={setName} />

      <div>
        <label htmlFor={slugId} className="block text-[12px] text-muted">
          Slug <span className="text-error">*</span>
        </label>
        <input
          id={slugId}
          type="text"
          value={values.slug}
          onChange={(e) => set('slug', e.target.value.toLowerCase())}
          readOnly={mode === 'edit'}
          className={`mt-1 w-full rounded-[var(--radius)] border bg-cream px-3 py-2 text-[13px] focus:outline-none ${
            slugInvalid ? 'border-error focus:border-error' : 'border-line focus:border-ink/40'
          } ${mode === 'edit' ? 'cursor-not-allowed opacity-70' : ''}`}
        />
        <p className={`mt-1 text-[11px] ${slugInvalid ? 'text-error' : 'text-muted'}`}>
          {slugInvalid
            ? 'Slug must be lowercase letters, digits, and dashes only.'
            : mode === 'edit'
              ? 'Slug is fixed after creation to keep order references stable.'
              : 'Auto-fills from the name. Override before saving if you want a different URL.'}
        </p>
      </div>

      <SelectField
        label="Category"
        required
        value={values.categoryId}
        onChange={(v) => set('categoryId', v)}
      >
        {CATEGORIES.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </SelectField>

      <Field
        label="Price (MMK)"
        required
        type="number"
        value={values.priceMmk}
        onChange={(v) => set('priceMmk', v)}
      />

      <Field
        label="Sale price (MMK) - blank for no sale"
        type="number"
        value={values.salePriceMmk}
        onChange={(v) => set('salePriceMmk', v)}
      />

      <Field
        label="Tagline"
        required
        className="md:col-span-2"
        value={values.tagline}
        onChange={(v) => set('tagline', v)}
      />

      <label className="block md:col-span-2">
        <span className="text-[12px] text-muted">
          Description <span className="text-error">*</span>
        </span>
        <textarea
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-[var(--radius)] border border-line bg-cream px-3 py-2 text-[13px] focus:outline-none focus:border-ink/40"
        />
      </label>

      <label className="block">
        <span className="text-[12px] text-muted">Swatch colour</span>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="color"
            value={values.swatch}
            onChange={(e) => set('swatch', e.target.value)}
            className="h-9 w-12 cursor-pointer rounded border border-line bg-cream"
          />
          <input
            type="text"
            value={values.swatch}
            onChange={(e) => set('swatch', e.target.value)}
            className="w-full rounded-[var(--radius)] border border-line bg-cream px-3 py-2 font-mono text-[13px] focus:outline-none focus:border-ink/40"
          />
        </div>
      </label>

      <div className="grid grid-cols-3 gap-3">
        <Field
          label="Stock qty"
          required
          type="number"
          value={values.stockQty}
          onChange={(v) => set('stockQty', v)}
        />
        <Field
          label="Low-stock threshold"
          required
          type="number"
          value={values.lowStockThreshold}
          onChange={(v) => set('lowStockThreshold', v)}
        />
        <Field
          label="Display order"
          type="number"
          value={values.sortOrder}
          onChange={(v) => set('sortOrder', v)}
        />
      </div>

      <div className="md:col-span-2 flex flex-wrap items-center gap-6 text-[13px] text-ink-soft">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(e) => set('isActive', e.target.checked)}
          />
          Active (visible in shop)
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={values.featured}
            onChange={(e) => set('featured', e.target.checked)}
          />
          Featured
        </label>
      </div>

      <div className="md:col-span-2">
        <div className="flex items-center justify-between">
          <h4 className="font-display text-[15px]">Specs</h4>
          <button
            type="button"
            onClick={addSpec}
            className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] border border-line bg-cream px-3 py-1 text-[12px] font-medium text-ink transition-colors hover:border-ink/40"
          >
            <Plus size={12} strokeWidth={2} /> Add row
          </button>
        </div>
        {values.specs.length === 0 ? (
          <p className="mt-2 text-[12px] text-muted">No specs yet. Click Add row to add one.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {values.specs.map((s, i) => (
              <li key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                <input
                  type="text"
                  placeholder="Label"
                  value={s.label}
                  onChange={(e) => updateSpec(i, 'label', e.target.value)}
                  className="rounded-[var(--radius)] border border-line bg-cream px-3 py-2 text-[13px] focus:outline-none focus:border-ink/40"
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={s.value}
                  onChange={(e) => updateSpec(i, 'value', e.target.value)}
                  className="rounded-[var(--radius)] border border-line bg-cream px-3 py-2 text-[13px] focus:outline-none focus:border-ink/40"
                />
                <button
                  type="button"
                  onClick={() => removeSpec(i)}
                  aria-label="Remove spec"
                  className="text-muted hover:text-error"
                >
                  <Trash2 size={14} strokeWidth={1.5} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

interface FieldProps {
  label: string
  required?: boolean
  type?: string
  value: string
  onChange: (v: string) => void
  className?: string
}

function Field({ label, required, type = 'text', value, onChange, className }: FieldProps) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="text-[12px] text-muted">
        {label}
        {required && <span className="ml-0.5 text-error">*</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-[var(--radius)] border border-line bg-cream px-3 py-2 text-[13px] focus:outline-none focus:border-ink/40"
      />
    </label>
  )
}

interface SelectFieldProps {
  label: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}

function SelectField({ label, required, value, onChange, children }: SelectFieldProps) {
  return (
    <label className="block">
      <span className="text-[12px] text-muted">
        {label}
        {required && <span className="ml-0.5 text-error">*</span>}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-[var(--radius)] border border-line bg-cream px-3 py-2 text-[13px] focus:outline-none focus:border-ink/40"
      >
        {children}
      </select>
    </label>
  )
}
