import { CATEGORIES } from '@/lib/categories'

/**
 * Placeholder for `GridControls` while the catalog query resolves.
 *
 * Every box mirrors the real element's box: same grid, same gaps, same square
 * tile, same type sizes in the caption block. A skeleton that does not match
 * its content is worse than none, because the page jumps the moment data
 * lands. The filter chips are drawn from the same `CATEGORIES` constant the
 * real bar renders, so that row is pixel-identical rather than approximated.
 */
export function ShopGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading products">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <div className="flex flex-wrap items-center gap-1.5" aria-hidden>
          <div className="skeleton h-[31px] w-[52px] rounded-[var(--radius-pill)]" />
          {CATEGORIES.map((c) => (
            <div
              key={c.id}
              className="skeleton h-[31px] rounded-[var(--radius-pill)]"
              // Chip width tracks the label it stands in for, so the row does
              // not reflow when the real chips arrive.
              style={{ width: `${c.name.length * 7.5 + 28}px` }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2" aria-hidden>
          <div className="skeleton h-[16px] w-[24px] rounded-[var(--radius-sm)]" />
          <div className="skeleton h-[31px] w-[104px] rounded-[var(--radius-pill)]" />
        </div>
      </div>

      <div className="mt-6 h-[20px] w-[88px] skeleton rounded-[var(--radius-sm)]" aria-hidden />

      <div
        className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2 md:gap-10 lg:grid-cols-3"
        aria-hidden
      >
        {Array.from({ length: count }, (_, i) => (
          <article key={i}>
            <div className="skeleton aspect-square rounded-[var(--radius)]" />
            <div className="mt-3 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="skeleton h-[12px] w-[64px] rounded-[var(--radius-sm)]" />
                <div className="skeleton mt-2 h-[18px] w-[72%] rounded-[var(--radius-sm)]" />
                <div className="skeleton mt-2 h-[13px] w-[52%] rounded-[var(--radius-sm)]" />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <div className="skeleton h-[15px] w-[76px] rounded-[var(--radius-sm)]" />
                <div className="skeleton h-9 w-9 rounded-full" />
              </div>
            </div>
          </article>
        ))}
      </div>

      <span className="sr-only">Loading products</span>
    </div>
  )
}
