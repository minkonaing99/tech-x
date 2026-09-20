'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import Image from 'next/image'
import { Tile } from '../product/tile'
import { cn } from '@/lib/utils'
import type { Product } from '@/lib/types'

interface WhyProps {
  showcase?: Product
  imageUrl?: string | null
}

const ITEMS = [
  {
    title: 'Curated, not crammed',
    body: 'A short list in each category instead of a wall of options. Aluminium, PBT, wood that is actually wood. If something only looks good in photographs, it does not get a page here.',
  },
  {
    title: 'We try it first',
    body: 'Every board, mouse and mic spends time on a real desk before it is listed. Case flex, stabiliser rattle, a sensor that drifts, a mic that hisses - better we find it than you.',
  },
  {
    title: 'Genuine stock',
    body: 'Sealed boxes with the manufacturer warranty intact, bought through proper channels. No grey-market imports, no refurbished units passed off as new.',
  },
  {
    title: 'Warranty and returns',
    body: 'A factory fault in the first two weeks we settle ourselves - refund or replacement, here in Myanmar. After that we take the warranty claim to the company for you, so you are never chasing a manufacturer overseas on your own.',
  },
] as const

export function Why({ showcase, imageUrl }: WhyProps) {
  const [open, setOpen] = useState(0)

  return (
    <section className="bg-surface py-20 md:py-28">
      <div className="container-prose grid items-start gap-10 md:grid-cols-2 md:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
        >
          {imageUrl ? (
            <div className="relative aspect-square overflow-hidden rounded-[var(--radius)]">
              <Image src={imageUrl} alt="Why Tech X" fill className="object-contain" />
            </div>
          ) : showcase ? (
            <Tile product={showcase} ratio="square" />
          ) : (
            <div className="aspect-square rounded-[var(--radius)] bg-sand" />
          )}
          {!imageUrl && showcase && (
            <p className="mt-4 max-w-[36ch] text-[13px] text-muted">
              The {showcase.name} - one of the pieces we keep on the shelf.
            </p>
          )}
        </motion.div>

        <div>
          <div className="eyebrow">Why Tech X</div>
          <h2 className="mt-3 font-display text-[36px] leading-[1.05] text-ink md:text-[44px]">
            Technology, made clear.
          </h2>
          <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-ink-soft">
            Keyboards, mice, monitors, audio and accessories, selected for everyday use.
            Clear specifications, practical choices and support when you need it.
          </p>

          <ul className="mt-8 divide-y divide-line border-y border-line">
            {ITEMS.map((it, i) => {
              const expanded = open === i
              return (
                <li key={it.title}>
                  <button
                    onClick={() => setOpen(expanded ? -1 : i)}
                    aria-expanded={expanded}
                    className="flex w-full items-center justify-between gap-4 py-5 text-left"
                  >
                    <span
                      className={cn(
                        'font-display text-[20px] transition-colors',
                        expanded ? 'text-ink' : 'text-ink-soft',
                      )}
                    >
                      {it.title}
                    </span>
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cream text-ink-soft">
                      {expanded ? <Minus size={14} /> : <Plus size={14} />}
                    </span>
                  </button>
                  <div
                    className={cn(
                      'grid transition-[grid-template-rows] duration-300 ease-out',
                      expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="pb-5 pr-10 text-[14px] leading-relaxed text-ink-soft">{it.body}</p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
