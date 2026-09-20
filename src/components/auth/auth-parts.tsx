import type { ReactNode } from 'react'
import { Eye, EyeOff, TriangleAlert } from 'lucide-react'

/** Shared button shape, so the two stacked CTAs never disagree on size. */
export const authButton =
  'inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-[var(--radius-pill)] text-[14px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55'

export const authButtonPrimary = 'bg-ink text-cream hover:bg-accent'

export const authButtonQuiet =
  'border border-line bg-surface text-ink hover:border-ink/25 hover:bg-cream'

/**
 * Auth failures stay on screen. A toast is the wrong carrier here: it expires
 * while the customer is still reading the form it refers to, and the reason
 * they could not sign in is the one message they need to keep.
 */
export function AuthAlert({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="mb-5 flex items-start gap-2.5 rounded-[var(--radius)] border border-error/30 bg-error/[0.06] px-3.5 py-3 text-[13px] leading-[1.5] text-error"
    >
      <TriangleAlert className="mt-px h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
      <span>{children}</span>
    </div>
  )
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="my-6 flex items-center gap-4" aria-hidden>
      <span className="h-px flex-1 bg-line" />
      <span className="text-[11px] tracking-[0.14em] text-muted uppercase">{label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

interface PasswordToggleProps {
  revealed: boolean
  onToggle: () => void
}

/**
 * Typed-password verification. A customer who cannot see what they typed on a
 * phone keyboard retries blind, which is what the rate limiter counts.
 */
export function PasswordToggle({ revealed, onToggle }: PasswordToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={revealed ? 'Hide password' : 'Show password'}
      aria-pressed={revealed}
      className="rounded-[var(--radius-sm)] p-2 text-muted transition-colors hover:text-ink"
    >
      {revealed ? (
        <EyeOff className="h-4 w-4" strokeWidth={1.5} aria-hidden />
      ) : (
        <Eye className="h-4 w-4" strokeWidth={1.5} aria-hidden />
      )}
    </button>
  )
}

export function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="h-[18px] w-[18px]" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  )
}
