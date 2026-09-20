interface Bucket {
  count: number
  resetAt: number
}

const store = new Map<string, Bucket>()

interface CheckOptions {
  key: string
  limit: number
  windowMs: number
}

interface CheckResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

/**
 * Ceiling on how many buckets the process holds at once. Reached only under a
 * flood: at one bucket per caller per endpoint, ordinary traffic sits orders of
 * magnitude below it.
 */
export const MAX_BUCKETS = 10_000

/**
 * Buckets are only ever inserted, so without this the map keeps one entry for
 * every address the process has ever served and grows for as long as it stays
 * up. Runs only when the store is at the cap, which leaves the ordinary path a
 * single `Map` lookup.
 *
 * Expired buckets go first, since dropping those changes nothing. If the store
 * is still full afterwards, the ones nearest their reset are dropped next:
 * evicting a live bucket hands its owner a fresh allowance, so the ones with
 * the least window left are the cheapest to lose.
 */
function evict(now: number): void {
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key)
  }
  if (store.size < MAX_BUCKETS) return

  const soonest = [...store.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt)
  for (const [key] of soonest.slice(0, store.size - MAX_BUCKETS + 1)) {
    store.delete(key)
  }
}

export function rateLimit({ key, limit, windowMs }: CheckOptions): CheckResult {
  const now = Date.now()
  if (store.size >= MAX_BUCKETS && !store.has(key)) evict(now)

  const existing = store.get(key)

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 }
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  existing.count += 1
  return { allowed: true, remaining: limit - existing.count, retryAfterSeconds: 0 }
}

/**
 * How many reverse proxies sit in front of this process. Hostinger terminates
 * with one, hence the default. Set to 0 when the app is exposed directly - then
 * `X-Forwarded-For` is caller-supplied and must be ignored outright.
 */
const TRUSTED_PROXY_HOPS = Number(process.env.TRUSTED_PROXY_HOPS ?? 1)

/**
 * Every proxy *appends* the address it received the connection from, so the
 * rightmost entries are the ones our own infrastructure wrote and everything to
 * their left is whatever the caller chose to send. Reading the leftmost entry -
 * the obvious-looking choice - hands the client a free rate-limit bypass: a new
 * forged value per request means a new bucket per request.
 */
export function clientIp(req: Request, hops: number = TRUSTED_PROXY_HOPS): string {
  const realIp = req.headers.get('x-real-ip')?.trim()
  if (hops <= 0) return realIp || 'unknown'

  const chain = (req.headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  if (chain.length === 0) return realIp || 'unknown'

  // Short chain means fewer proxies than configured; take the oldest entry we
  // have rather than indexing past the front.
  return chain[Math.max(0, chain.length - hops)] ?? 'unknown'
}

export function clientKey(req: Request, prefix: string): string {
  return `${prefix}:${clientIp(req)}`
}

/** Test seam - the bucket store is module state. */
export function bucketCount(): number {
  return store.size
}

/** Test seam - the bucket store is module state. */
export function resetBuckets(): void {
  store.clear()
}
