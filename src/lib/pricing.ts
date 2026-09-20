/**
 * Every price the customer is shown and every price they are charged comes from
 * this file. The subtotal reduction used to be copy-pasted across the cart
 * routes, the checkout page and the order writer; a sale price turned that
 * duplication from harmless into a way for the cart to display one number while
 * the order charged another.
 *
 * No `server-only`: the cart page and drawer are client components and need the
 * same arithmetic the order writer uses.
 */

/** The shape both `CartLine` definitions already satisfy structurally. */
export interface PricedLine {
  readonly qty: number
  readonly product: {
    readonly priceMmk: number
    readonly salePriceMmk: number | null
  }
}

/**
 * The single predicate behind both the badge and the charge. A stored sale
 * price that is not below the normal price is not a sale - the admin routes
 * reject those, and this makes a row that slipped through charge the listed
 * price rather than the higher one.
 */
export function isOnSale(priceMmk: number, salePriceMmk: number | null): boolean {
  return salePriceMmk !== null && salePriceMmk < priceMmk
}

export function effectiveUnitPrice(priceMmk: number, salePriceMmk: number | null): number {
  return isOnSale(priceMmk, salePriceMmk) ? (salePriceMmk as number) : priceMmk
}

/** Floored, so the badge never advertises a bigger discount than was given. */
export function discountPercent(priceMmk: number, salePriceMmk: number | null): number {
  if (!isOnSale(priceMmk, salePriceMmk) || priceMmk <= 0) return 0
  return Math.floor(((priceMmk - (salePriceMmk as number)) / priceMmk) * 100)
}

/** The admin write rule. `null` clears the sale; anything else must discount. */
export function isValidSalePrice(priceMmk: number, salePriceMmk: number | null): boolean {
  if (salePriceMmk === null) return true
  return salePriceMmk >= 0 && salePriceMmk < priceMmk
}

/** Paired with `isValidSalePrice` so both admin routes refuse in one voice. */
export function salePriceMessage(priceMmk: number, salePriceMmk: number | null): string {
  return `Sale price ${salePriceMmk} must be 0 or more and below the normal price ${priceMmk}.`
}

export function lineTotal(line: PricedLine): number {
  return effectiveUnitPrice(line.product.priceMmk, line.product.salePriceMmk) * line.qty
}

export function cartSubtotal(lines: readonly PricedLine[]): number {
  return lines.reduce((sum, l) => sum + lineTotal(l), 0)
}

/** Display only - what the discounted lines took off the undiscounted total. */
export function cartSavings(lines: readonly PricedLine[]): number {
  return lines.reduce((sum, l) => sum + (l.product.priceMmk * l.qty - lineTotal(l)), 0)
}
