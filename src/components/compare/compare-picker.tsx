import Link from 'next/link'
import { Columns2 } from 'lucide-react'
import type { Product } from '@/lib/types'

interface ComparePickerProps {
  /** Stays on the left of every link this renders. */
  current: Product
  others: readonly Product[]
  label: string
}

/**
 * A native disclosure, dressed as a secondary action, holding one link per
 * rival product in the category.
 *
 * A `<select>` would be shorter, but it would also make the product page a
 * client component for the sake of a menu, and its options would not be links -
 * no middle-click, no crawl, nothing without JavaScript. `<details>` gives the
 * same affordance for free.
 *
 * It reads as a button rather than a section heading because it sits in the
 * product page's action row next to Add to cart. Shaped as a spec-sheet
 * accordion at the foot of the page instead, nobody found it.
 *
 * Renders nothing when the category holds no other product, which is most
 * categories in a young catalog. A disabled control there would read as broken.
 */
export function ComparePicker({ current, others, label }: ComparePickerProps) {
  if (others.length === 0) return null

  return (
    <details className="group relative inline-block">
      <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-[var(--radius-pill)] border border-line bg-cream px-6 py-3.5 text-[14px] font-medium text-ink transition-colors hover:border-ink/40 group-open:border-ink/40 [&::-webkit-details-marker]:hidden">
        <Columns2 size={16} strokeWidth={1.75} />
        {label}
        <span className="rounded-[var(--radius-pill)] bg-line px-2 py-0.5 text-[11px] font-normal text-ink-soft">
          {others.length}
        </span>
      </summary>

      <div className="absolute left-0 z-20 mt-2 max-h-[288px] w-[264px] overflow-auto rounded-[var(--radius)] border border-line bg-cream p-1.5 shadow-[var(--shadow-md)]">
        <p className="px-3 pt-2 pb-1 text-[11px] tracking-[0.12em] uppercase text-muted">
          Compare {current.name} with
        </p>
        <ul>
          {others.map((p) => (
            <li key={p.id}>
              <Link
                href={`/compare?a=${encodeURIComponent(current.slug)}&b=${encodeURIComponent(p.slug)}`}
                className="block rounded-[var(--radius)] px-3 py-2.5 text-[14px] text-ink-soft transition-colors hover:bg-line/50 hover:text-ink"
              >
                {p.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </details>
  )
}
