/**
 * The id shapes that arrive from a URL, in one place. Nine route files and
 * four pages each carried their own copy of the UUID pattern.
 *
 * These are guards, not generators. Anything reaching them is a path segment
 * or a request body field, so the only question they answer is "could this be
 * one of ours" - cheaply, before a query runs.
 */

/** `orders.id`, `addresses.id`, `reviews.id`: server-generated v4 UUIDs. */
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * `products.id`, which is the slug (`id = slug` at creation).
 *
 * Deliberately looser than `SLUG_REGEX` in ./slugify, which is the rule for
 * *minting* a slug and refuses leading and trailing dashes. This one only has
 * to decide whether a path segment is safe to look up, and tightening it would
 * start rejecting rows the admin API already accepted.
 */
export const PRODUCT_ID_RE = /^[a-z0-9-]+$/
