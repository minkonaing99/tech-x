/**
 * The shop's categories, in display order.
 *
 * Deliberately code and not a database table. The set is fixed: the shop sells
 * these five things and adding a sixth is a product decision that ships with a
 * deploy anyway. Keeping them here buys a real union type for `Product.category`,
 * removes a join from every catalog read, and means the admin category picker
 * cannot offer something the storefront has no page for.
 *
 * There is no `categories` table and therefore no foreign key behind
 * `products.category_id`. `categoryIdSchema` is what enforces the reference, at
 * the admin write boundary.
 */
export interface CategoryDef {
  readonly id: string
  readonly name: string
  readonly description: string
}

export const CATEGORIES = [
  {
    id: 'keyboards',
    name: 'Keyboards',
    description:
      'Mechanical, low-profile and hot-swap boards. Quiet enough to type on all day, quick enough to play on.',
  },
  {
    id: 'mice',
    name: 'Mice',
    description:
      'Featherweight esports shells and full-size workhorses. Honest shapes, sensors that hold their aim.',
  },
  {
    id: 'monitors',
    name: 'Monitors',
    description:
      'Panels for long sessions. Colour that holds, refresh that keeps up, stands that actually adjust.',
  },
  {
    id: 'audio',
    name: 'Audio',
    description:
      'Headsets, desktop mics, and compact desk speakers, tuned for voices first, music close behind.',
  },
  {
    id: 'accessories',
    name: 'Accessories',
    description: 'Mats, wrist rests, and the small things that finish a desk.',
  },
] as const satisfies readonly CategoryDef[]

export type CategoryId = (typeof CATEGORIES)[number]['id']

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as readonly CategoryId[]

export const CATEGORY_NAME = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.name]),
) as Record<CategoryId, string>

export function getCategory(id: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.id === id)
}

export function isCategoryId(id: string): id is CategoryId {
  return CATEGORIES.some((c) => c.id === id)
}
