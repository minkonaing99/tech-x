'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { timeAgo } from '@/lib/relative-time'

/** Re-reads the server components on tab focus, plus a manual button. */
export function RefreshBar() {
  const router = useRouter()
  const [loadedAt, setLoadedAt] = useState(() => new Date().toISOString())
  const [label, setLabel] = useState('just now')

  const refresh = useCallback(() => {
    router.refresh()
    setLoadedAt(new Date().toISOString())
  }, [router])

  useEffect(() => {
    function onFocus() {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('visibilitychange', onFocus)
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('focus', onFocus)
    }
  }, [refresh])

  // Ticking the label is display-only - no fetching happens here.
  useEffect(() => {
    setLabel(timeAgo(loadedAt))
    const id = setInterval(() => setLabel(timeAgo(loadedAt)), 30_000)
    return () => clearInterval(id)
  }, [loadedAt])

  return (
    <div className="flex items-center gap-3 text-[12px] text-muted">
      <span>updated {label}</span>
      <button
        type="button"
        onClick={refresh}
        className="rounded-[var(--radius-pill)] border border-line px-3 py-1.5 text-ink-soft transition-colors hover:border-ink/30 hover:text-ink"
      >
        Refresh
      </button>
    </div>
  )
}
