import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Content-Security-Policy is NOT here: it carries a per-request nonce and is
// set in src/middleware.ts. Two CSP headers would be intersected by the
// browser, so it must live in exactly one place.
const SECURITY_HEADERS = [
  // Force HTTPS for two years across all subdomains.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Block all framing — protects against clickjacking.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Prevent MIME-sniffing attacks.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Don't leak full URLs to third-party origins.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Drop access to powerful browser APIs we don't need.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
]

// Public CDN domain (Cloudflare R2 binding). Optional in dev; required in prod.
const cdnUrl = process.env.NEXT_PUBLIC_CDN_URL
const cdnHost = cdnUrl ? new URL(cdnUrl).hostname : null

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Hostinger builds server-side with a production-only install (no devDeps),
  // so eslint + the build-time type checker aren't available there. We run
  // `npm run lint` + `npm run typecheck` locally before every push, so skip
  // both during the build rather than letting Next try to self-install them
  // (which shells out to pnpm, absent on Hostinger). `typescript`,
  // `@types/react`, `@types/node` are kept in `dependencies` so Next's TS
  // setup check still passes against the prod-only install.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  // Runtime uploads now write to Cloudflare R2 (object storage), not the
  // local disk. The Easy Deploy / Hostinger filesystem is treated as
  // build-frozen — no `writeFile` to `public/` at request time.
  images: {
    remotePatterns: cdnHost
      ? [{ protocol: 'https', hostname: cdnHost, pathname: '/**' }]
      : [],
  },
  async headers() {
    // Only the security set. Product photos and payment QR moved to the R2
    // public bucket, so `/products/*` and `/payment-qr/*` no
    // longer resolve to anything Next serves - their cache headers were being
    // set on 404s. `putPublic` sends `Cache-Control` with the object itself.
    return [{ source: '/(.*)', headers: SECURITY_HEADERS }]
  },
  webpack: (config) => {
    config.resolve = config.resolve ?? {}
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@': path.resolve(__dirname, 'src'),
      '@emails': path.resolve(__dirname, 'emails'),
    }
    return config
  },
}

export default nextConfig
