import { r2PublicUrl } from './cdn'
import type { CategoryId } from './categories'

export type { CategoryId }

export interface Spec {
  readonly label: string
  readonly value: string
}

export interface Product {
  readonly id: string
  readonly slug: string
  readonly name: string
  readonly category: CategoryId
  /** Whole MMK units (no subunit). */
  readonly price: number
  /**
   * Sale price, or null when the product is not discounted. Required rather
   * than optional on purpose: every hand-built `Product` has to declare it, so
   * the compiler finds a mapping site that forgot instead of silently pricing
   * that surface at full price.
   */
  readonly salePrice: number | null
  readonly tagline: string
  readonly description: string
  readonly specs: readonly Spec[]
  readonly swatch: string
  readonly inStock: boolean
  readonly hasPhotos: boolean
  readonly featured?: boolean
  /** Display order; lower shows first. */
  readonly sortOrder?: number
  readonly stockQty?: number
  readonly lowStockThreshold?: number
  readonly createdAt: string
  readonly updatedAt: string
}

export const PHOTO_SLOTS = ['01', '02', '03', '04'] as const
export type PhotoSlot = (typeof PHOTO_SLOTS)[number]

/**
 * Where product photos are served from: the public R2 bucket's `products/`
 * prefix, or `/products` when no CDN is configured for local dev.
 *
 * Built through `r2PublicUrl` rather than re-reading the env var, which is
 * what this file used to do - two copies of the same trailing-slash strip,
 * either of which could be fixed without the other.
 */
export const PHOTO_BASE = r2PublicUrl('products') ?? '/products'


export const QTY_MIN = 1
export const QTY_MAX = 99
export const SEARCH_QUERY_MAX = 200
