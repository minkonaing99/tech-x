import type { Product, Spec } from './types'

export interface CompareRow {
  readonly label: string
  /** The value on the left product, or null when it does not carry the label. */
  readonly a: string | null
  readonly b: string | null
}

/**
 * The two spec lists merged into one set of rows.
 *
 * `product_specs` is free-form label/value, so two products in the same
 * category routinely describe different things - one mouse lists `Polling
 * rate`, the other does not. The union keeps every label from both sides and
 * lets the missing half render as absent, which is honest about what the shop
 * actually knows. Dropping to the intersection instead would empty the table
 * for most pairs.
 *
 * Order follows A, then B's leftovers, because A is the product the customer
 * came from and its `sort_order` is what the admin arranged.
 */
export function compareRows(a: readonly Spec[], b: readonly Spec[]): readonly CompareRow[] {
  const bValues = firstByLabel(b)
  const seen = new Set<string>()
  const rows: CompareRow[] = []

  for (const spec of a) {
    if (seen.has(spec.label)) continue
    seen.add(spec.label)
    rows.push({ label: spec.label, a: spec.value, b: bValues.get(spec.label) ?? null })
  }

  for (const spec of b) {
    if (seen.has(spec.label)) continue
    seen.add(spec.label)
    rows.push({ label: spec.label, a: null, b: spec.value })
  }

  return rows
}

/** First value wins, so a label entered twice does not produce two rows. */
function firstByLabel(specs: readonly Spec[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const spec of specs) {
    if (!map.has(spec.label)) map.set(spec.label, spec.value)
  }
  return map
}

/**
 * Whether these two products may be compared at all.
 *
 * The slugs arrive in a query string, so they are whatever someone typed. A
 * product against itself is a table of duplicated columns, and a mouse against
 * a monitor is a table of nothing but absences - neither is worth rendering.
 */
export function isComparablePair(
  a: Product | undefined,
  b: Product | undefined,
): boolean {
  if (!a || !b) return false
  if (a.slug === b.slug) return false
  return a.category === b.category
}
