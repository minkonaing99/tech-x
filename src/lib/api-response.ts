import { NextResponse } from 'next/server'

/**
 * The one JSON envelope every /api/v1 route answers with: `{ data, error }`,
 * where exactly one side is null.
 */
export function ok<T>(data: T): NextResponse {
  return NextResponse.json({ data, error: null })
}

/**
 * `details` is for machine-readable specifics the client has to act on - which
 * cart lines were refused, say. `message` stays a sentence for a person: the
 * order route used to answer `OUT_OF_STOCK:<productId>` in it, and checkout
 * showed that to the customer.
 */
export function fail(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): NextResponse {
  return NextResponse.json(
    { data: null, error: { code, message, status, ...(details === undefined ? {} : { details }) } },
    { status },
  )
}

/** 429 with the `Retry-After` header clients need to back off correctly. */
export function rateLimited(message: string, retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { data: null, error: { code: 'RATE_LIMITED', message, status: 429 } },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  )
}
