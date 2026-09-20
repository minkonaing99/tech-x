import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface AuthShellProps {
  eyebrow: string
  title: string
  intro?: ReactNode
  /** Confirmation states read better centred; forms do not. */
  centered?: boolean
  children: ReactNode
}

/**
 * The column every auth page sits in.
 *
 * Deliberately not `container-prose`: that utility is declared after Tailwind's
 * own in `globals.css`, so its `max-width: 1280px` beats any `max-w-*` class
 * set alongside it. These pages need a narrow measure, so they own the width.
 */
export function AuthShell({ eyebrow, title, intro, centered = false, children }: AuthShellProps) {
  return (
    <section
      className={cn(
        'mx-auto w-full max-w-[26rem] px-5 py-14 sm:py-20 lg:py-24',
        centered && 'text-center',
      )}
    >
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-2.5 font-display text-[36px] leading-[1.05] tracking-[-0.015em] sm:text-[40px]">
        {title}
      </h1>
      {intro ? (
        <p className="mt-3 text-[15px] leading-[1.55] text-ink-soft">{intro}</p>
      ) : null}
      <div className="mt-8">{children}</div>
    </section>
  )
}
