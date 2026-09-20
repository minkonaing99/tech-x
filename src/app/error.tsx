'use client'

import Link from 'next/link'
import { useEffect } from 'react'

/**
 * Catches anything a page or its queries throw. Without this file Next shows
 * its own bare error screen in production, which loses the brand entirely and
 * gives the customer no way forward.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // ponytail: console only. Wire a real reporter here if you ever add one.
    console.error(error)
  }, [error])

  return (
    <section className="container-prose py-24 text-center md:py-32">
      <div className="eyebrow">Something broke</div>
      <h1 className="mt-3 font-display text-[44px] leading-[1.05] text-ink md:text-[60px]">
        That did not load.
      </h1>
      <p className="mx-auto mt-4 max-w-[44ch] text-[15px] text-ink-soft">
        A fault on our side, not yours. Try again - if it keeps happening, message us and quote the
        code below.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center rounded-[var(--radius-pill)] bg-ink px-6 py-3 text-[14px] font-medium text-cream transition-colors hover:bg-accent"
        >
          Try again
        </button>
        <Link
          href="/contact"
          className="text-[14px] font-medium text-ink underline underline-offset-[6px] hover:text-accent"
        >
          Message us
        </Link>
      </div>

      {error.digest && (
        <p className="mt-6 font-mono text-[12px] text-muted">Reference {error.digest}</p>
      )}
    </section>
  )
}
