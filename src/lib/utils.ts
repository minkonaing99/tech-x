import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// Price formatting lives in src/lib/money.ts (formatMmk).

export function clampQty(qty: number, min: number, max: number): number {
  if (!Number.isFinite(qty)) return min
  const n = Math.floor(qty)
  if (n < min) return min
  if (n > max) return max
  return n
}
