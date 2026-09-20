'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, ShoppingBag, Menu, X, User } from 'lucide-react'
import { useCart, useCartCount } from '@/lib/cart-store'
import { CATEGORIES } from '@/lib/categories'
import { cn } from '@/lib/utils'

export function Nav() {
  const open = useCart((s) => s.open)
  const count = useCartCount()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/85 backdrop-blur-md">
      <div className="container-prose flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2" aria-label="Tech X home">
          <Image src="/brand/wordmark-color.png" alt="Tech X" width={128} height={38} className="h-auto w-32 shrink-0" priority />
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <Link href="/shop" className="text-[14px] hover:text-accent">
            Shop
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href={`/shop/${c.id}`}
              className="text-[14px] text-ink-soft hover:text-accent"
            >
              {c.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Link
            href="/search"
            aria-label="Search"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-soft hover:bg-line"
          >
            <Search size={18} strokeWidth={1.5} />
          </Link>
          <Link
            href="/account"
            aria-label="Account"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-soft hover:bg-line"
          >
            <User size={18} strokeWidth={1.5} />
          </Link>
          <button
            onClick={open}
            aria-label={`Cart with ${count} ${count === 1 ? 'item' : 'items'}`}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-soft hover:bg-line"
          >
            <ShoppingBag size={18} strokeWidth={1.5} />
            {count > 0 && (
              /*
               * Keyed on the count so each change remounts and replays the pop -
               * this is the cue that says *where* the item went. Announcing is
               * left to the live region below, which survives the remount.
               */
              <motion.span
                key={count}
                initial={{ scale: 0.6 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-cream"
                aria-hidden
              >
                {count}
              </motion.span>
            )}
          </button>
          {/*
            Every cart mutation lands here, including the drawer's own qty and
            remove buttons, which raise no toast. Rendered unconditionally - a
            live region that appears at the same moment as its text is usually
            not announced at all.
          */}
          <span className="sr-only" aria-live="polite">
            {count === 0 ? 'Cart empty' : `${count} ${count === 1 ? 'item' : 'items'} in cart`}
          </span>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
            className="ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-soft hover:bg-line md:hidden"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          'border-t border-line md:hidden',
          mobileOpen ? 'block' : 'hidden',
        )}
      >
        <nav className="container-prose flex flex-col gap-1 py-3">
          <Link href="/shop" className="rounded px-2 py-2 text-[15px] hover:bg-line">
            Shop all
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href={`/shop/${c.id}`}
              className="rounded px-2 py-2 text-[15px] text-ink-soft hover:bg-line"
              onClick={() => setMobileOpen(false)}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
