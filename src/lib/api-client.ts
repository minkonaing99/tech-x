'use client'

interface ApiError {
  code?: string
  message?: string
  /** Machine-readable specifics for the client to act on. See `fail()`. */
  details?: unknown
}

export interface ApiResult<T> {
  ok: boolean
  status: number
  data: T | null
  error: ApiError | null
}

/**
 * Client-side call against an /api/v1 route. Unwraps the `{ data, error }`
 * envelope, never throws, and never leaves the caller with a half-parsed body.
 *
 * A JSON body is sent as-is; pass a `FormData` body and the content-type is
 * left to the browser so the multipart boundary survives.
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const isJsonBody = typeof init.body === 'string'
  try {
    const res = await fetch(path, {
      credentials: 'same-origin',
      ...init,
      headers: isJsonBody
        ? { 'content-type': 'application/json', ...init.headers }
        : init.headers,
    })
    const json = (await res.json().catch(() => null)) as
      | { data?: T; error?: ApiError }
      | null
    return {
      ok: res.ok,
      status: res.status,
      data: json?.data ?? null,
      error: json?.error ?? null,
    }
  } catch {
    return { ok: false, status: 0, data: null, error: { message: 'Network error.' } }
  }
}
