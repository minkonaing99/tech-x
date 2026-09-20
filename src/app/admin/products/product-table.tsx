'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { formatMmk } from '@/lib/money'
import { SLUG_REGEX } from '@/lib/slugify'
import { ProductDetailsForm, type ProductFormValues } from './product-details-form'
import { CATEGORIES } from '@/lib/categories'
import { ProductPhotoGrid } from './product-photo-grid'
import { api } from '@/lib/api-client'
import { isValidSalePrice, salePriceMessage } from '@/lib/pricing'

export interface Row {
  id: string
  name: string
  slug: string
  categoryId: string
  priceMmk: number
  salePriceMmk: number | null
  tagline: string
  description: string
  swatch: string
  stockQty: number
  lowStockThreshold: number
  sortOrder: number
  featured: boolean
  isActive: boolean
  hasPhotos: boolean
  specs: Array<{ label: string; value: string }>
}

interface Props {
  initial: Row[]
}

type ExpandedSection = 'details' | 'photos' | null

function rowToForm(r: Row): ProductFormValues {
  return {
    name: r.name,
    slug: r.slug,
    categoryId: r.categoryId,
    priceMmk: String(r.priceMmk),
    salePriceMmk: r.salePriceMmk === null ? '' : String(r.salePriceMmk),
    tagline: r.tagline,
    description: r.description,
    swatch: r.swatch,
    stockQty: String(r.stockQty),
    lowStockThreshold: String(r.lowStockThreshold),
    sortOrder: String(r.sortOrder),
    isActive: r.isActive,
    featured: r.featured,
    specs: r.specs.map((s) => ({ ...s })),
  }
}

function emptyForm(catId: string): ProductFormValues {
  return {
    name: '',
    slug: '',
    categoryId: catId,
    priceMmk: '0',
    salePriceMmk: '',
    tagline: '',
    description: '',
    swatch: '#7A4F36',
    stockQty: '0',
    lowStockThreshold: '3',
    sortOrder: '0',
    isActive: true,
    featured: false,
    specs: [],
  }
}

export function AdminProductTable({ initial }: Props) {
  const [rows, setRows] = useState<Row[]>(initial)
  const [creating, setCreating] = useState(false)
  const [newDraft, setNewDraft] = useState<ProductFormValues>(() =>
    emptyForm(CATEGORIES[0].id),
  )
  const [savingNew, setSavingNew] = useState(false)

  const [expanded, setExpanded] = useState<Record<string, ExpandedSection>>({})
  const [drafts, setDrafts] = useState<Record<string, ProductFormValues>>({})
  const [savingRow, setSavingRow] = useState<Record<string, boolean>>({})

  function openSection(id: string, section: ExpandedSection) {
    setExpanded((m) => ({ ...m, [id]: m[id] === section ? null : section }))
    setDrafts((d) => {
      if (d[id]) return d
      const row = rows.find((r) => r.id === id)
      return row ? { ...d, [id]: rowToForm(row) } : d
    })
  }

  function updateDraft(id: string, next: ProductFormValues) {
    setDrafts((d) => ({ ...d, [id]: next }))
  }

  function discardDraft(id: string) {
    const row = rows.find((r) => r.id === id)
    if (!row) return
    setDrafts((d) => ({ ...d, [id]: rowToForm(row) }))
  }

  async function createProduct() {
    const errors = validateForm(newDraft, true, new Set(rows.map((r) => r.slug)))
    if (errors.length > 0) {
      toast(errors[0]!)
      return
    }
    setSavingNew(true)
    const body = formToBody(newDraft)
    const res = await api<{ slug: string }>('/api/v1/admin/products', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    setSavingNew(false)
    if (!res.ok || !res.data) {
      toast(res.error?.message ?? 'Create failed.')
      return
    }
    const slug = res.data.slug
    const fresh: Row = {
      id: slug,
      slug,
      name: newDraft.name.trim(),
      categoryId: newDraft.categoryId,
      priceMmk: Number(newDraft.priceMmk) || 0,
      salePriceMmk: newDraft.salePriceMmk.trim() === '' ? null : Number(newDraft.salePriceMmk),
      tagline: newDraft.tagline.trim(),
      description: newDraft.description.trim(),
      swatch: newDraft.swatch,
      stockQty: Number(newDraft.stockQty) || 0,
      lowStockThreshold: Number(newDraft.lowStockThreshold) || 3,
      sortOrder: Number(newDraft.sortOrder) || 0,
      featured: newDraft.featured,
      isActive: newDraft.isActive,
      hasPhotos: false,
      specs: newDraft.specs,
    }
    setRows((rs) => [fresh, ...rs])
    setCreating(false)
    setNewDraft(emptyForm(CATEGORIES[0].id))
    toast('Product created. Open Edit photos to upload images.')
  }

  async function saveRow(id: string) {
    const draft = drafts[id]
    const original = rows.find((r) => r.id === id)
    if (!draft || !original) return

    const errors = validateForm(draft, false, new Set())
    if (errors.length > 0) {
      toast(errors[0]!)
      return
    }

    setSavingRow((m) => ({ ...m, [id]: true }))
    const res = await api(`/api/v1/admin/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(formToBody(draft)),
    })
    setSavingRow((m) => ({ ...m, [id]: false }))
    if (!res.ok) {
      toast(res.error?.message ?? 'Save failed.')
      return
    }

    const updated: Row = {
      ...original,
      name: draft.name.trim(),
      categoryId: draft.categoryId,
      priceMmk: Number(draft.priceMmk) || 0,
      salePriceMmk: draft.salePriceMmk.trim() === '' ? null : Number(draft.salePriceMmk),
      tagline: draft.tagline.trim(),
      description: draft.description.trim(),
      swatch: draft.swatch,
      stockQty: Number(draft.stockQty) || 0,
      lowStockThreshold: Number(draft.lowStockThreshold) || 3,
      sortOrder: Number(draft.sortOrder) || 0,
      featured: draft.featured,
      isActive: draft.isActive,
      specs: draft.specs,
    }
    setRows((rs) => rs.map((r) => (r.id === id ? updated : r)))
    setDrafts((d) => ({ ...d, [id]: rowToForm(updated) }))
    toast('Saved.')
  }

  function markHasPhotos(id: string, hasPhotos: boolean) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, hasPhotos } : r)))
  }

  // Hard-delete attempt. If the product has order history the server returns
  // 409; we fall back to soft-delete by flipping isActive = false. Either way
  // the product disappears from /shop.
  async function deleteRow(id: string) {
    const original = rows.find((r) => r.id === id)
    if (!original) return
    const ok = confirm(
      `Delete "${original.name}"? This removes the catalog row and its R2 photos. ` +
        `Products that have existing orders cannot be hard-deleted - those will be marked inactive instead.`,
    )
    if (!ok) return

    setSavingRow((m) => ({ ...m, [id]: true }))
    const res = await api(`/api/v1/admin/products/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setRows((rs) => rs.filter((r) => r.id !== id))
      setDrafts((d) => {
        const next = { ...d }
        delete next[id]
        return next
      })
      setExpanded((e) => {
        const next = { ...e }
        delete next[id]
        return next
      })
      setSavingRow((m) => ({ ...m, [id]: false }))
      toast('Deleted.')
      return
    }

    if (res.error?.code === 'CONFLICT') {
      // Soft-delete fallback via PATCH isActive = false.
      const patchRes = await api(`/api/v1/admin/products/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
      })
      setSavingRow((m) => ({ ...m, [id]: false }))
      if (patchRes.ok) {
        setRows((rs) => rs.map((r) => (r.id === id ? { ...r, isActive: false } : r)))
        setDrafts((d) => {
          const cur = d[id]
          return cur ? { ...d, [id]: { ...cur, isActive: false } } : d
        })
        toast('Has order history - marked inactive instead.')
      } else {
        toast('Could not mark inactive. Try again.')
      }
      return
    }
    setSavingRow((m) => ({ ...m, [id]: false }))
    toast(res.error?.message ?? `Delete failed (${res.status}).`)
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-end">
        <button
          onClick={() => setCreating((c) => !c)}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-ink px-4 py-2 text-[13px] font-medium text-cream transition-colors hover:bg-accent"
        >
          <Plus size={14} strokeWidth={2} />
          {creating ? 'Close form' : 'New product'}
        </button>
      </div>

      {creating && (
        <article className="rounded-[var(--radius-lg)] border border-line bg-surface p-5 md:p-6">
          <h3 className="font-display text-[18px]">New product</h3>
          <ProductDetailsForm
            values={newDraft}
            onChange={setNewDraft}
            mode="create"
          />
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => {
                setCreating(false)
                setNewDraft(emptyForm(CATEGORIES[0].id))
              }}
              disabled={savingNew}
              className="inline-flex items-center justify-center rounded-[var(--radius-pill)] border border-line bg-cream px-5 py-2 text-[13px] font-medium text-ink hover:border-ink/40 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={createProduct}
              disabled={savingNew}
              className="inline-flex items-center justify-center rounded-[var(--radius-pill)] bg-ink px-6 py-2 text-[13px] font-medium text-cream transition-colors hover:bg-accent disabled:opacity-50"
            >
              {savingNew ? 'Creating…' : 'Create product'}
            </button>
          </div>
        </article>
      )}

      <ul className="divide-y divide-line border-y border-line">
        {rows.map((r) => {
          const isExpanded = expanded[r.id]
          const draft = drafts[r.id]
          const dirty = draft ? formIsDirty(rowToForm(r), draft) : false
          const saving = Boolean(savingRow[r.id])
          return (
            <li key={r.id} className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-display text-[15px]">
                    <Link
                      href={`/product/${r.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-accent"
                    >
                      {r.name}
                    </Link>
                    {!r.isActive && (
                      <span className="rounded-[var(--radius-pill)] bg-line px-2 py-0.5 text-[10px] uppercase tracking-[0.06em] text-muted">
                        inactive
                      </span>
                    )}
                    {r.featured && (
                      <span className="rounded-[var(--radius-pill)] bg-accent/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.06em] text-accent">
                        featured
                      </span>
                    )}
                    {!r.hasPhotos && (
                      <span className="rounded-[var(--radius-pill)] bg-error/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.06em] text-error">
                        no photos
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[12px] text-muted">
                    {r.slug} · {r.categoryId} · {formatMmk(r.priceMmk)}
                    {r.salePriceMmk !== null && ` · sale ${formatMmk(r.salePriceMmk)}`} · stock {r.stockQty}
                  </div>
                </div>
                <div className="flex gap-2 text-[12px]">
                  <button
                    onClick={() => openSection(r.id, 'details')}
                    className={`rounded-[var(--radius-pill)] border px-3 py-1 transition-colors ${
                      isExpanded === 'details'
                        ? 'border-ink bg-ink text-cream'
                        : 'border-line text-ink hover:border-ink/40'
                    }`}
                  >
                    Edit details
                  </button>
                  <button
                    onClick={() => openSection(r.id, 'photos')}
                    className={`rounded-[var(--radius-pill)] border px-3 py-1 transition-colors ${
                      isExpanded === 'photos'
                        ? 'border-ink bg-ink text-cream'
                        : 'border-line text-ink hover:border-ink/40'
                    }`}
                  >
                    Edit photos
                  </button>
                  <button
                    onClick={() => deleteRow(r.id)}
                    disabled={saving}
                    aria-label={`Delete ${r.name}`}
                    className="rounded-[var(--radius-pill)] border border-line p-1.5 text-muted transition-colors hover:border-error/40 hover:text-error disabled:opacity-50"
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                </div>
              </div>

              {isExpanded === 'details' && draft && (
                <div className="mt-4 rounded-[var(--radius)] border border-line bg-surface p-5">
                  <ProductDetailsForm
                    values={draft}
                    onChange={(v) => updateDraft(r.id, v)}
                            mode="edit"
                  />
                  <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    {dirty && <span className="text-[12px] text-muted sm:mr-auto">Unsaved changes.</span>}
                    <button
                      type="button"
                      disabled={!dirty || saving}
                      onClick={() => discardDraft(r.id)}
                      className="inline-flex items-center justify-center rounded-[var(--radius-pill)] border border-line bg-cream px-5 py-2 text-[13px] font-medium text-ink hover:border-ink/40 disabled:opacity-50"
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      disabled={!dirty || saving}
                      onClick={() => saveRow(r.id)}
                      className="inline-flex items-center justify-center rounded-[var(--radius-pill)] bg-ink px-6 py-2 text-[13px] font-medium text-cream transition-colors hover:bg-accent disabled:opacity-50"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              )}

              {isExpanded === 'photos' && (
                <div className="mt-4 rounded-[var(--radius)] border border-line bg-surface p-5">
                  <ProductPhotoGrid
                    productId={r.id}
                    slug={r.slug}
                    swatch={r.swatch}
                    onChange={(hasAny) => markHasPhotos(r.id, hasAny)}
                  />
                </div>
              )}
            </li>
          )
        })}
        {rows.length === 0 && (
          <li className="py-10 text-center text-[14px] text-muted">
            No products yet. Click <strong>+ New product</strong> to add the first one.
          </li>
        )}
      </ul>
    </div>
  )
}

function validateForm(v: ProductFormValues, isCreate: boolean, existingSlugs: Set<string>): string[] {
  const errs: string[] = []
  if (!v.name.trim()) errs.push('Name is required.')
  if (!SLUG_REGEX.test(v.slug)) errs.push('Slug must be lowercase letters, digits, and dashes only.')
  if (isCreate && existingSlugs.has(v.slug)) errs.push('Slug already in use.')
  if (!v.categoryId) errs.push('Pick a category.')
  if (Number(v.priceMmk) < 0 || Number.isNaN(Number(v.priceMmk))) errs.push('Price must be a non-negative number.')
  if (v.salePriceMmk.trim() !== '') {
    const sale = Number(v.salePriceMmk)
    if (Number.isNaN(sale)) {
      errs.push('Sale price must be a number, or blank for no sale.')
    } else if (!isValidSalePrice(Number(v.priceMmk), sale)) {
      errs.push(salePriceMessage(Number(v.priceMmk), sale))
    }
  }
  if (!v.tagline.trim()) errs.push('Tagline is required.')
  if (!v.description.trim()) errs.push('Description is required.')
  if (!/^#[0-9A-Fa-f]{6}$/.test(v.swatch)) errs.push('Swatch must be a 6-digit hex.')
  if (Number(v.stockQty) < 0 || Number.isNaN(Number(v.stockQty))) errs.push('Stock must be a non-negative number.')
  if (Number(v.lowStockThreshold) < 0 || Number.isNaN(Number(v.lowStockThreshold))) errs.push('Low-stock threshold must be a non-negative number.')
  for (const s of v.specs) {
    if (!s.label.trim() || !s.value.trim()) {
      errs.push('Every spec row needs both a label and a value (or remove the row).')
      break
    }
  }
  return errs
}

function formToBody(v: ProductFormValues) {
  return {
    slug: v.slug,
    name: v.name.trim(),
    categoryId: v.categoryId,
    priceMmk: Number(v.priceMmk) || 0,
    salePriceMmk: v.salePriceMmk.trim() === '' ? null : Number(v.salePriceMmk),
    tagline: v.tagline.trim(),
    description: v.description.trim(),
    swatch: v.swatch,
    stockQty: Number(v.stockQty) || 0,
    lowStockThreshold: Number(v.lowStockThreshold) || 3,
    sortOrder: Number(v.sortOrder) || 0,
    isActive: v.isActive,
    featured: v.featured,
    specs: v.specs.map((s) => ({ label: s.label.trim(), value: s.value.trim() })),
  }
}

function formIsDirty(a: ProductFormValues, b: ProductFormValues): boolean {
  if (
    a.name !== b.name ||
    a.slug !== b.slug ||
    a.categoryId !== b.categoryId ||
    a.priceMmk !== b.priceMmk ||
    a.salePriceMmk !== b.salePriceMmk ||
    a.tagline !== b.tagline ||
    a.description !== b.description ||
    a.swatch !== b.swatch ||
    a.stockQty !== b.stockQty ||
    a.lowStockThreshold !== b.lowStockThreshold ||
    a.sortOrder !== b.sortOrder ||
    a.isActive !== b.isActive ||
    a.featured !== b.featured
  ) {
    return true
  }
  if (a.specs.length !== b.specs.length) return true
  for (let i = 0; i < a.specs.length; i++) {
    if (a.specs[i]!.label !== b.specs[i]!.label || a.specs[i]!.value !== b.specs[i]!.value) {
      return true
    }
  }
  return false
}
