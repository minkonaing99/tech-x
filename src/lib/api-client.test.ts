import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from './api-client'

function mockFetch(impl: (path: string, init: RequestInit) => Promise<Response> | Response) {
  const spy = vi.fn(impl)
  vi.stubGlobal('fetch', spy)
  return spy
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('api', () => {
  it('unwraps the data envelope on success', async () => {
    mockFetch(() => jsonResponse({ data: { id: 'x' }, error: null }))
    const res = await api<{ id: string }>('/api/v1/thing')
    expect(res).toEqual({ ok: true, status: 200, data: { id: 'x' }, error: null })
  })

  it('surfaces the error envelope with the status', async () => {
    mockFetch(() => jsonResponse({ data: null, error: { code: 'CONFLICT', message: 'Nope.' } }, 409))
    const res = await api('/api/v1/thing')
    expect(res.ok).toBe(false)
    expect(res.status).toBe(409)
    expect(res.error).toEqual({ code: 'CONFLICT', message: 'Nope.' })
  })

  it('does not throw on a non-JSON body', async () => {
    mockFetch(() => new Response('<html>502</html>', { status: 502 }))
    const res = await api('/api/v1/thing')
    expect(res).toEqual({ ok: false, status: 502, data: null, error: null })
  })

  it('does not throw when the network is down', async () => {
    mockFetch(() => Promise.reject(new Error('offline')))
    const res = await api('/api/v1/thing')
    expect(res).toEqual({ ok: false, status: 0, data: null, error: { message: 'Network error.' } })
  })

  it('sets a JSON content-type for a string body only', async () => {
    const spy = mockFetch(() => jsonResponse({ data: null, error: null }))
    await api('/a', { method: 'POST', body: JSON.stringify({ a: 1 }) })
    expect(spy.mock.calls[0]?.[1].headers).toEqual({ 'content-type': 'application/json' })

    const form = new FormData()
    await api('/b', { method: 'POST', body: form })
    expect(spy.mock.calls[1]?.[1].headers).toBeUndefined()
  })

  it('sends cookies so the session rides along', async () => {
    const spy = mockFetch(() => jsonResponse({ data: null, error: null }))
    await api('/a')
    expect(spy.mock.calls[0]?.[1].credentials).toBe('same-origin')
  })
})
