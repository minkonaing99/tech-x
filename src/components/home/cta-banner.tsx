'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
export function CTABanner() {
  return (
    <section className="container-prose py-16 md:py-24">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-dark-bg)] text-[var(--color-dark-ink)]"
      >
        <div className="grid items-center gap-8 p-8 md:grid-cols-[1.2fr_1fr] md:gap-12 md:p-14">
          <div>
            <div className="text-[11px] tracking-[0.14em] uppercase text-cream/55">
              Need help choosing?
            </div>
            <h2 className="mt-3 font-display text-[34px] leading-[1.05] md:text-[48px]">
              Find the right gear{' '}
              <em className="font-semibold not-italic text-[var(--color-accent-soft)]">
                for you.
              </em>
            </h2>
            <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-cream/75">
              Tell us your budget, what you use and what you want to improve. We will help narrow it down.
            </p>
            <Link
              href="/contact"
              className="mt-6 inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--color-accent)] px-6 py-3 text-[14px] font-medium text-cream transition-colors hover:bg-[var(--color-accent-soft)] hover:text-ink"
            >
              Talk to Tech X
              <ArrowRight size={16} strokeWidth={1.75} />
            </Link>
          </div>

          <dl className="divide-y divide-white/15">
            <div className="py-6">
              <dt className="font-display text-[22px]">Your budget</dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-cream/75">What you want to spend, so we can focus on what fits.</dd>
            </div>
            <div className="py-6">
              <dt className="font-display text-[22px]">Your setup</dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-cream/75">What you already use for work, gaming or everyday tasks.</dd>
            </div>
            <div className="py-6">
              <dt className="font-display text-[22px]">Your priorities</dt>
              <dd className="mt-2 text-[14px] leading-relaxed text-cream/75">Comfort, sound, portability or performance. Tell us what matters most.</dd>
            </div>
          </dl>
        </div>
      </motion.div>
    </section>
  )
}
