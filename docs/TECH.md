# TECH — merxylab store

## Architecture

### Tech stack + rationale

**Frontend**
- **Next.js 15 (App Router)** — file-based routing, RSC default, route handlers double as the backend API, image optimization, edge metadata.
- **TypeScript (strict + noUncheckedIndexedAccess)** — catches catalog/cart type drift; Drizzle schema is the single source of truth.
- **Tailwind CSS v4** — design tokens via CSS vars (CSS-first `@theme`), zero runtime cost.
- **Framer Motion** — restrained scroll fades + hover micro-interactions; `MotionConfig reducedMotion="user"` honors a11y system pref.
- **Zustand** — cart store for client UI state (drawer open/close, server-confirmed updates). DB cart syncs via cookie session. Mutations go through the shared `api()` client and report failure back to the caller rather than swallowing it; `add()` returns a result the button turns into a toast.
- **Fuse.js** — client-side fuzzy search; ~10KB; the `/search` server component passes the live catalog down and the client indexes it in memory.
- **Fonts:** Fraunces (display, opsz+SOFT axes) + Inter (body), `next/font/google` for zero CLS.

**Backend (Phase 5+)**
- **Next.js route handlers** under `/api/v1/...` — one repo, one deploy.
- **MySQL 8 / MariaDB** — Hostinger Business default, mature, free.
- **Drizzle ORM + mysql2 driver** — TS-native schema, no codegen, raw-SQL escape hatch. Drizzle Studio remains a power-user fallback alongside the custom `/admin` UI.
- **Auth.js v5 (NextAuth)** + **@auth/drizzle-adapter** — email + password (bcryptjs 12 rounds) + Google OAuth. Sessions via JWT in httpOnly cookies. Role propagated through `jwt`/`session` callbacks for display only; authorisation re-reads `users.role` per request via `src/lib/admin-guard.ts`.
- **nodemailer + React Email** — `src/lib/mail.ts` accepts either text+html or a React element; `@react-email/render` produces HTML + plaintext fallback per send. Templates in `emails/`.
- **zod** — request schema validation at every route boundary.
- **In-memory bucket rate limit** (`src/lib/rate-limit.ts`) — single-instance safe; will swap to Upstash on scale. Buckets reset on redeploy, and the store is capped at 10,000 keys: on reaching the cap it drops expired buckets first, then the ones nearest their reset, so it cannot grow for the life of the process.
- **Origin gate** (`src/middleware.ts`) — every `/api/*` write must carry a same-origin `Origin` header; CSRF protection that does not depend on the Auth.js cookie's `SameSite` default.
- **Nonce CSP** (`src/lib/csp.ts` + middleware) — production `script-src` is `'nonce-<per-request>' 'strict-dynamic'`, no `'unsafe-inline'`. Costs static generation on every page: a prerendered page is built without a nonce, so its scripts would be refused. See the ADR below.
- **Payments** — bank transfer only (Myanmar retail). Owner confirms receipt manually from `/admin/orders/[id]`; no online gateway, no card surface.

**Operator surface**
- **Custom `/admin` UI** — role-gated React pages (overview KPIs, products inline-edit, order work queue + ledger, reviews moderation). All admin mutations call `requireAdmin()` guard server-side, never trust client claims.
- **Drizzle Studio** — local-only fallback for ad-hoc inspection (`npm run db:studio`). Production access only via SSH tunnel.

**Deploy target**
- **Hostinger Business shared** — Node.js via Phusion Passenger, MySQL local, SMTP local. Next.js built with `output: 'standalone'`.

### Folder structure (Phase 4-7 target)
```
merxylab-store/
├── src/
│   ├── app/
│   │   ├── layout.tsx, page.tsx, globals.css
│   │   ├── shop/page.tsx + [category]/page.tsx
│   │   ├── product/[slug]/page.tsx
│   │   ├── cart/page.tsx, search/page.tsx, not-found.tsx
│   │   ├── sitemap.ts, robots.ts
│   │   ├── signin/page.tsx, signup/page.tsx, verify/page.tsx
│   │   ├── checkout/page.tsx
│   │   ├── order/[id]/page.tsx                 # confirmation + bank instructions
│   │   ├── account/
│   │   │   ├── page.tsx                       # dashboard
│   │   │   ├── orders/page.tsx + [id]/page.tsx
│   │   │   ├── addresses/page.tsx + address-manager.tsx
│   │   │   └── wishlist/page.tsx
│   │   ├── admin/                             # role-gated operator UI (Phase 8)
│   │   │   ├── layout.tsx + page.tsx          # KPI overview
│   │   │   ├── products/page.tsx + product-table.tsx
│   │   │   ├── orders/page.tsx + orders-table.tsx
│   │   │   └── reviews/page.tsx + reviews-list.tsx
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       └── v1/
│   │           ├── products/route.ts + [slug]/route.ts + [slug]/reviews/route.ts
│   │           ├── categories/route.ts
│   │           ├── cart/route.ts + items/route.ts + items/[productId]/route.ts + merge/route.ts
│   │           ├── wishlist/route.ts + [productId]/route.ts + merge/route.ts
│   │           ├── orders/route.ts + [id]/route.ts
│   │           ├── addresses/route.ts + [id]/route.ts
│   │           ├── contact/route.ts
│   │           ├── auth/signup/route.ts + verify/route.ts
│   │           ├── admin/products/[id]/route.ts
│   │           ├── admin/orders/[id]/route.ts
│   │           └── admin/reviews/[id]/route.ts
│   ├── components/
│   │   ├── nav.tsx, footer.tsx, cart-drawer.tsx, cart-hydrator.tsx, motion-provider.tsx, auth-provider.tsx
│   │   ├── home/{hero,stats,product-grid,why,cta-banner}.tsx
│   │   ├── product/{card,tile,gallery,add-to-cart-button,stock-badge}.tsx
│   │   ├── shop/grid-controls.tsx
│   │   ├── reviews/{stars,review-block}.tsx
│   │   ├── wishlist/{heart-button,wishlist-hydrator}.tsx
│   │   └── account/sign-out-button.tsx
│   ├── lib/
│   │   ├── cart-store.ts, search.ts, types.ts, utils.ts, products.ts
│   │   ├── auth.ts                            # NextAuth config (credentials + Google conditional)
│   │   ├── auth-handlers.ts                   # re-export GET/POST for /api/auth catch-all
│   │   ├── admin-guard.ts                     # requireAdmin() server-side role check
│   │   ├── catalog.ts                         # DB-backed catalog helpers + unstable_cache
│   │   ├── mail.ts                            # nodemailer + React Email renderer
│   │   ├── cart-session.ts                    # guest cart cookie + merge-on-login
│   │   ├── cart-store.ts                      # zustand client store (API-backed)
│   │   ├── wishlist-store.ts                  # zustand wishlist (guest localStorage + DB on auth)
│   │   ├── rate-limit.ts                      # in-memory bucket limiter
│   │   ├── search.ts, types.ts, utils.ts, money.ts, products.ts (legacy JSON helpers)
│   ├── db/
│   │   ├── index.ts                           # drizzle client (mysql2 pool)
│   │   ├── schema/
│   │   │   ├── auth.ts                        # users, accounts, sessions, verification_tokens
│   │   │   ├── products.ts                    # products, categories, product_specs
│   │   │   ├── carts.ts                       # carts, cart_items
│   │   │   ├── addresses.ts
│   │   │   ├── orders.ts                      # orders, order_items
│   │   │   ├── reviews.ts
│   │   │   ├── wishlists.ts
│   │   └── url.ts                             # DATABASE_URL / DB_* assembly
│   ├── data/                                  # legacy JSON, kept for seed only
│   └── styles/
├── emails/                                    # React Email templates
│   ├── verify-email.tsx
│   ├── order-invoice.tsx, order-delivered.tsx, order-cancelled.tsx
│   ├── new-order-alert.tsx, slip-submitted-alert.tsx
│   └── low-stock-alert.tsx
├── public/
│   └── favicon.ico, logo.png                  # product photos live on Cloudflare R2
├── scripts/
│   ├── cancel-expired-orders.ts               # nightly unpaid-order sweep
│   └── set-password.ts                       # operator password reset
├── drizzle.config.ts
├── docs/, .env.local, .env.example
├── package.json, tsconfig.json, next.config.ts
```

### Request lifecycle / data flow
- **Placeholder phase (done):** all data statically imported JSON. Pages render at build time.
- **Phase 4-7:**
  - Catalog reads: RSC fetches via Drizzle directly in server components → cached with `unstable_cache` (revalidate 60s).
  - Search: `/search` server component loads the catalog via `getAllProducts()`, client builds the Fuse index in memory.
  - Cart mutations: client → optimistic update via zustand → POST `/api/v1/cart/items` → server validates → DB write → revalidates.
  - Auth: NextAuth route handlers under `/api/auth/*`, JWT in httpOnly cookie, server components read `auth()` helper.
  - Photos: served as static from `public/products/{slug}/01.webp` via `next/image`. Missing files = swatch fallback.
  - Email: server actions call `nodemailer.sendMail` via Hostinger SMTP (TLS 465).

### Technical goals
- Lighthouse Performance > 90 mobile, > 95 desktop.
- First Contentful Paint < 1.2s on 4G.
- Total JS bundle < 200KB gzipped (initial route).
- Cart drawer opens in < 100ms after click.
- Zero layout shift (CLS = 0) — `next/font` + reserved hero space.

### Non-functional requirements
- Latency: N/A in placeholder phase (static).
- Availability: depends on hosting (Vercel SLA when deployed).
- Security: standard browser-context only; no PII stored.
- Accessibility: WCAG 2.1 AA — keyboard nav, focus rings, semantic HTML, color contrast verified.

### System constraints
- Node 20+ required for build.
- Modern evergreen browsers only (no IE11).
- localStorage required for cart persistence (graceful fallback to session memory).

### Integration points
- Google Fonts (Fraunces, Inter) via `next/font` — auto-self-hosted at build.
- Future: backend API (TBD), payment processor (TBD), email/newsletter provider (TBD).

### Scalability plan
- Placeholder phase: static export possible — CDN edge cache.
- Post-backend: API routes via Next.js handlers OR separate service; ISR/SSG for product pages; Redis cache for cart + sessions.

### Deployment target
- Assumed: **Vercel** (Next.js native, edge functions, image optimization).
- Region: auto-edge.
- Alt: any Node 20 host (self-hosted via `next build && next start`).

### Observability
- Placeholder phase: Vercel Analytics (page views, web vitals) — opt-in.
- Post-API: structured server logs, error tracking (Sentry), uptime monitor.

---

## Architecture Decision Records

### [2026-08-24] Password reset evicts sessions, at one read per request
**Status:** Accepted
**Context:** There was no self-service reset at all. The only recovery path was `npm run user:password` on the operator's machine, which meant every forgotten password was a message to the owner, and a stalled signup — verified email never clicked — was a dead end. Building the flow surfaced a second problem: sessions are stateless 30-day JWTs, so changing `password_hash` cannot reach a cookie already in a browser. A reset would have blocked future sign-ins while leaving the session it was meant to evict working for up to a month. Customers reasonably assume resetting logs everyone else out.
**Decision:** `users.password_changed_at` (nullable `TIMESTAMP(3)`) is stamped by every writer of `password_hash` — the reset route, signup's account re-claim, and `scripts/set-password.ts`. The JWT carries the value it was minted with as `pwdAt`, and the `jwt` callback re-reads the column on each authenticated request, returning null — which signs the token out — when the two disagree. This is the trade `admin-guard.ts` already documents for role revocation, applied to credentials: one indexed primary-key read, on an app that is `force-dynamic` throughout and already issues several queries per page.

A NULL column means "the password has not moved since this shipped" and adopts whatever token the caller holds. Branching on the column rather than on the absent `pwdAt` claim is what makes the rollout safe *and* correct: nobody is signed out at deploy, and eviction begins the moment a reset writes a real timestamp. Branching on the missing claim instead would have adopted pre-deploy tokens forever — including the one a reset exists to kill. **The column must not be backfilled**, for the same reason.

Reset tokens share `verification_tokens` with verification tokens, separated by a new `purpose` column defaulted to `verify`. Without it the two flows are keyed only by address and digest, so either route would spend the other's token. Requesting a reset deletes any earlier `reset` row for that address and spending one deletes them all, so exactly one live link exists per account. TTL is 15 minutes, half the verification token's, because this one sets a working credential rather than confirming an address.
**Consequences:** Every authenticated request costs one more primary-key lookup, and admin surfaces now read the user row twice — once here, once in `currentRole()`. Folding them was rejected: `admin-guard.ts` is the documented single answer to "is this caller an admin", and collapsing it into a session callback would spread that answer across two places to save a lookup the app does not notice. A deleted account also stops being able to present a live token anywhere, not just on admin routes, which the previous arrangement only enforced under `/admin`.

The request endpoint answers identically for a registered and an unregistered address, matching signup and sign-in. The SMTP round trip leaves the known path measurably slower; 10/hour/IP plus 5/hour/email is what stands against walking an address list, not the response body. The email budget sits above the 3/hour originally specced so that a person who mistypes once is not locked out of their own reset, while a targeted lockout still costs an attacker one of their own ten.

A successful reset also sets `email_verified` when it was NULL — opening the link is a stronger proof of inbox control than the signup verification — so a stalled signup now resets its way out. OAuth-only accounts gain a password rather than being refused, because refusing them cannot be explained on screen without revealing that the address is a Google account.

**Not done:** no "sign out my other devices" control. It is reachable from here — bumping the stamp with no password change is the whole implementation — but a customer who wants it can change their password instead.

**Follow-up, same day:** `/account/password` and `PATCH /api/v1/auth/change-password` were added on top of this. The current password is proved with bcrypt before the write, because holding a session is a weaker claim than knowing the credential — an unlocked machine must not be a password change. Google-only accounts get a 409 pointing at the reset flow, which is the one path that can give them a first password.

The stamp made the obvious implementation wrong in a way worth recording: writing it signs out every session carrying the old value, and the device performing the change is holding one of those. Left alone, changing your password logs you out of the tab you changed it in. The route therefore returns the new stamp and the form calls `signIn('credentials')` with the password just chosen, minting a token that agrees with the row. Other devices keep the old stamp and go on their next request, which is the intended half of the behaviour and is stated on the screen rather than left as a surprise.

### [2026-08-23] Compare is a URL, not a selection tray
**Status:** Accepted
**Context:** Shoppers cross-shopping two mice had to open two tabs and scroll between them. The familiar answer is checkboxes on the shop grid feeding a sticky "2 selected" tray, which means a new zustand store, cross-page persistence, a third nested interactive element inside the card's wrapping `Link`, and empty/one-item tray states. The catalog is small and the comparison a shopper wants is nearly always "this one, versus the other one in the same category".
**Decision:** `/compare?a=<slug>&b=<slug>`, a server component. Entry is a `<details>` disclosure on the PDP holding one `Link` per rival in the same category, plus the same component again under the table with `a` pinned so the right-hand product can be swapped. Exactly two products, same category only. Missing, unknown, identical or cross-category slugs all `notFound()`. `resolvePair()` is the single gate and `generateMetadata` runs it too. `robots: { index: false, follow: true }` and no sitemap entry — pair count grows as n², and each page repeats spec text that already lives on two PDPs.
**Consequences:** No client state, no localStorage, no new dependency, and the comparison is linkable and crawlable through to both products. Costs: three-way comparison is not expressible, the left-hand product can only be changed by navigating, and a shopper browsing `/shop` with two products in mind has to open one of them first. If a tray is ever wanted, the URL stays the destination and the tray becomes another way to build it.

### [2026-08-23] Compare unions the spec labels rather than normalising them
**Status:** Accepted
**Context:** `product_specs` is free-form `label`/`value` per product, with no per-category schema — deliberately, so the admin can describe a monitor and a deskmat with the same table. Two products in one category therefore rarely carry the same labels: in the bootstrap set both mice share only `Sensor` and `Weight`, one says `Max speed` where the other says `Max`, and the two accessories share nothing at all. A comparison table has to do something about that. The clean answer is a canonical label list per category, an admin picker bound to it, and a backfill of every existing row.
**Decision:** Ship the union. `compareRows()` in `src/lib/compare.ts` walks A's specs in their `sort_order`, then appends any label only B carries. A label the other side lacks renders a hyphen plus an `sr-only` "Not listed". A label repeated on one product collapses to its first value, so duplicate React keys and self-contradicting rows are impossible. No diff highlighting: string equality is the only test available on free-form values, so `< 60 g` against `60g` would flag as a difference and the highlight would mean nothing.
**Consequences:** Comparison ships without touching the schema, the admin form, or `docs/db-bootstrap.sql`, and it never lies — a gap in the table is a gap in the catalog. The table is uneven, and the more the two products' labels diverge the more of it is hyphens. Row order is not symmetric: swapping `a` and `b` in the URL reorders the rows, because A's order is the one an admin arranged. Normalising labels later makes the same table denser with no code change here.

### [2026-06-15] Use Next.js 15 App Router over Vite SPA
**Status:** Accepted
**Context:** Need TS frontend now, real API later. Must swap data layer without rewriting routing/SSR.
**Decision:** Next.js 15 App Router + RSC default.
**Consequences:** Higher initial complexity than Vite, but SSR/ISR available when API lands; SEO-ready out of the box; image optimization built-in; file-based routes reduce boilerplate.

### [2026-06-15] Inline JSON catalog, no repository abstraction
**Status:** Accepted
**Context:** Placeholder phase. Backend API designed later. Choice: clean repository interface vs raw JSON imports.
**Decision:** Direct JSON imports from `src/data/`. Refactor to API client when backend lands.
**Consequences:** Faster build now, zero indirection. Trade-off: every page touching products will need a swap when API lands (mitigated by central `types.ts` already defining `Product` shape).

### [2026-06-15] Zustand + localStorage for cart, not Context
**Status:** Accepted
**Context:** Cart state needs persistence + low boilerplate.
**Decision:** Zustand store with `persist` middleware writing to localStorage.
**Consequences:** No provider tree pollution; survives refresh; trivial to migrate to server-side cart later by swapping the persist storage.

### [2026-06-15] Tailwind v4 + shadcn/ui (copy-in), not a UI kit
**Status:** Accepted
**Context:** Must avoid generic-template look. Need primitives without lock-in.
**Decision:** Tailwind v4 for tokens + utilities, shadcn/ui primitives copied into `src/components/ui/` for accordion, sheet (drawer), button, dialog.
**Consequences:** Full restyle control, no opaque library upgrades to fight, larger initial setup vs. Chakra/MUI.

### [2026-06-15] Fuse.js client-side search, not server search
**Status:** Accepted
**Context:** No backend in placeholder phase. 30+ products comfortably fit in-memory.
**Decision:** Fuse.js, index built by `buildSearchIndex()` in `src/lib/search.ts` from the catalog the `/search` server component passes in.
**Consequences:** Instant results, zero infra. Will not scale past ~1000 products without server search (Algolia / Meilisearch when needed).

### [2026-06-15] MySQL via Drizzle, not Postgres
**Status:** Accepted
**Context:** Hostinger Business shared bundles MySQL/MariaDB free. Single-host deploy.
**Decision:** MySQL 8 with Drizzle ORM (mysql2 driver). No Postgres-specific features used.
**Consequences:** Locked out of Postgres extensions (jsonb operators, gin/trgm indexes, RLS). Drizzle masks driver differences; migration to Postgres later possible but not free. Acceptable for catalog/orders/reviews shape.

### [2026-06-15] Drizzle Studio as admin UI, no custom /admin
**Status:** Accepted
**Context:** Owner needs to add products, moderate reviews, fulfill orders. Custom admin is weeks of work.
**Decision:** `npm run db:studio` opens local-only web UI for CRUD. Photos dropped into `public/products/{slug}/`. Never deployed to production.
**Consequences:** Owner must run admin tasks from local checkout connected to prod DB (or via SSH tunnel). No multi-user admin. Trade-off accepted for speed.

### [2026-06-15] Hostinger Business shared (Node via Passenger), not Vercel
**Status:** Accepted
**Context:** Owner already has Hostinger Business; wants single-host (app + MySQL + SMTP + domain).
**Decision:** Deploy Next.js with `output: 'standalone'` to Hostinger Node.js via Phusion Passenger. MySQL + SMTP co-located.
**Consequences:** Memory + cold-start constraints; no edge runtime; no Vercel image-optimization CDN. Mitigated by keeping route handlers lean, generous static pre-render via `generateStaticParams`, manual `next/image` `quality` tuning.

### [2026-06-15] Manual bank-transfer "payments", no Stripe yet
**Status:** Accepted
**Context:** Owner in market without easy card-payment access; wants to ship.
**Decision:** Checkout creates `orders.status = 'pending_payment'` with order ID as bank ref. Confirmation email lists bank details. Owner marks paid in Drizzle Studio.
**Consequences:** Manual reconciliation. No PCI scope. Trivial to add Stripe later — `orders.payment_ref` field already nullable, status enum extends.

### [2026-06-15] Auth.js v5 with email/password + Google OAuth
**Status:** Accepted
**Context:** D-scope auth, full e-commerce, owner wants both options.
**Decision:** NextAuth v5 + @auth/drizzle-adapter. bcryptjs for password hashing (12 rounds). Google as only OAuth provider. Email verification via SMTP magic link.
**Consequences:** v5 still beta — pinned version, all flows E2E tested. Password reset uses time-limited tokens via verification_tokens table.

### [2026-06-17] Photos on Cloudflare R2 (supersedes "Photos on filesystem")
**Status:** Accepted
**Context:** Hostinger Easy Deploy treats `public/` as a build-frozen snapshot. Runtime `writeFile()` succeeds against a working directory the Next runtime does not serve from, so admin-uploaded photos, QRs, and slips silently 404 / 400 even though File Manager shows the file on disk. The filesystem assumption underlying the previous ADR is wrong on this hosting model. Cheaper to move object storage off the host than to switch hosting model (see grilled options: regular Hostinger Node app vs R2 vs commit-to-git; R2 won on durability + zero egress + no extra hosting reshuffle).
**Decision:** All admin-uploaded media moves to Cloudflare R2 via the S3-compatible API. Two buckets:
- `merxylab-store` (`R2_PUBLIC_BUCKET`) — `products/<slug>/<slot>.webp` + `products/<slug>/<slot>-thumb.webp` + `payment-qr/<methodId>.webp`. Public reads via CF edge.
- `merxylab-secret` (`R2_PRIVATE_BUCKET`) — `slips/<orderId>/<uuid>.webp`. No public binding, no CORS, no Bucket Lock. Bytes streamed back through the existing authed `GET /api/v1/orders/[id]/slip` route after an `order.userId === session.user.id` OR database-verified `isAdmin()` check. `Cache-Control: private, no-store`.

> **Corrected 2026-08-17.** These were originally specced as `merxylab-public` / `merxylab-private`, and production had `R2_PUBLIC_BUCKET` and `R2_PRIVATE_BUCKET` both pointing at the single bucket `merxylab-store`. That bucket carried a public r2.dev binding, so slips written by `putPrivate()` were reachable without a session — the "no public binding" guarantee above was not the one running. `merxylab-secret` was split out and existing `slips/*` migrated off the public bucket. The code needed no change: `putPrivate`/`getPrivateBytes`/`deletePrivate` always read `R2_PRIVATE_BUCKET`. `Cache-Control: private, no-store` is a caching hint and never restricted access.

`products.has_photos` is now set in-route based on the slot 01 mutation that just happened — no more `readdir` against disk. `payment_methods.qr_image_url` and `orders.payment_proof_url` store R2 keys (not URLs); a server-side `r2PublicUrl()` helper in `src/lib/cdn.ts` builds the final URL using `NEXT_PUBLIC_CDN_URL`, with a legacy-path fallback for rows that still hold the old disk path.

`sharp` continues to run in the Next route (1600×1600 hero + 600×600 thumb for products, 1600×1600 for slips, 600×600 for QRs), so EXIF stripping + MIME re-encoding still happens before bytes hit R2. PutObject runs after sharp.
**Consequences:**
- New env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BUCKET`, `R2_PRIVATE_BUCKET`, `NEXT_PUBLIC_CDN_URL`.
- Two API tokens to rotate (one per bucket). Keep scope to the relevant bucket only.
- `next.config.mjs` `images.remotePatterns` now allowlists the CDN host so `<Image>` accepts the external src.
- Bandwidth: R2 egress is free; CF edge serves products + QR globally. Slip reads still go through Next origin (low volume, admin-only).
- Disk paths (`public/products/...`, `public/payment-qr/...`, `private-uploads/slips/...`) become deprecated. Existing rows whose `qr_image_url` / `payment_proof_url` hold the legacy `/path/file.webp` shape still render: `r2PublicUrl()` returns the original path verbatim if it already looks absolute or starts with `/`, so the old static-served files keep working until the owner re-uploads through the new R2 path.
- Cost: ~$0/mo at retail volume (R2 free tier covers 10 GB storage + 1M Class A + 10M Class B ops).

### [2026-06-16] Custom `/admin` UI alongside Drizzle Studio
**Status:** Accepted (supersedes earlier ADR "Drizzle Studio as admin UI, no custom /admin")
**Context:** Drizzle Studio works but ships raw rows, requires SSH tunnel to run against production, has no domain-aware affordances (e.g. moderating a review or status-flipping an order is hostile). Owner wants ops day-to-day to happen in the same brand-aware UI as customers.
**Decision:** Build first-party `/admin` pages role-gated to `users.role = 'admin'`. Promotion is a DB `UPDATE` — no self-service. Drizzle Studio retained as power-user fallback for ad-hoc inspection.
**Consequences:** More UI surface to maintain. Mutations still validated server-side via `requireAdmin()` + zod. No public admin-signup vector (must go through DB). Trade-off accepted because admin tasks happen weekly+ and the operator UX cost compounds.

### [2026-06-16] Bank transfer only, no card payment surface
**Status:** Accepted
**Context:** Myanmar retail buyers transact via local bank apps. International card rails (Stripe, etc.) don't service Myanmar reliably and add PCI scope without matching local demand.
**Decision:** Remove Stripe entirely. `/order/[id]` shows only bank-transfer instructions with the order UUID as the reference. Owner verifies receipt in their bank app and flips the order to `paid` from `/admin/orders/[id]`.
**Consequences:** No FX drift, no PCI scope, no webhook surface. Owner is the single source of truth for payment confirmation — manual but tractable at retail volume. KBZ Pay / 2C2P / similar locally-licensed processors can be added later as new buttons on `/order/[id]`.

### [2026-06-16] React Email for transactional templates
**Status:** Accepted
**Context:** Plaintext emails work but read like spam to filters and look out of brand.
**Decision:** All transactional emails (verify, order confirmation, low-stock) authored as React Email components in `emails/`. `src/lib/mail.ts` renders to HTML + plaintext fallback per send via `@react-email/render`.
**Consequences:** Components live outside `src/` so `react-email dev` previewer can hot-reload them. Type-safe Props per template. Plain-text fallback auto-generated, satisfies email clients that block HTML.

### [2026-06-16] Lighthouse audit playbook over CI gating (for now)
**Status:** Accepted
**Context:** No CI yet. Adding LHCI to a future GitHub Actions setup is straightforward but premature.
**Decision:** Document the audit commands + targets in `docs/LIGHTHOUSE.md`. Owner runs before each release. Include the LHCI config snippet so CI gating drops in when ready.
**Consequences:** Manual discipline required. Acceptable while traffic + release cadence are low.

### [2026-06-16] Multi-method wallet payment + COD + in-app slip upload
**Status:** Accepted
**Context:** Bank-transfer-only with the order UUID as reference (previous ADR) was the simplest possible flow but leaves the customer doing all the coordination: opening a separate bank app, copying the UUID, then sending the slip outside the site (Slack/Telegram/email). Friction lost orders.
**Decision:** Build a multi-method checkout. Customer picks from KBZ Pay / Aya Pay / UAB Pay / COD at `/checkout`. Methods configured by the owner in `/admin/payment-methods` (DB-backed `payment_methods` table). On `/order/[id]` the wallet path shows merchant QR + account name + phone; customer uploads slip image (JPG/PNG/WEBP, 8MB cap, client-resized to 1600px) + optional tx ref. Slip upload flips order to `payment_submitted`. Owner verifies in their bank app and flips to `paid`. COD path uses an extra `confirmed` state set after owner phone-confirms the buyer.
**Consequences:** New tables (`payment_methods`, `divisions`), expanded `orders.status` enum (adds `payment_submitted`, `confirmed`, `shipped`, `delivered`), new fields on `orders` (`payment_method_id`, `payment_proof_url`, `payment_tx_ref`, `subtotal_mmk`, `delivery_fee_mmk`, `expires_at`). New cron `scripts/cancel-expired-orders.ts` auto-cancels stale `pending_payment` orders after 24h. Under the commit-at-payment stock model (see "Stock oversell" below), cancellation is a pure status flip — no inventory restore. Slip storage moved to Cloudflare R2 private bucket (`slips/<orderId>/<uuid>.webp`), served only via authed `GET /api/v1/orders/[id]/slip` route which streams bytes from R2. See ADR "Photos on Cloudflare R2". Telegram is a backup contact link (`t.me/<username>`), not a primary submission path.

### [2026-06-16] BeeExpress per-division flat-fee shipping
**Status:** Accepted
**Context:** Single nationwide fee subsidises remote orders. Real-time courier integration is overkill at retail volume. Owner uses BeeExpress (Mandalay base) which publishes a flat fee per division.
**Decision:** Persist a `divisions` table seeded with all 15 Myanmar divisions plus Naypyidaw Union Territory. Each row carries `delivery_fee_mmk`, `cod_allowed`, `is_blocked`. Kayah, Kayin, Sagaing are blocked (no BeeExpress coverage). COD allowed only for Yangon + Mandalay AND order total ≤ 500,000 MMK — enforced both client-side (radio hidden) and server-side at order creation.
**Consequences:** Owner can adjust fees from `/admin/divisions` without redeploy. Adding a second courier (separate division tier) is a new column, not a new table.

### [2026-06-16] Inline product CRUD + dual-resize photo pipeline (`/admin/products`)
**Status:** Accepted
**Context:** Adding a new SKU previously required editing `src/data/products.json`, regenerating the SQL bootstrap, and re-importing. Owner asked for an in-browser path so launches don't gate on developer time. Photo handling was completely missing from the admin.
**Decision:** Build a Save/Discard inline editor on `/admin/products`. A "+ New product" button opens a top-of-page form (name → auto-slug, category dropdown, price MMK, tagline, description, swatch via native color picker, stock_qty, low_stock_threshold, featured, is_active). Specs editor is a dynamic list of `{label, value}` rows added/removed in place; the whole record (product + specs) is committed in a single transaction via `POST /api/v1/admin/products`. Editing an existing row uses the same form via expand-row; `PATCH /api/v1/admin/products/[id]` accepts the same shape. Photos live in `/admin/products` as an Expand → 4-slot grid (01..04). Each slot has its own `POST` (replace) and `DELETE` (remove) endpoint. Server runs `sharp` twice per upload: one 1600×1600 WEBP hero (`0X.webp`) and one 600×600 WEBP thumb (`0X-thumb.webp`), both EXIF-stripped. PDP gallery reads the hero; `<ProductCard>` and `<Tile>` read the thumb. Soft delete only via `is_active = false` — no hard-delete path because order history references stay referentially intact.
**Consequences:** Two image files per slot per product = up to 8 disk objects per SKU. Acceptable footprint at retail volume on Hostinger persistent disk. No JSON ↔ DB sync step needed anymore (the JSON files remain only as legacy seed sources for the bootstrap SQL). Adding a new color picker requirement in the future means swapping the native control for a curated palette — schema unchanged.

### [2026-08-16] Burmese locale via `/my/*` route mirror, not i18n middleware
**Status:** Accepted
**Context:** Owner wanted six content pages (contact, shipping, returns, faq, terms, privacy) in Burmese, explicitly not the shop, product, cart or checkout pages. `/about` stays English-only. Next's usual answer — a `[locale]` root segment plus middleware — would match every route including the ones that must stay English, forcing a guard and `generateStaticParams` on paths that have no business knowing about locales.
**Decision:** Mirror only the translated routes under `src/app/my/*` as ~10-line wrappers. Both languages live side by side in a `Dict<T>` inside one file per page under `src/components/pages/`, and the route file passes `locale` plus metadata. `src/lib/i18n.ts` holds `localePath()` and `languageAlternates()`; the sitemap emits both URLs with language alternates and each page emits `hreflang`. `Noto_Sans_Myanmar` loads in the root layout and applies via a `.font-my` utility, since Inter and Fraunces have no Burmese glyphs.
**Consequences:** Adding a locale means copying route wrappers rather than configuring middleware — more files, zero routing surprises. English URLs never change, so existing links and SEO are untouched. Translating a shop page later means either extending this mirror or adopting real i18n routing; the `Dict` copy shape ports either way. Burmese legal copy is AI-drafted and needs a native review before it can be relied on.

### [2026-08-16] Admin orders as a work queue with server-side paging
**Status:** Accepted
**Context:** `/admin/orders` loaded every order in one query and rendered a flat table with a status dropdown per row. No search, no filter, no pagination — fine at 1 order, quietly fatal later. It also gave equal weight to a slip waiting on verification and an order delivered last month, and cancelling (terminal, stock-restoring, customer-emailing) was one stray dropdown click away.
**Decision:** Split into a "needs you" queue plus a paginated ledger. The queue derives three groups from existing columns — `payment_submitted`, `pending_payment` on a COD method, and `confirmed` older than `site_settings.orders_stale_days` — capped at 50 per group, oldest first, each row linking to the detail page rather than acting inline. The ledger runs search, status filter and `LIMIT/OFFSET` paging in SQL (25/page) with state in the URL. Cancel was removed from the list dropdown entirely and given a two-click confirm on the detail page. Terminal rows dim to 45% opacity. All queries live in `src/lib/admin-orders.ts`.
**Consequences:** No schema change — the queue is derived, so there is no "needs attention" flag to keep in sync, and no status history either: only `placed_at` and `updated_at` exist, so steps cannot be individually timestamped. Search reaches all orders but costs a round trip per phrase. The stale threshold needed a settings writer, so `PATCH /api/v1/admin/settings` exists with a per-key allowlist rather than a generic key/value endpoint.

### [2026-08-17] No root `loading.tsx` - streaming would turn every 404 into a soft 404
**Status:** Accepted
**Context:** A root `loading.tsx` was added to give the ten `force-dynamic` routes an instant skeleton. It silently broke status codes: with a loading file present Next streams the response, so the 200 header is already sent by the time `notFound()` runs. `/product/<unknown>` and `/shop/<unknown>` began returning HTTP 200 with not-found content - soft 404s, which search engines treat as thin duplicate pages and may index.
**Decision:** Delete the root `loading.tsx`. Every segment that could reasonably host a skeleton (`/shop`, `/account`, `/admin`) has a `notFound()` descendant that would inherit the same bug, so there is no partial version worth keeping. Verified against a production build, not just dev: unknown product and category slugs return 404, real ones 200, and the branded not-found page still renders.
**Consequences:** Dynamic pages show the previous page until the server responds - acceptable at ~100ms local render. If a page ever needs a skeleton, the safe pattern is to resolve the existence check first and wrap only the slow subtree in `<Suspense>`, so streaming starts after the 404 decision. `error.tsx` is unaffected; it does not stream.

### [2026-08-17] Sitemap reads the database, not the seed JSON
**Status:** Accepted
**Context:** `sitemap.ts` imported the product list from `src/data/products.json`. That file is a legacy seed source and drifts from the database the moment a product is added or retired in `/admin`. In practice the sitemap was advertising four products that no longer existed (`logitech-g304`, both HyperX items, `mouse-wrist-rest`) while omitting the two most recently added ones.
**Decision:** Make `sitemap()` async and read `getAllCategories()` + `getAllProducts()` from `src/lib/catalog.ts`, the same cached DB source the storefront uses. (Superseded: categories are no longer read from the database either, see "Categories are code, not a table".)
**Consequences:** The sitemap costs one cached catalog read per request instead of being fully static, which is irrelevant next to the shop pages already being `force-dynamic`. Retiring a product in `/admin` now removes it from the sitemap within the 60-second catalog cache window.

### [2026-08-17] Categories are code, not a table
**Status:** Accepted (supersedes "Categories move to the database", same day)
**Context:** Categories existed in three places at once: a `categories` table, a hard-coded `CategoryId` union plus `CATEGORY_NAME` map in `src/lib/types.ts`, and a third hard-coded copy as literal `/shop/<id>` links in the footer. They could disagree silently, and the union type checked nothing because every construction site reached it through `as CategoryId` on a plain DB string. The first attempt made the table authoritative and deleted the union. That was the wrong end to collapse toward: the shop sells a fixed set of five things, the owner only ever adds *products*, and there was no admin screen for categories, so "data" meant "hand-written INSERT" rather than anything self-service.
**Decision:** Drop the table. `CATEGORIES` in `src/lib/categories.ts` is an `as const` array of `{ id, name, description }`; `CategoryId` is derived from it, so the union is real rather than asserted. `products.category_id` keeps its column but loses its foreign key, and `isCategoryId()` in the zod schemas of the two admin product routes takes over as the referential check. Nav, footer, shop filter chips and the admin category picker all read the same array. `getAllCategories()` and `getCategoryById()` stay async so callers did not change. `docs/db-bootstrap.sql` was cut back to divisions and payment methods.
**Consequences:** Adding a category is a code change and a deploy, which matches how often it happens (once). One fewer table, one fewer join on every catalog read, and the category picker cannot offer an id the storefront has no page for. The database no longer guarantees `category_id` is valid, so the zod refinement is load-bearing: bypassing the admin API with direct SQL can write a product no shop page will list. `docs/db-bootstrap.sql` drops from 17 tables to 16 and seeds reference data only.

### [2026-08-17] Server errors alert over the existing Telegram bot, not Sentry
**Status:** Accepted
**Context:** Nothing reported server faults. A failed query on `/checkout` or `/admin/orders` surfaced as a broken page to whoever hit it and nowhere else — the owner learned about outages from customers. Sentry is the default answer, but it is a new dependency, a new account, a DSN to manage, and a bill, for a shop that already runs a Telegram bot the owner reads all day.
**Decision:** `src/instrumentation.ts` implements Next's `onRequestError`, which fires for every uncaught server-side error across pages, layouts, route handlers and server actions. It calls `reportError()` in `src/lib/report-error.ts`, which pushes route, method, error, digest and three stack frames to the owner chat through the existing `sendTelegram()`. Faults are fingerprinted on message plus first stack frame and throttled to one alert per 10 minutes, with the tracking map bounded at 200 entries. `sendTelegram()` sends plain text by default; `reportError` is the only caller that opts into `parse_mode: HTML` (it needs `<b>` and `<pre>`) and it escapes every interpolated value. Order and slip alerts carry no markup, so an awkward character in a payment-method name cannot make Telegram reject the message and silently drop the alert. Every path is wrapped so reporting can never throw inside an error handler.
**Consequences:** Zero new dependencies and zero cost, but no stack-trace grouping, no source maps, no searchable history — the alert says something broke and where, not why over time. The digest shown on the customer's error page matches the one in the alert, so a customer quoting it can be tied to a specific fault. Client-side errors are not captured. When traffic makes triage worth real tooling, `@sentry/nextjs` slots into the same `onRequestError` hook and `reportError` becomes a second sink.

### [2026-08-17] Vitest with colocated tests, transitions extracted to one module
**Status:** Accepted
**Context:** No test runner existed. The order status transition tables were duplicated in `orders-table.tsx` and the admin PATCH route with a "keep in sync" comment — the kind of pairing that drifts silently and lets the UI offer a move the API rejects. Two bugs had already shipped this week that a unit test would have caught: a COD customer shown "Awaiting payment", and `getStaleDays` returning 1 instead of 3 because `Number(null)` is `0` and passed a finite check.
**Decision:** Vitest, node environment, no jsdom. Tests colocated next to source as `*.test.ts`. `vitest.config.mts` aliases `@/` and stubs the `server-only` package so server modules import cleanly. Transition tables moved to `src/lib/order-transitions.ts` (`canTransition`, `forwardOptions`) and imported by both consumers, so the test enforces what the comment used to ask for. First six suites cover transitions, validators, status labels, admin-orders input guards, money/time, and the contact route.
**Consequences:** No thresholds enforced until integration tests exist, or unrelated new files would fail the build. Writing the contact-route suite exposed dead code — the honeypot's "silently accept" branch was unreachable because zod already rejected a filled field — which was deleted.

**Updated 2026-08-21:** "no jsdom" no longer holds, narrowly. The add-to-cart work moved two real decisions into components — whether to confirm or report a failure, and whether a second click during an in-flight request becomes a second add — and neither was reachable from a node test. React Testing Library and jsdom are now dev dependencies, opted into per file with a `// @vitest-environment jsdom` docblock so the node suite is unaffected, and `vitest.config.mts` names the JSX runtime under `oxc` (Vitest 4 transforms with rolldown; the `esbuild` setting is ignored). Coverage reporting widened to `src/components/product/**` only, a directory at a time, because including all of `src/components` would drop the global figure ten points while saying nothing true about risk. The bar for a new component test is that the component branches or guards, not that it exists. Suite is now 39 files / 444 tests, coverage ~57%.

**Updated 2026-08-17 (v0.17.0):** the suite has since grown from six files to 28 (280 tests) and global coverage from ~9% to ~42%. The route handlers where a regression costs money or leaks data are now covered directly — checkout pricing, admin stock movement, signup token handling, slip authorisation, the address lock — each verified by mutation rather than by the number going up. Stock commit/release logic *is* covered with the driver mocked, including the `affectedRows === 0` refusal; what remains untested is the SQL itself under real concurrency, which still wants a seeded database. The wishlist, reviews, and admin CRUD routes are deliberately left alone: thin zod-then-write handlers behind a tested `requireAdmin()`, where a bug costs a 500, not money.

### [2026-08-16] Payment-kind-aware customer status labels
**Status:** Accepted
**Context:** `pending_payment` is the initial status for every order, but it means two different things: a wallet customer owes a transfer, a COD customer owes nothing until the courier arrives. The account pages rendered the raw enum without joining `payment_methods`, so COD buyers were told "Awaiting payment" and shown a "View payment instructions" button. `/order/[id]` already branched correctly on payment kind; the account views never did.
**Decision:** `src/lib/order-status.ts` maps `(status, methodKind)` to customer wording plus a "what happens next" hint. COD `pending_payment` reads "Awaiting confirmation", COD `confirmed` reads "Confirmed - pay on delivery". The three account views join `payment_methods` to get the kind. `/account/orders/[id]` also gained a Shopee-style step tracker (`src/components/order/progress.tsx`) whose steps come from the payment kind — wallet has a slip step, COD does not.
**Consequences:** Every customer-facing status render now needs the payment kind, which means a join wherever orders are listed. The step tracker can date only the first and current step, and folds "in transit" into `confirmed`, because the schema has no status history and no `shipped` state. Closing either gap needs an `order_status_events` table.

---

## Security

### Auth + authorization
- Placeholder phase: no auth.
- **Phase 6+:** Auth.js v5 with `@auth/drizzle-adapter`.
  - Strategies: credentials (bcryptjs, 12 rounds) + Google OAuth.
  - Session: JWT in `httpOnly`, `secure`, `sameSite=lax` cookie; 30 days rolling.
  - Email verification required before first sign-in; magic link via Hostinger SMTP, 30-min expiry.
  - Password reset: time-limited token via `verification_tokens` table with `purpose = 'reset'`, 15-min expiry, single-use, superseding (one live link per account). `POST /api/v1/auth/forgot-password` answers identically for a registered and an unregistered address; `POST /api/v1/auth/reset-password` spends the token, and a successful reset also verifies the address and evicts every existing session.
  - Roles: `customer` (default), `admin` (set manually in Drizzle Studio or by SQL). The role gates every `/admin` page and all nine `/api/v1/admin/*` routes, and is read from `users.role` on each request rather than from the JWT.
  - All mutating endpoints check `auth()` server-side, never trust client claims.
  - Brute-force defense: the in-memory limiter in `src/lib/rate-limit.ts`. Upstash is **not** installed — the env placeholders in `.env.example` are for a future swap. Per-endpoint budgets are listed under the threat model below.

### Input validation
- Contact form: client checks the shape, server validates with zod, rate-limits 5/hour per IP, and rejects a filled honeypot field.
- Search query: trim + length cap (200 chars) before passing to Fuse.
- Cart qty: clamp to [1, 99]; reject non-integer; server re-validates against `stockQty`.
- All POST/PATCH/DELETE: zod schema at route boundary, reject on parse fail with structured error.
- Address fields: zod with regex for postal/phone, length caps.
- Review body: 10-2000 chars; strip HTML; rating integer 1-5.
- File uploads: not exposed via API — owner drops files into `public/products/{slug}/` directly.

### Secret management
- `.env.local` is the only place secrets exist locally — gitignored, never committed.
- `.env.example` is committed with empty/dummy values + descriptions for every required key.
- `process.env.X` access only in server components, server actions, and route handlers. Any client-readable env starts with `NEXT_PUBLIC_*` (only `NEXT_PUBLIC_SITE_URL` exists).
- On Hostinger: env vars set via hPanel → Node.js app → environment variables. Never SSH-edit `.env.local` on prod.
- Rotation: AUTH_SECRET, SMTP_PASS, AUTH_GOOGLE_SECRET every 90 days; on any suspected leak immediately.
- The dev MySQL password (`Tkhantiang1`) is local-only. Production MySQL uses a separate generated password set in hPanel; never reuse the dev password in prod.

### Known attack surfaces + mitigations
- **XSS via product copy / reviews:** all user-facing strings render as text via React, never `dangerouslySetInnerHTML`. Review bodies stripped of HTML on write.
- **SQL injection:** Drizzle uses parameterized queries; raw SQL escape hatch only with explicit param binding.
- **localStorage tampering:** cart + wishlist are non-sensitive; server re-validates every cart mutation, qty clamped, stockQty re-checked; wishlist merge validates productIds against `^[a-z0-9-]+$` regex.
- **CSRF:** NextAuth uses double-submit cookie + SameSite=lax. All mutating route handlers require an authed session OR a same-origin guest cart cookie.
- **Open redirect:** all redirect targets validated against allowlist; user input never used in `redirect()` calls.
- **Account enumeration:** sign-in always returns the same generic error on bad password OR unknown email; signup always returns "check your email" regardless of whether email was already registered; forgot-password answers `{ok: true}` either way and writes nothing for an address with no account. The SMTP round trip on the known path is a timing signal the response body cannot hide — the per-IP and per-email budgets below are what make walking a list impractical.
- **Password reset token misuse:** reset and verification tokens share `verification_tokens`, keyed only by address and digest, so a `purpose` column separates them and every read filters on it. Otherwise a link mailed to confirm an address would set a password, and vice versa. Reset tokens are 256-bit, stored as SHA-256, expire in 15 minutes, are single-use, and supersede: one live link per account, and spending it deletes every reset row for that address.
- **Session survival after a reset:** changing `password_hash` cannot invalidate a JWT already in a browser, so `users.password_changed_at` is stamped on every password write and re-checked per request in the `jwt` callback. A token carrying a stale stamp is refused, which is what makes a reset evict a thief rather than only block their next sign-in.
- **Brute force:** rate-limit sign-in 10/15min/email + 20/15min/IP (wraps the Auth.js handler in `src/lib/auth-handlers.ts`), signup 5/hr/IP, reviews 5/day/user, orders 10/hr/user, slip upload 10/hr/user, cancel 5/hr/user, contact 5/hr/IP, email verification 10/hr/IP, forgot-password 10/hr/IP + 5/hr/email, reset-password 10/hr/IP, change-password 10/hr/user, cart writes (add, update qty, remove) 60/min/IP on one shared bucket. Client IP is read from the proxy-appended end of `X-Forwarded-For` (`TRUSTED_PROXY_HOPS`, default 1) so a forged chain cannot mint a fresh bucket.
- **IDOR (orders / addresses / wishlist):** every read/write checks `row.userId === session.user.id`.
- **Privilege escalation to admin:** `users.role` is only set via DB `UPDATE`. No API or UI path can elevate. `requireAdmin()` re-reads `users.role` from the database on every admin endpoint, so **revoking an admin takes effect on their next request** rather than whenever their 30-day JWT expires; a session whose user row no longer exists reads as signed out. `src/lib/admin-guard.ts` is the single place that answers "is this caller an admin" — `session.user.role` is display-only and must not be used for an authorisation decision.
- **Email injection:** all email headers via nodemailer's typed API, never string-concatenated. React Email renders auto-escape interpolated values.
- **Bank-ref forgery:** order ID is server-generated UUID, used as the payment reference; can't be forged client-side.
- **Order status tampering:** only the owner (admin role, server-checked) can flip `status` from `pending_payment` to `paid`/`confirmed`/`shipped`/`delivered`. Customer-side API exposes only slip upload (→ `payment_submitted`) and self-cancel (→ `cancelled`, allowed only while `pending_payment`). Server-enforced state machine rejects illegal transitions.
- **Slip upload abuse:** rate-limit 10/hour/user. File magic-byte sniffed (`image/jpeg`, `image/png`, `image/webp` only — no SVG, no PDF, no HEIC). Server-side resize via `sharp` strips EXIF + caps at 1600×1600. Stored in the private R2 bucket at key `slips/<orderId>/<uuid>.webp` — `orderId` is the server-generated UUID, the basename is also a server-generated UUID, so no user-controlled paths. `orders.payment_proof_url` holds only the basename. Slips served exclusively via `GET /api/v1/orders/[id]/slip`, which auth-checks (`order.userId === session.user.id`, or `isAdmin()` re-read from the database — the owner path costs no extra query) on every read, `GetObject`s from R2, and responds `Cache-Control: private, no-store`. Customer can re-upload only while status is `pending_payment` or `payment_submitted`; replacement deletes the prior R2 object via `DeleteObject` after the new `PutObject` succeeds.
- **Auto-cancel race:** auto-cancel cron updates `status = 'cancelled'` only when current `status = 'pending_payment'` (conditional UPDATE). Concurrent slip upload that flipped to `payment_submitted` first wins; cron skips that row. No stock math runs in the cron because pending orders never held physical inventory.
- **Stock oversell:** order placement does a snapshot `stockQty >= qty` *read* check on every line and rejects with `OUT_OF_STOCK` if any line fails — but does **not** decrement stock. The decrement happens at the single payment-confirmation boundary: when admin flips an order to `confirmed` (wallet OR COD), a transaction runs `UPDATE products SET stockQty = stockQty - qty WHERE id = ? AND stockQty >= qty` per line and rolls back if any affected-rows is 0, returning `OUT_OF_STOCK` to the admin. After commit the route calls `revalidateTag('products')` so the 60-second catalog cache picks up the new stock immediately. Cart-add (`POST /api/v1/cart/items`) does its own live DB read for stock — never the cached catalog — so customers see current numbers. Cancelling a `confirmed` order restores stock; cancelling a `pending_payment`/`payment_submitted` order does not (nothing to restore). Trade-off: tiny oversell window between two checkouts on the last unit. At retail volume the owner sees both pending orders in `/admin/orders` and can call one customer to swap; the system never silently double-sells because the admin-side confirm flip will return 409 for the second order.
- **Photo path traversal:** photo paths constructed only from `slug` field (regex `^[a-z0-9-]+$`); never from user input.
- **Customer PII in admin views:** order and address data renders only inside `/admin/*`, which the layout gates on `role = 'admin'` server-side. No public route exposes the dataset.

### Dependency audit process
- Run `npm audit` weekly (project is on npm, not pnpm — see ADR-09).
- Renovate / Dependabot for automated PRs (set up post-MVP).
- Pin major versions in `package.json`.
- Review every new dep — prefer < 50KB, > 1k weekly downloads, recent maintenance.
- Use `package.json` `overrides` to force-patch transitive vulns when upstream lag exists (currently: `esbuild ^0.28.1` for drizzle-kit nested @esbuild-kit; `next > postcss ^8.5.10` for next's bundled postcss). Re-evaluate on next upstream major bump.
- Last audit: 2026-06-17 — **0 vulnerabilities**. History: 9 → 0 after `next-auth` beta.25 → beta.31, `eslint` 9.17 → 9.39.4, and the overrides above.

### Content Security Policy
- CSP header set in `next.config.mjs` for all routes.
- Production drops `'unsafe-eval'` from `script-src`; dev retains it for HMR/React Refresh (gated on `process.env.NODE_ENV === 'production'`).
- `'unsafe-inline'` still permitted on `script-src` + `style-src` pending nonce middleware. Tightening to nonce-based CSP is a deferred follow-up — requires a `middleware.ts` that issues a per-request nonce and threads it through `<Script nonce={...} />` / `<style nonce={...}>` plus Next's internal injections.


### [2026-08-17] Nonce CSP, at the cost of static generation

**Context:** production `script-src` carried `'unsafe-inline'`, which is most of
what CSP buys against XSS - an injected inline `<script>` simply runs. No XSS
sink exists in the codebase today (no `dangerouslySetInnerHTML`, no `eval`, all
user content renders as escaped JSX), so this was the second layer being off
rather than an open hole.

**Decision:** mint a nonce per request in `src/middleware.ts`, hand it to Next
through the `Content-Security-Policy` request header so it stamps its own script
tags, and drop `'unsafe-inline'`. `'strict-dynamic'` lets the nonced bootstrap
pull the chunk graph without allowlisting chunk URLs.

**Consequence:** `export const dynamic = 'force-dynamic'` in `src/app/layout.tsx`.
A prerendered page is built without a nonce, so under this policy every script on
it is refused and the page arrives as dead markup - verified against `/about`,
which served 32 script tags and zero nonces before the change. Static routes went
from 15 to 2 (`robots.txt`, `sitemap.xml`, neither of which carries script). The
13 affected pages are content pages that issue no database queries, so the added
per-request cost is React rendering only.

**Rejected:** hash-based CSP (Next's inline bootstrap is not stable enough to
pin), and a split policy where prerendered pages keep `'unsafe-inline'` (an
attacker picks the weakest page, so it buys nothing).

**Reversal:** delete the `dynamic` export in `src/app/layout.tsx` and have
`contentSecurityPolicy()` ignore its nonce argument.

### [2026-08-17] Google account linking left at the safe default

**Context:** `allowDangerousEmailAccountLinking: true` handed an existing local
account to anyone presenting a Google profile with the same address, with no
proof they owned the local account.

**Decision:** removed, so Auth.js falls back to refusing the collision with
`error=OAuthAccountNotLinked`.

**Consequence:** a customer who registered with a password and later clicks
"Continue with Google" is refused. `/signin` reads the error off the redirect and
tells them to sign in with their password instead. There is no account-linking UI;
if one is ever added, linking must require an authenticated session first.


### [2026-08-17] Checkout writes nothing until every check has passed

**Context:** `POST /api/v1/orders` inserted the new shipping address before
validating the division, payment method, cart contents and stock. A checkout
that failed any of those left a stray address on the customer's account, and an
unknown `divisionId` reached the foreign key as a 500 instead of the 400 the
division lookup produces.

**Decision:** build the address row in memory, run every validation gate, then
insert it inside the same transaction as the order. The address and the order it
exists for are now written together or not at all.

**Untested:** the repo has no database test harness - `contact/route.test.ts`
mocks its dependencies, which is not practical for the order route's query
surface. The change is ordering-only and was verified by reading the resulting
control flow (no write precedes any `return fail`).


### [2026-08-17] Customer addresses are masked before leaving the system

**Context:** the new-order Telegram alert carried the customer's full email
address, and `sendMail` printed whole message bodies - verification links and
their single-use tokens included - whenever SMTP was unconfigured. Telegram is a
third party; a production log is readable by anyone with host access. A
verification link in either is a live account takeover.

**Decision:** `maskEmail()` in `src/lib/mask.ts` reduces an address to
`mi****om` - first two characters, fixed-width mask, last two. Fixed width so
the address length does not leak; the domain goes entirely, since it is the part
that makes guessing cheap. Applied to the Telegram alert and to the production
mail-failure log. Message bodies are printed only outside production, which is
where reading the verification link off the console is the intended workflow.

**Not masked:** the owner's own `NewOrderAlert` email still carries the full
address - it is the owner's inbox and they need it to contact the buyer. The
Telegram alert is a nudge to go look, not the record.

**Still outstanding:** `reportError()` sends stack traces, which contain internal
file paths, to the same Telegram chat. Owner-only diagnostics, left as-is.

### [2026-08-18] Sale prices are absolute, manual, and computed in one place

**Context:** discounting a product touched the one thing the codebase had been
getting away with by luck. `lines.reduce((sum, l) => sum + l.product.priceMmk *
l.qty, 0)` was copy-pasted across five cart routes, the checkout page and the
order writer. Seven copies of the same expression over the same field are
harmless while there is only one price per product. Introduce a second price and
a single stale copy means the cart quotes a number the order does not charge -
and six of the seven surfaces would still agree, so the bug reads as correct.

**Decision:** one `src/lib/pricing.ts` owns every price calculation, and no
money path computes its own. It takes primitive pairs rather than a `Product`
because the codebase carries two naming conventions (`Product.price` and
`CartLine.product.priceMmk`) and a primitive signature serves both with no
adapter.

`isOnSale(price, sale)` is the single predicate: `sale !== null && sale < price`.
Display and charge both derive from it, so a row that somehow holds a sale price
above the list price is shown as not-on-sale *and* charged the list price. The
two can never disagree, which is the property worth having - not the specific
handling of a bad row.

**Absolute, not percentage:** MMK has no subunit. A percentage reintroduces a
rounding decision into a currency that has none, and stops the admin choosing a
clean shelf price like 490,000. The badge percent is derived and floored, so it
never advertises a bigger discount than was given.

**Manual, not scheduled:** no `sale_ends_at`. That single omission removes
Myanmar's UTC+06:30 offset, a 60-second window where the cached catalog serves an
expired sale, and the question of what happens to a sale that ends while an item
sits in a cart. A shop with one admin can turn a sale off by hand.

**`list_price_mmk_snapshot` is nullable** because NULL is the honest encoding of
"there was no list price distinct from what they paid". It exists so sale
performance is answerable later in SQL - with no analytics on the site, an order
that records only the discounted figure makes a past sale unmeasurable forever.

**Consequences:** cash on delivery now gates on the discounted total
(`orders/route.ts`), so a sale can bring an order under the 500,000 cap that
would otherwise have been refused. Intended: COD risk is the cash the courier
collects. Pinned by a test rather than left to be rediscovered.

Two guards protect the consolidation. `subtotal-parity.test.ts` drives one
mixed cart through all six money paths and asserts they agree with what the
order charges; alongside it a source-text assertion fails if any of those files
regrows a hand-rolled subtotal. The second is a lint rule wearing a test
costume - kept because the compiler cannot reject `l.product.priceMmk * l.qty`,
which stays a perfectly valid number expression.

**Not done:** the invoice email does not show a saving, and past orders render
what was paid with no discount framing. The snapshot data supports both if
wanted later.

### [2026-08-21] Add-to-cart confirms after the server answers, and stops opening the drawer

**Context:** the add button never waited. It called `add()`, then fired
a toast naming the product on the next line, while the store swallowed every
failure the API handed back. That was survivable only for as long as adding to
cart could not fail. It can. `POST /api/v1/cart/items` reads stock live -
deliberately, because the catalog behind the product page is cached - and
answers 409 when the last unit sold in between. It also answers 404 for a
deactivated product and 429 at the 60/min cart budget, and the request can
simply not land. On all four the shopper read "Added - VXE Dragonfly R1 SE+"
over a cart that did not contain it.

Separately, `add()` opened the cart drawer on every call. That put a second
confirmation on screen for something the toast had already said, and dragged the
drawer's own "View cart" footer directly under the toast in the bottom-right
corner, which is how the whole thing got noticed.

**Decision:** `add()` returns `AddResult` (`{ ok: true } | { ok: false; message }`)
and the two callers await it. Success names the product and offers a "View cart"
action; failure shows the server's own message, which is safe to render because
every `fail()` in the cart routes passes a string literal and none interpolate
request data. The optimistic `set({ isOpen: true })` is gone: the drawer opens
from the nav button or the toast action, nothing else. The store's hand-rolled
`fetch` wrapper was dropped for the shared `api()` client, which already unwraps
this envelope and was already tested. Toasts moved to top-center under the nav.

Feedback is now three signals with one job each - badge for *where*, toast for
*what* plus the next step, drawer only on request. The nav badge is `aria-hidden`
and remounts per change to replay its animation; a visually hidden live region
alongside it does the announcing, because the drawer's own qty and remove
buttons raise no toast and would otherwise be silent.

**Consequences:** the shop grid's quick-add is usable in a run now, which is what
that button is for; the cost is one less push toward checkout on the product
page, where the drawer used to surface the subtotal unprompted. Worth revisiting
if add-to-checkout conversion drops. Three dev dependencies came in to test the
button behaviour (see the Vitest ADR above).

**Not done:** an Undo action on the toast. `remove()` exists and it would be
cheap, but adding to a cart is not destructive and the drawer already reverses
it. Also unchanged: the toast's "View cart" opens the drawer while the drawer
footer's "View cart" navigates to `/cart` - same label, two destinations, left
as a copy decision rather than folded into this change.

### [2026-08-21] Guest carts and wishlists join the account at the sign-in event

**Context:** adding to the cart while signed out and then signing in with
Google emptied the basket. The merge was a line sitting after `await signIn()`
in the password form, and the Google button leaves the page entirely, so that
line never ran. Nothing was lost - the `mxl_session` cookie is `sameSite: lax`
and rides the OAuth redirect back - the rows were simply never claimed.

Watching the client for an unauthenticated-to-authenticated transition does not
fix it. The redirect reloads the page, so the store is fresh and the session
resolves straight to authenticated; there is no signed-out render left to notice
a change against. That is the shape of the whole bug, and it is why the
wishlist had it too.

**Decision:** the cart merges in the NextAuth `signIn` event, which fires for
every provider. `mergeGuestCartToUser` takes the id from the event payload
rather than calling `auth()`, which answers null there - the JWT cookie does not
exist until after the event returns.

Nothing in that event may throw, including the error reporting. `@auth/core`
awaits it before attaching the session cookie, so an escaped exception does not
merely skip the merge: it sends a correct password to
`/signin?error=Configuration` with no cookie set at all.

The wishlist cannot follow. Its guest data is in local storage, which no server
can read, so it stays on the client - the hydrator merges on a cold load that
arrives already signed in, and `mergeOnLogin` only clears local storage when the
server took the items. `fetch` resolves for a 500 as happily as for a 200, and
clearing unconditionally left the list held by nobody.

Signing out drops both halves of the guest identity: the cart cookie in the
NextAuth `signOut` event, the wishlist from the sign-out button.

**Consequences:** `POST /api/v1/cart/merge` is off the sign-in path and kept as
an idempotent manual retry. `CartHydrator` rereads on session change, which
costs a round trip on every page load, because `SessionProvider` is handed no
initial session and so every load starts at `loading`; seeding it would fix
that, in `AuthProvider`.

A guest cart still belongs to whoever is holding the browser. That is what a
cookie cart is, and the shopper can already see it on screen before signing in.
Clearing on sign-out narrows it to that.

**Also settled here, because moving the merge onto the auth path made all three
matter:** the guest cart row is selected `for update`, so two sign-ins on one
cookie serialise instead of racing to insert the same product and having the
loser's items swallowed by the event's catch. The per-product write loop became
one statement - unbounded work in a blocking auth callback against a
ten-connection pool, and nothing caps how many products a cart holds - with the
addition done in SQL, `least(qty + values(qty), 99)`, which also removes the
read-then-write race. Four queries plus two per product, down to five. The
wishlist merge route lost a bare `catch {}` meant for duplicates that swallowed
stale ids and database blips just as quietly while still answering `ok`.

`values()` is deprecated from MySQL 8.0.20. It still works, and MariaDB has no
alias form, so it stays until the deploy target rules MariaDB out.

**Not done:** row locks on the account cart. Two merges from *different*
cookies into one account still race, but the upsert makes that a wrong total
rather than a lost error, and it needs two browsers signing into one account
within the same moment.

### [2026-08-22] The cart refuses what the shop cannot fill, and says so early

**Context:** the cart took more than existed. `POST /cart/items` checked
`stockQty <= 0` and nothing else, so two on the shelf and a request for five
went in. `PATCH /cart/items/[productId]` checked nothing at all - the zod
ceiling of 99 was the only limit. Neither is where the money is, so nothing was
oversold: `POST /orders` compared quantities and refused. But it refused at the
last click, after an address had been typed.

That refusal answered `OUT_OF_STOCK:vxe-dragonfly-r1-se` in the `message` field
and `checkout-form.tsx` put it on screen verbatim. It also returned on the first
bad line, so three dead lines meant three attempts. And it compared quantities
only - `isActive` was read when adding to the cart and never again, so a product
retired in /admin still ordered while stock remained.

**Decision:** one predicate in `src/lib/cart-availability.ts` answers "can this
line be ordered" - retired, sold out, or fewer left than asked for, carrying the
remainder so a fix can be offered as one button. It is structural rather than
importing `CartLine`, because that type is declared either side of the
server/client boundary and both shapes satisfy it.

Naming the rule once is the point. The inconsistency it replaces existed because
nothing named it: one route grew a check, its sibling never did, and a third
compared a different field.

Both cart write routes enforce it. Adding is checked against the total the line
would reach, not the quantity requested, because `addCartItem` sums into what is
there. The order route returns every refused line at once in a new `details`
field on the error envelope - `fail()` gained an optional fourth argument - so
`message` can go back to being a sentence for a person.

Blocked lines are greyed everywhere a line renders, the `+` stops at stock, and
both ways forward shut: `/cart`'s Checkout link and checkout's Place order. The
checkout summary carries the fix inline rather than sending someone back to
`/cart`, because that form holds a half-typed address.

**Consequences:** the failure is now early and legible. It is not prevented -
stock is not reserved and this changes nothing about that. Two customers can
still hold valid carts for the last unit, and the conditional decrement at
payment confirmation remains the only thing that arbitrates them. Everything
here is about not wasting the customer's time.

**Not done:** `POST /cart/items` reads then writes with no lock between, so two
requests landing together can both pass and leave the line above stock. Closing
it means holding a row lock across `addCartItem`, changing that function's
signature and every caller. Left because the cart is not the enforcement point,
and a cart that has overshot now arrives at a checkout built to show it and
offer the reduction. Said so in the route, so the next reader does not assume
the check is atomic.
