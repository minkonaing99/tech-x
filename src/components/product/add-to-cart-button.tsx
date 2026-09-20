'use client'

import { useState } from 'react'
import { ShoppingBag } from 'lucide-react'
import { toast } from 'sonner'
import { useCart } from '@/lib/cart-store'
import { cn } from '@/lib/utils'

interface AddToCartButtonProps {
  productId: string
  productName: string
  disabled?: boolean
}

export function AddToCartButton({ productId, productName, disabled }: AddToCartButtonProps) {
  const add = useCart((s) => s.add)
  const openCart = useCart((s) => s.open)
  const [pending, setPending] = useState(false)

  async function handle() {
    if (disabled || pending) return
    setPending(true)
    const result = await add(productId, 1)
    setPending(false)
    if (result.ok) {
      toast(`Added - ${productName}`, {
        action: { label: 'View cart', onClick: openCart },
      })
    } else {
      toast.error(result.message)
    }
  }

  return (
    <button
      onClick={handle}
      disabled={disabled || pending}
      aria-busy={pending}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-pill)] px-6 py-3.5 text-[14px] font-medium transition-colors',
        disabled
          ? 'cursor-not-allowed bg-line text-muted'
          : 'bg-ink text-cream hover:bg-accent',
        // Dim rather than recolour - flipping to the grey disabled treatment on
        // every click reads as a glitch on a request this short.
        pending && !disabled && 'cursor-wait opacity-70',
      )}
    >
      <ShoppingBag size={16} strokeWidth={1.75} />
      {disabled ? 'Out of stock' : 'Add to cart'}
    </button>
  )
}
