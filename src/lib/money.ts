/**
 * MMK has no subunit. Format as `Ks 249,000`.
 */
const fmt = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
  useGrouping: true,
})

export function formatMmk(amount: number): string {
  return `Ks ${fmt.format(Math.max(0, Math.round(amount)))}`
}
