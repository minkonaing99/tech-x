'use client'

import Link from 'next/link'
import Image from 'next/image'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Tile } from '../product/tile'
import { cn } from '@/lib/utils'
import { SaleBadge } from '@/components/product/sale-badge'
import { Price } from '@/components/product/price'
import { PHOTO_BASE, type Product } from '@/lib/types'
import { CATEGORY_NAME } from '@/lib/categories'

const EASE = [0.16, 1, 0.3, 1] as const

interface HeroProps {
  featured: readonly Product[]
}

export function Hero({ featured }: HeroProps) {
  const [active, setActive] = useState(0)
  const items = featured.slice(0, 4)
  const hero = items[0]
  if (!hero) return null
  const current = items[active] ?? hero

  return (
    <section className="container-prose pt-10 pb-14 md:pt-16 md:pb-20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="grid items-center gap-10 md:grid-cols-[1.05fr_1fr] md:gap-14"
      >
        <div>
          <h1 className="font-display text-[44px] leading-[1.05] tracking-[-0.015em] text-balance text-ink md:text-[68px] md:leading-[1.02]">
            Upgrade your{' '}
            <em className="font-semibold not-italic text-accent">
              everyday.
            </em>
          </h1>
          <p className="mt-5 max-w-[44ch] text-[16px] leading-relaxed text-ink-soft md:text-[17px]">
            Mechanical keyboards, wireless mice, and desk audio - headsets, USB mics, speakers - plus
            the small things around them: keycaps, pads, cables, stands. Everything a working desk
            needs, in one shop.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-ink px-6 py-3 text-[14px] font-medium text-cream transition-colors hover:bg-accent"
            >
              Visit the shop
              <ArrowRight size={16} strokeWidth={1.75} />
            </Link>
            <Link
              href={`/product/${current.slug}`}
              className="inline-flex items-center gap-2 text-[14px] font-medium text-ink underline underline-offset-[6px] decoration-[1.5px] hover:text-accent"
            >
              See the {current.name}
            </Link>
          </div>
        </div>

        <Showcase items={items} active={active} onSelect={setActive} />
      </motion.div>
    </section>
  )
}

interface ShowcaseProps {
  items: readonly Product[]
  active: number
  onSelect: (i: number) => void
}

function Showcase({ items, active, onSelect }: ShowcaseProps) {
  const reduce = useReducedMotion()
  const current = items[active]
  if (!current) return null
  const fade = { duration: reduce ? 0 : 0.35, ease: EASE }

  return (
    <div>
      <div
        className="relative aspect-square overflow-hidden rounded-[var(--radius-lg)] ring-1 ring-ink/5 shadow-[var(--shadow-lg)]"
        style={{ background: current.swatch }}
      >
        {/* Crossfade: each product gets its own absolutely positioned layer.
            The outgoing layer fades to 0 over the incoming one, so there is
            never a visible gap or a stacked half-loaded photo. */}
        <AnimatePresence initial={false}>
          <motion.div
            key={current.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
            className="absolute inset-0"
          >
            <Tile
              product={current}
              ratio="square"
              useThumb={false}
              priority
              showLabel={false}
              sizes="(min-width: 768px) 46vw, 92vw"
              className="absolute inset-0 rounded-none"
            />
          </motion.div>
        </AnimatePresence>

        <Caption product={current} transition={fade} />
      </div>

      {items.length > 1 && (
        <div className="mt-4 flex gap-3 md:mt-5 md:gap-3.5">
          {items.map((p, i) => (
            <Thumb
              key={p.id}
              product={p}
              selected={i === active}
              onSelect={() => onSelect(i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface CaptionProps {
  product: Product
  transition: { duration: number; ease: typeof EASE }
}

/** Glass strip inside the frame - keeps the panel readable over any photo. */
function Caption({ product, transition }: CaptionProps) {
  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-3 md:inset-x-4 md:bottom-4">
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={product.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={transition}
          className="flex items-end justify-between gap-3 rounded-[var(--radius)] bg-white/50 px-4 py-3 shadow-[0_8px_24px_rgba(11,15,20,0.08)] backdrop-blur-xl backdrop-saturate-150"
        >
          <div className="min-w-0">
            <div className="eyebrow">{CATEGORY_NAME[product.category]}</div>
            <div className="mt-0.5 truncate font-display text-[17px] leading-tight text-ink">
              {product.name}
            </div>
          </div>
          <span className="flex shrink-0 flex-col items-end gap-1">
            <SaleBadge priceMmk={product.price} salePriceMmk={product.salePrice} size="sm" />
            <Price priceMmk={product.price} salePriceMmk={product.salePrice} />
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

interface ThumbProps {
  product: Product
  selected: boolean
  onSelect: () => void
}

function Thumb({ product, selected, onSelect }: ThumbProps) {
  // `hasPhotos` is a DB hint; the file can still be missing. Fall back to the
  // swatch instead of leaving a broken image box.
  const [failed, setFailed] = useState(false)
  const showImage = product.hasPhotos && !failed

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Show ${product.name}`}
      className={cn(
        'relative size-14 shrink-0 overflow-hidden rounded-[10px] md:size-16',
        'transition duration-200 ease-out',
        selected
          ? 'ring-2 ring-accent ring-offset-2 ring-offset-cream shadow-[var(--shadow-md)]'
          : 'opacity-70 ring-1 ring-ink/10 hover:-translate-y-0.5 hover:opacity-100 hover:shadow-[var(--shadow-md)]',
      )}
      style={{ background: product.swatch }}
    >
      {showImage && (
        <Image
          src={`${PHOTO_BASE}/${product.slug}/01-thumb.webp`}
          alt=""
          fill
          sizes="64px"
          className="object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </button>
  )
}
