'use client'

import { motion } from 'framer-motion'

const STATS = [
  { value: 'Genuine', label: 'real stock, manufacturer warranty on every product' },
  { value: '2 weeks', label: 'factory fault? we refund or replace it ourselves' },
  { value: 'Nationwide', label: 'delivery from Mandalay, across Myanmar' },
] as const

export function Stats() {
  return (
    <section className="container-prose border-y border-line py-12 md:py-14">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-10"
      >
        {STATS.map((s) => (
          <div key={s.label} className="flex flex-col items-start sm:items-center sm:text-center">
            <span className="font-display text-[28px] leading-[1.1] tracking-[-0.01em] text-ink md:text-[34px]">
              {s.value}
            </span>
            <span className="mt-3 max-w-[24ch] text-[13px] leading-relaxed text-muted">
              {s.label}
            </span>
          </div>
        ))}
      </motion.div>
    </section>
  )
}
