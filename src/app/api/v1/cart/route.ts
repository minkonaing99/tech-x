import { NextResponse } from 'next/server'
import { ok } from '@/lib/api-response'
import { getCartLines } from '@/lib/cart-session'
import { cartSubtotal } from '@/lib/pricing'

export async function GET(): Promise<NextResponse> {
  const lines = await getCartLines()
  const subtotal = cartSubtotal(lines)
  return ok({ items: lines, subtotal })
}
