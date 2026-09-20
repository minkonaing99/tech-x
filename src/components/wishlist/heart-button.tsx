'use client'

import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import { useWishlist } from '@/lib/wishlist-store'
import { cn } from '@/lib/utils'

interface HeartButtonProps {
  productId: string
  productName: string
  size?: 'sm' | 'md'
}

export function HeartButton({ productId, productName, size = 'md' }: HeartButtonProps) {
  const has = useWishlist((s) => s.ids.has(productId))
  const add = useWishlist((s) => s.add)
  const remove = useWishlist((s) => s.remove)

  function toggle() {
    if (has) {
      remove(productId)
      toast(`Removed - ${productName}`)
    } else {
      add(productId)
      toast(`Saved - ${productName}`)
    }
  }

  const dim = size === 'sm' ? 'h-9 w-9' : 'h-[52px] w-[52px]'
  const icon = size === 'sm' ? 16 : 18

  return (
    <button
      onClick={toggle}
      aria-label={has ? `Remove ${productName} from wishlist` : `Save ${productName} to wishlist`}
      aria-pressed={has}
      className={cn(
        'inline-flex items-center justify-center rounded-full border transition-colors',
        dim,
        has
          ? 'border-accent bg-accent/10 text-accent'
          : 'border-line bg-cream text-ink-soft hover:border-ink/40 hover:text-accent',
      )}
    >
      <Heart size={icon} strokeWidth={1.5} className={has ? 'fill-current' : ''} />
    </button>
  )
}
