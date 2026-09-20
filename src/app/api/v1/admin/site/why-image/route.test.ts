import { createHash } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fail } from '@/lib/api-response'
import { resetBuckets } from '@/lib/rate-limit'

const LEGACY_KEY = 'site/why.webp'

let admin = true
/** What `site_settings.why_image` holds before the request. */
let storedKey: string | null = null
let sharpFails = false
/** Bytes the sharp mock re-encodes to, so a test can vary the content hash. */
let webpBytes = Buffer.from('webp-bytes')

const revalidateTag = vi.fn()
const setSetting = vi.fn<(key: string, value: string) => Promise<void>>(async () => {})
const deleteSetting = vi.fn<(key: string) => Promise<void>>(async () => {})
const putPublic = vi.fn<(key: string, body: Buffer, type: string) => Promise<void>>(
  async () => {},
)
const deletePublic = vi.fn<(key: string) => Promise<void>>(async () => {})

vi.mock('@/lib/admin-guard', () => ({
  requireAdmin: async () => (admin ? null : fail('FORBIDDEN', 'Admin only.', 403)),
}))
vi.mock('next/cache', () => ({ revalidateTag: (t: string) => revalidateTag(t) }))

vi.mock('sharp', () => {
  const api: Record<string, unknown> = {
    rotate: () => api,
    resize: () => api,
    webp: () => api,
    toBuffer: async () => {
      if (sharpFails) throw new Error('unsupported image format')
      return webpBytes
    },
  }
  return { default: () => api }
})

vi.mock('@/lib/r2', () => ({
  putPublic: (key: string, body: Buffer, type: string) => putPublic(key, body, type),
  deletePublic: (key: string) => deletePublic(key),
}))

// Public URL building lives in `@/lib/cdn` - it needs no credentials, so it is
// not part of the `server-only` R2 client.
vi.mock('@/lib/cdn', () => ({
  r2PublicUrl: (key: string | null) => (key ? `https://cdn.example/${key}` : null),
}))

vi.mock('@/lib/site-settings', () => ({
  getSetting: async () => storedKey,
  setSetting: (key: string, value: string) => setSetting(key, value),
  deleteSetting: (key: string) => deleteSetting(key),
}))

const { DELETE, GET, POST } = await import('./route')

/** The key the route is expected to derive for `bytes`. */
function keyFor(bytes: Buffer): string {
  return `site/why-${createHash('sha256').update(bytes).digest('hex').slice(0, 16)}.webp`
}

function png(bytes = 32, type = 'image/png'): File {
  return new File([new Uint8Array(bytes)], 'why.png', { type })
}

/** Each test gets its own address so the 20/hour limiter does not leak. */
let ip = 0
function upload(file: File | null): Request {
  ip += 1
  const form = new FormData()
  if (file) form.set('image', file)
  return new Request('http://localhost/api/v1/admin/site/why-image', {
    method: 'POST',
    headers: { 'x-forwarded-for': `10.5.0.${ip}` },
    body: form,
  })
}

function firstPutKey(): string | undefined {
  return putPublic.mock.calls[0]?.[0]
}

beforeEach(() => {
  admin = true
  storedKey = null
  sharpFails = false
  webpBytes = Buffer.from('webp-bytes')
  ;[revalidateTag, setSetting, deleteSetting, putPublic, deletePublic].forEach((m) =>
    m.mockClear(),
  )
  putPublic.mockImplementation(async () => {})
  resetBuckets()
})

describe('POST /api/v1/admin/site/why-image', () => {
  it('refuses a caller the database does not call an admin', async () => {
    admin = false
    expect((await POST(upload(png()))).status).toBe(403)
    expect(putPublic).not.toHaveBeenCalled()
  })

  it('rejects a request carrying no file', async () => {
    expect((await POST(upload(null))).status).toBe(400)
  })

  it('rejects a file over the size cap', async () => {
    const res = await POST(upload(png(11 * 1024 * 1024)))
    expect(res.status).toBe(413)
    expect(putPublic).not.toHaveBeenCalled()
  })

  it('rejects a content type that is not an image we re-encode', async () => {
    const res = await POST(upload(png(32, 'application/pdf')))
    expect(res.status).toBe(415)
    expect(putPublic).not.toHaveBeenCalled()
  })

  it('rejects bytes that only claim to be an image', async () => {
    sharpFails = true
    const res = await POST(upload(png()))
    expect(res.status).toBe(400)
    expect(putPublic).not.toHaveBeenCalled()
  })

  it('leaves the stored key alone when the bucket write fails', async () => {
    putPublic.mockRejectedValueOnce(new Error('bucket down'))
    expect((await POST(upload(png()))).status).toBe(502)
    expect(setSetting).not.toHaveBeenCalled()
    expect(deletePublic).not.toHaveBeenCalled()
  })

  it('derives the key from the re-encoded bytes, so the URL changes with the image', async () => {
    // The object is served `immutable` for a year, so a replacement that reused
    // one key would sit behind the cached copy of the old one forever.
    const res = await POST(upload(png()))

    expect(res.status).toBe(200)
    expect(firstPutKey()).toBe(keyFor(webpBytes))
    expect(putPublic.mock.calls[0]?.[2]).toBe('image/webp')
    expect(setSetting).toHaveBeenCalledWith('why_image', keyFor(webpBytes))
    expect(revalidateTag).toHaveBeenCalledWith('site-settings')
    // The admin UI renders whatever `url` comes back, so it has to be the key
    // just written and not the one it replaced.
    expect((await res.json()).data.url).toBe(`https://cdn.example/${keyFor(webpBytes)}`)
  })

  it('keeps the old object when the setting cannot be moved to the new one', async () => {
    // Write, then point, then delete. A failure to point must leave the setting
    // aimed at an object that still exists, so the homepage keeps rendering.
    storedKey = 'site/why-0123456789abcdef.webp'
    setSetting.mockRejectedValueOnce(new Error('database down'))

    await expect(POST(upload(png()))).rejects.toThrow('database down')
    expect(deletePublic).not.toHaveBeenCalled()
  })

  it('gives a different image a different key', async () => {
    await POST(upload(png()))
    const first = firstPutKey()

    putPublic.mockClear()
    webpBytes = Buffer.from('other-webp-bytes')
    await POST(upload(png()))

    expect(firstPutKey()).not.toBe(first)
    expect(firstPutKey()).toBe(keyFor(webpBytes))
  })

  it('removes the object it replaces', async () => {
    storedKey = 'site/why-0123456789abcdef.webp'
    expect((await POST(upload(png()))).status).toBe(200)
    expect(deletePublic).toHaveBeenCalledWith(storedKey)
  })

  it('removes a legacy fixed-key object it replaces', async () => {
    storedKey = LEGACY_KEY
    expect((await POST(upload(png()))).status).toBe(200)
    expect(deletePublic).toHaveBeenCalledWith(LEGACY_KEY)
  })

  it('does not delete the object it just wrote when the image is unchanged', async () => {
    storedKey = keyFor(webpBytes)
    expect((await POST(upload(png()))).status).toBe(200)
    expect(deletePublic).not.toHaveBeenCalled()
  })

  it('rate limits after twenty uploads from one caller', async () => {
    const send = () =>
      POST(
        new Request('http://localhost/api/v1/admin/site/why-image', {
          method: 'POST',
          headers: { 'x-forwarded-for': '10.6.6.6' },
          body: (() => {
            const form = new FormData()
            form.set('image', png())
            return form
          })(),
        }),
      )

    for (let i = 0; i < 20; i += 1) {
      expect((await send()).status).toBe(200)
    }

    const blocked = await send()
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('Retry-After')).toBeTruthy()
  })
})

describe('GET /api/v1/admin/site/why-image', () => {
  it('refuses a non-admin', async () => {
    admin = false
    expect((await GET()).status).toBe(403)
  })

  it('reports no image when nothing is stored', async () => {
    const body = await (await GET()).json()
    expect(body.data.url).toBeNull()
  })

  it('resolves the stored key through the CDN', async () => {
    storedKey = 'site/why-0123456789abcdef.webp'
    const body = await (await GET()).json()
    expect(body.data.url).toBe(`https://cdn.example/${storedKey}`)
  })
})

describe('DELETE /api/v1/admin/site/why-image', () => {
  it('refuses a non-admin', async () => {
    admin = false
    expect((await DELETE()).status).toBe(403)
    expect(deletePublic).not.toHaveBeenCalled()
  })

  it('removes the object the setting actually points at', async () => {
    // A hardcoded key here would orphan every content-addressed object.
    storedKey = 'site/why-0123456789abcdef.webp'
    expect((await DELETE()).status).toBe(200)
    expect(deletePublic).toHaveBeenCalledWith(storedKey)
    expect(deleteSetting).toHaveBeenCalledWith('why_image')
    expect(revalidateTag).toHaveBeenCalledWith('site-settings')
  })

  it('touches no object when nothing is stored', async () => {
    expect((await DELETE()).status).toBe(200)
    expect(deletePublic).not.toHaveBeenCalled()
  })
})
