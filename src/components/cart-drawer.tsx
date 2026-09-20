'use client'

import Link from 'next/link'
import Image from 'next/image'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Minus, Plus, Trash2 } from 'lucide-react'
import { useCart, useCartSubtotal } from '@/lib/cart-store'
import { lineProblem } from '@/lib/cart-availability'
import { LineProblemBadge } from '@/components/cart/line-problem-badge'
import { formatMmk } from '@/lib/money'
import { cartSavings } from '@/lib/pricing'
import { Price } from '@/components/product/price'
import { useEffect } from 'react'
import { PHOTO_BASE } from '@/lib/types'
import { cn } from '@/lib/utils'

export function CartDrawer() {
  const isOpen = useCart((s) => s.isOpen)
  const items = useCart((s) => s.items)
  const close = useCart((s) => s.close)
  const setQty = useCart((s) => s.setQty)
  const remove = useCart((s) => s.remove)
  const subtotal = useCartSubtotal()
  const savings = cartSavings(items)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, close])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            className="fixed inset-0 z-50 bg-ink/30"
            aria-hidden
          />
          <motion.aside
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-0 right-0 z-50 flex h-full w-full max-w-[440px] flex-col bg-surface shadow-[var(--shadow-lg)]"
            role="dialog"
            aria-modal="true"
            aria-label="Cart"
          >
            <header className="flex items-center justify-between border-b border-line px-6 py-5">
              <div>
                <div className="eyebrow">Cart</div>
                <h2 className="mt-1 font-display text-[24px]">Your selection</h2>
              </div>
              <button
                onClick={close}
                aria-label="Close cart"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-soft hover:bg-line"
              >
                <X size={18} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <p className="font-display text-[22px]">Your cart is empty.</p>
                  <p className="mt-2 max-w-[28ch] text-[14px] text-muted">
                    Browse the shop to find something worth carrying home.
                  </p>
                  <Link
                    href="/shop"
                    onClick={close}
                    className="mt-6 text-[14px] font-medium text-accent underline underline-offset-4"
                  >
                    Visit the shop
                  </Link>
                </div>
              ) : (
                <ul className="space-y-5">
                  {items.map((item) => {
                    const p = item.product
                    const problem = lineProblem(item)
                    const atStockCeiling = item.qty >= p.stockQty
                    return (
                      <li key={p.id} className="flex gap-4">
                        <div
                          className={cn(
                            'relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-[var(--radius)]',
                            problem && 'opacity-45 grayscale',
                          )}
                          style={{ background: p.swatch }}
                        >
                          {p.hasPhotos && (
                            <Image
                              src={`${PHOTO_BASE}/${p.slug}/01.webp`}
                              alt={p.name}
                              fill
                              sizes="88px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="flex flex-1 flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              href={`/product/${p.slug}`}
                              onClick={close}
                              className="font-display text-[16px] leading-tight hover:text-accent"
                            >
                              {p.name}
                            </Link>
                            <button
                              onClick={() => remove(p.id)}
                              aria-label={`Remove ${p.name}`}
                              className="text-muted hover:text-error"
                            >
                              <Trash2 size={14} strokeWidth={1.5} />
                            </button>
                          </div>
                          {problem ? (
                            <LineProblemBadge problem={problem} className="mt-1 self-start" />
                          ) : (
                            <p className="mt-0.5 text-[12px] text-muted line-clamp-1">{p.tagline}</p>
                          )}
                          <div className="mt-auto flex items-center justify-between pt-3">
                            <div className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-line bg-cream px-1.5 py-1">
                              <button
                                onClick={() => setQty(p.id, item.qty - 1)}
                                aria-label="Decrease qty"
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full text-ink-soft hover:bg-line"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="min-w-[1ch] text-center text-[13px] tabular-nums">
                                {item.qty}
                              </span>
                              {/*
                                Capped rather than left to fail. The route now
                                refuses a quantity above stock, so an uncapped
                                "+" is a button that looks live and answers
                                with an error.
                              */}
                              <button
                                onClick={() => setQty(p.id, item.qty + 1)}
                                disabled={atStockCeiling}
                                aria-label="Increase qty"
                                className={cn(
                                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-ink-soft',
                                  atStockCeiling
                                    ? 'cursor-not-allowed opacity-40'
                                    : 'hover:bg-line',
                                )}
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                            <Price
                              priceMmk={p.priceMmk * item.qty}
                              salePriceMmk={
                                p.salePriceMmk === null ? null : p.salePriceMmk * item.qty
                              }
                              size="text-[14px]"
                            />
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <footer className="border-t border-line px-6 py-5">
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-muted">Subtotal</span>
                  <span className="price text-[18px]">{formatMmk(subtotal)}</span>
                </div>
                {savings > 0 && (
                  <div className="mt-1 flex items-center justify-between text-[13px]">
                    <span className="text-muted">You save</span>
                    <span className="price text-[var(--color-accent)]">-{formatMmk(savings)}</span>
                  </div>
                )}
                <p className="mt-1 text-[12px] text-muted">
                  Shipping coordinated after order confirmation.
                </p>
                <Link
                  href="/cart"
                  onClick={close}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-[var(--radius-pill)] bg-ink py-3 text-[14px] font-medium text-cream transition-colors hover:bg-accent"
                >
                  View cart
                </Link>
              </footer>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
