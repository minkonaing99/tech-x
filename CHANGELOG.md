# Changelog

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning: SemVer.

### [0.19.0] - 2026-08-23
- **Two products, side by side, at `/compare?a=<slug>&b=<slug>`.** A server-rendered table: photo, name, price, average approved rating, then the specs. Same category only, exactly two products. A missing, unknown, repeated or cross-category slug 404s - the slugs arrive in a query string, so none of those are unreachable. `noindex, follow` and no sitemap entry, because the pair count grows as n² and every page repeats spec text the two product pages already carry.
- **The spec table unions the labels rather than intersecting them.** `product_specs` is free-form per product, so two mice in the catalog share `Sensor` and `Weight` and disagree on everything else. `compareRows()` walks A's specs in their `sort_order`, appends the labels only B carries, and renders a hyphen plus an `sr-only` "Not listed" where a side has nothing. Intersecting instead would empty the table for most pairs. No diff highlighting: string equality is the only test available on free-form values, so `< 60 g` against `60g` would read as a difference.
- **Entry is a `<details>` disclosure, not a selection tray.** One link per rival product in the category, and again under the compare table with the left-hand product pinned so the right can be swapped. No client state, no localStorage, no new dependency, and every option is a real link. The control renders nothing when the category holds no second product, which is three of five categories in the bootstrap set.
- **The compare control is a button in the product page's action row**, next to Add to cart and the wishlist heart, carrying a count of how many rivals it can open. It first shipped as a bare disclosure at the foot of the specification list, where it read as one more content section and gave no reason to open it - a feature nobody can find is a feature that is not there.
- **`getProductRatings()` added to `src/lib/catalog.ts`** - `AVG` + `COUNT` over approved reviews only, grouped, cached 60s under a `reviews` tag against `idx_reviews_product_status`. Two aggregate rows, not two review lists. Nothing revalidates that tag yet, so an approval in `/admin` takes up to a minute to reach the table.
- No schema change: `docs/db-bootstrap.sql` is untouched.

### [0.18.1] - 2026-08-22 (docs only)
- **Deleted `docs/user-testing.md`.** A 445-line manual test suite, unedited since 17 August, carrying a "prerequisites that currently block two suites" section and a "known issues - do not re-report" list. Both are claims that go false without anyone noticing, and neither had been checked against the app in a month.
- **Deleted `docs/AUTH-SETUP.md`.** Its SMTP mailbox and Google OAuth client steps moved into `docs/SETUP.md` first - they were the only copy in the repo, and `docs/DEPLOY.md` sent readers to them from three places. Those references, and one in `docs/ADMIN.md`, now point at `SETUP.md`.
- Docs folder is 16 files, down from 19.
- **`docs/DEPLOY.md` rewritten as a reference, 253 lines to 108.** It was a walkthrough for someone who had never deployed it. What is kept is what cannot be guessed: the hPanel app-slot values, the env table, the three-directory reassembly a `standalone` build needs, the pnpm-ENOENT and prod-install traps, the SSH tunnel, the backup cron, and the fact that there is no migration runner. The click-by-click hPanel navigation and the two smoke checklists are gone.

### [0.18.0] - 2026-08-22
- **The cart refuses what the shop cannot fill.** `POST /cart/items` checked `stockQty <= 0` and nothing else; `PATCH /cart/items/[productId]` checked nothing at all, so one unit in the warehouse and a quantity of 99 was accepted. Both enforce stock now, and adding is measured against the total the line would reach rather than the quantity requested, because `addCartItem` sums into what is already there.
- **`isActive` is checked past the point of adding.** It was read when a product went into the cart and never again, so a product retired in `/admin` still ordered while stock remained.
- **`POST /orders` names every refused line, in words.** It returned on the first one and answered `OUT_OF_STOCK:<productId>` in the `message` field, which `checkout-form.tsx` showed to the customer verbatim. The ids now ride in a `details` field on the error envelope - `fail()` gained an optional fourth argument - and the message is a sentence.
- **Blocked lines are greyed in the drawer, `/cart` and checkout**, with the reason beside them, and the `+` stepper stops at stock. `/cart`'s Checkout link and checkout's Place order both shut while a line is marked. The checkout summary carries "Reduce to N" and "Remove" inline, so fixing a line does not cost a half-typed address.
- **Guest carts and wishlists survive every sign-in.** The cart merge was a line after `await signIn()` in the password form, which the Google redirect never reached; it runs in the NextAuth `signIn` event now. The wishlist stays client-side because local storage is not visible to a server, and it no longer clears itself when the server refuses the merge. Both are dropped on sign-out so they cannot follow the next person into their account.
- **The guest-cart merge is one locked, batched statement.** It was a read plus two writes per product inside the blocking sign-in callback, against a ten-connection pool, with no lock - so two sign-ins on one cookie could race and lose items silently.

### [0.17.2] - 2026-08-22 (docs only)
- **`CHANGELOG.md` moved to the repo root.** It had been living as a section inside `docs/SETUP.md`, which was four documents in one file: 200 lines of setup, a duplicate testing doc, 200 lines of changelog, and 145 lines of June planning notes.
- **`docs/SETUP.md` is setup again**, and points at `docs/TESTING.md`, `CHANGELOG.md` and `docs/DEPLOY.md` for the rest.
- **Deleted the testing section that lived in `SETUP.md`.** It contradicted `docs/TESTING.md` and was wrong on every checkable claim: it named Playwright (never installed), an 80% coverage threshold enforced in CI (no threshold is configured; the real figure is 61%), `cart-store.getState().reset()` (no such method), a `vitest.setup.ts` (no such file), and localStorage arriving free with jsdom (it does not, under Vitest 4).
- **Deleted `docs/PLAN.md`.** A phase checklist with every box ticked through Phase 10, untouched since June, whose own status pointer described work shipped on 2026-06-17 - and which instructed agents to read it before starting work.

### [0.17.1] - 2026-08-19 (docs only)
- **`README.md` written.** The repo had no root README. It now covers what the store is, the constraint that shaped it (Myanmar retail has no card gateway, so the money path is a bank transfer plus a slip a human verifies), the storefront and operator feature sets, and the engineering decisions worth defending: the order state machine and its single stock-commit boundary, server-side price and ownership recomputation, per-request role reads, slip handling, the CSP/origin-gate/rate-limit layer, and why coverage sits where it sits. No deploy or environment instructions - those stay in `docs/DEPLOY.md` and `docs/SETUP.md`.
- **`docs/order-workflow.html` added.** Self-contained interactive diagram of the order lifecycle: 20 nodes from `/shop` through `delivered`, covering the coverage-block and wallet-versus-COD branches, slip upload to R2, admin verification, the 24h auto-cancel sweep, and the stock-restore edge out of `confirmed`. Hover gives the runbook note for each step; clicking a node isolates its connections. No dependencies, opens offline.
- `docs/PAYMENT.md` status-machine section and the `docs/ADMIN.md` see-also list now point at the diagram.

### [0.17.0] — 2026-08-17 (testing-v2.0)
- **Returns policy corrected across the whole site.** The site promised "one month to refund or replace" plus change-of-mind returns; the real policy is a **two-week** window in which merxylab settles a **factory fault** itself, after which it becomes a manufacturer warranty claim that merxylab files with the company on the customer's behalf. Change-of-mind returns do not exist and now appear under "What we cannot take back" rather than being silently dropped. Updated in six files and **both locales**: `pages/returns.tsx` (section retitled "The one-month rule" → "The first two weeks", en + my), `pages/faq.tsx` (two answers renumbered, one flipped from yes to no, one new "after the first two weeks" entry, en + my), `pages/about.tsx`, `home/why.tsx`, `home/stats.tsx` (the headline stat read "1 month", now "2 weeks"), and `RETURNS_META` for both locales. Three new Burmese strings use ထုတ်လုပ်မှု ချွတ်ယွင်းချက် for "manufacturing defect" and **still want a native-speaker check** — it is warranty language.
- **Admin role is read from the database, not the JWT.** `session.user.role` was stamped in at sign-in on a 30-day token, so demoting an admin left their old token asserting `admin` until it expired. New `currentRole()`/`isAdmin()` in `src/lib/admin-guard.ts` re-read `users.role` per request; `requireAdmin()`, the `/admin` layout, and cross-user slip reads all use it. A session whose user row no longer exists now reads as signed out. The owner path in the slip route short-circuits, so it costs no extra query.
- **Rate-limit store bounded.** `src/lib/rate-limit.ts` only ever inserted buckets, holding one per address for the life of the process. Now capped at 10,000 keys, sweeping expired buckets first and then those nearest their reset.
- **`POST /api/v1/auth/verify` rate-limited** at 10/hour/IP — it was the only unauthenticated endpoint spending database queries with no ceiling. Keyed by IP, not email, so nobody can exhaust a specific victim's verification budget.
- **Cart writes limited.** `PATCH`/`DELETE /api/v1/cart/items/[productId]` had no limiter while the sibling `POST` did; all three now share one 60/min bucket.
- **CI build fixed — it had been failing on every push.** `/sitemap.xml` is statically generated and reads the catalog, so with no database reachable the query threw and killed the export. `src/app/sitemap.ts` now falls back to the static and category routes. `docs/TESTING.md` had asserted the opposite ("nothing queries at build time"), which is what let this sit unnoticed.
- **Telegram alerts can no longer be silently dropped.** `sendTelegram()` sent everything with `parse_mode: HTML`, so an interpolated payment-method name containing `<` made Telegram reject the whole message. Markup is now opt-in and `reportError` — which escapes its values — is the only caller that asks for it.
- **Sitemap log hygiene.** The catalog-failure warning logged the whole driver error, whose `cause` chain carries the database username; it now logs the message only.
- **Duplicated phone rule consolidated.** `PHONE_REGEX` was restated in three API routes while `validators.ts` kept it private and `address-fields.ts` — the module that exists to stop exactly this drift — did not cover phone. Now one `phoneField` schema. Side effect: checkout returns "Phone must be +959XXXXXXXXX" instead of zod's default `Invalid`, so the three routes finally agree on the message.
- **Why-section copy rewritten** to name the five categories and drop two things `brand.md` forbids: a "built to last" phrasing that reads as manufacturing, and an intro that positioned apologetically against gaming.
- **Tests: 174 → 280**, across 10 new suites covering checkout pricing, stock movement, signup token handling, slip authorisation, the address lock, the rate-limit store, and the sitemap fallback. Each new route suite was verified by mutation — reverting the guard it protects and confirming exactly the intended test fails.
- **Audit result:** 0 critical, 0 high, 3 medium (all fixed), `npm audit` 0 vulnerabilities. Still open by decision: the CSP `img-src` `https:` wildcard, pending confirmation that all product images come from `NEXT_PUBLIC_CDN_URL`.

### [0.16.4] — 2026-06-17 (shipped to production)
- **Hero showcase photo bug fixed.** Switching tiles in the home hero could leave the big square blank (needing a toggle to a swatch tile and back to recover) and, with multiple photographed products, stacked old photos behind the new one (obvious once transparent PNGs were involved). Root cause: the big photo rode inside the shared-element `layoutId` flight, so Framer's layout projection stranded a loading `<Image>`; keying the image per product still left old instances mounted under `LayoutGroup`. Fix: the photo no longer participates in the flight - the flight morphs only a solid swatch, and the big square renders a single persistent `<Image>` whose `src` tracks the active product (no per-product key, no motion wrapper), so exactly one `<img>` ever exists and stacking is impossible. No-photo products point that element at a 1x1 transparent pixel (`unoptimized`) to keep its identity stable. Thumbnails render their own static photo over the flight swatch. Verified locally by temporarily flagging three featured products with photos, then reverted.

### [0.16.3] — 2026-06-17 (shipped to production)
- **Refactor-clean + security audit pass.** Removed `getProductById` from `src/lib/catalog.ts` (zero callers; `getProductBySlug` is the only lookup used). knip/ts-prune/depcheck otherwise surfaced only framework-convention false positives (Next page/layout/route defaults, drizzle config, schema re-exports, react-email default exports for the preview server, and eslint which powers `npm run lint`). Full OWASP-oriented security audit run: 0 critical / 0 high / 0 medium. Secrets gitignored, Drizzle `sql\`\`` interpolations parameterized, bcrypt for passwords (sha256 only for high-entropy tokens), all 9 admin API routes role-gated + rate-limited, full security header set present, `npm audit` (prod) 0 vulnerabilities. typecheck + lint green.

### [0.16.2] — 2026-06-17 (shipped to production)
- **Homepage copy reframed from maker to curator voice.** The store resells peripherals; it does not manufacture them, but the copy read like a maker ("when we build keyboards", "tested per board", "the sound profile we promised"). Rewrote: Stats row (was fake maker metrics 50K+/200+/99%; now store facts - `Genuine` manufacturer warranty / `1 month` refund-or-replace / `Nationwide` delivery from Mandalay), the `Why` section (headline "Made for..." -> "Chosen for the desk, not the tournament", curator intro, and the four accordion items rewritten as curation reasons + the real warranty policy: manufacturer warranty on every product plus a 1-month local refund/replacement, no overseas shipping), the `CTABanner` ("When we build keyboards..." -> "We keep the quiet ones, so you skip the noise" + curator body), and the `Why` showcase caption.
- **Newsletter offer changed** from "30% off Edition 01" to "10% off your first order" (headline + success toast).
- **Newsletter vertical centering.** The card was stuck to the top of the leftover space below the page content. Homepage now wraps its sections in `flex h-full flex-col` and the newsletter `<section>` is `flex flex-1 flex-col justify-center` so it grows into the remaining height and centers its card when the page is shorter than the viewport; on a tall page it just gets symmetric `py` instead of being top-stuck.
- **Stats value font reduced** from 44/56px to 28/34px - the values are now words ("Nationwide") rather than short numbers and were overflowing the column.
- **Fixed two dead homepage references.** The `Why` showcase image and the `CTABanner` pointed at `mxk-alice-clay` / `mxk-65-walnut`, which are not in the current DB, so the CTA returned null and the Why image fell back to a blank swatch. Repointed to `keychron-k2-pro` (Why) and `nuphy-halo65` (CTA).

### [0.16.1] — 2026-06-17 (shipped to production)
- **Build fix:** Hostinger production build failed with `spawn pnpm ENOENT`. Root cause was the server-side build running a production-only install (no devDependencies), so `next build` could not find `typescript` / `eslint` and tried to auto-install them - shelling out to **pnpm**, which is not present on Hostinger (project is npm-only, ADR-09). Two-part fix: (1) removed the stale `pnpm-lock.yaml` (its presence made Next's auto-installer pick pnpm over npm; only `package-lock.json` remains); (2) moved `typescript`, `@types/react`, `@types/node` from devDependencies into dependencies so Next's TypeScript setup check passes against the prod-only install, and set `eslint.ignoreDuringBuilds` + `typescript.ignoreBuildErrors` in `next.config.mjs` so the build never invokes eslint or the type checker on the host. Lint + type checks still run locally via `npm run lint` / `npm run typecheck` before every push. No application code touched.

### [0.16.0] — 2026-06-17 (shipped to testing)
- Home `Hero` showcase redesigned to a deck/stable-slot model. The right side was a portrait tile + a vertical column of 4 square thumbs; it is now a square big tile + a row of 4 square thumbs beneath (same desktop + mobile, tap-only). The active featured product fills the big square, and its thumb slot in the row renders as a recessed carved well (inset `box-shadow` + darker swatch overlay) instead of a duplicate tile. Clicking another thumb promotes that product to the big square via a Framer Motion shared-element transition (`layoutId` keyed per product id) while the previous one shrinks back into its socket; thumb positions are stable (no reshuffle). `prefers-reduced-motion` disables the flight and falls back to a crossfade. The headline inline swatch chip and the "See the {name}" link still track the active product. The mobile carousel dots were removed - the visible thumb row replaces them. Scope limited to `src/components/home/hero.tsx`; `Tile` unchanged. Verified manually via dev server (project has no test runner). Follow-up polish: thumbs shrunk to fixed 56/64px squares (was a full-width 4-col grid) with a resting shadow + hover lift. Flight smoothness fix - the flying element is now a bare swatch/photo (no text or border) so Framer's layout-scale never distorts the label or corners; the big-square label is a separate fade overlay, the remount `key` on the big node was removed, and the transition uses the site's standard ease tween instead of a stiff spring.

### [0.15.0] — 2026-06-17 (shipped to production)
- Order state machine collapsed. `paid` and `shipped` removed entirely. New flow for both wallet and COD: `pending_payment` → (wallet only) `payment_submitted` → `confirmed` → `delivered`, with `cancelled` reachable from any non-terminal state. `confirmed` is the single payment-commit boundary: decrements stock per line, sends the customer the `OrderInvoice` email, and triggers `LowStockAlert` if threshold breached. `orders.status` MySQL enum, the Drizzle `ORDER_STATUSES` tuple, the zod schema in `PATCH /api/v1/admin/orders/[id]`, and both transition tables (wallet + COD) all trimmed to the same five values. `docs/db-bootstrap.sql` ships the trimmed enum from the start; user-side reimport recommended.
- New admin order detail page at `/admin/orders/[id]` (server-rendered). Shows customer, payment method + account info + tx ref, full shipping address with division, item lines + subtotals/total, and the uploaded transfer slip embedded inline via the existing authed `GET /api/v1/orders/[id]/slip` stream. Action buttons live in their own client component outside any selector — context-aware per status and method kind (Confirm payment / Reject slip / Confirm order phone-verified / Mark delivered / Cancel). Admin orders table row now links here instead of the customer view.
- New `DELETE /api/v1/admin/products/[id]`. Hard-delete a product if no `order_items` reference it — cascades `product_specs`, `reviews`, `cart_items`, `wishlists` via FK; best-effort `DeleteObject` for all eight R2 photo keys. Returns 409 if order history exists; the admin client auto-falls-back to `PATCH isActive=false` (soft delete). New trash icon on each row in `/admin/products`.
- Catalog cache invalidation. `PATCH /api/v1/admin/orders/[id]` now calls `revalidateTag('products')` whenever a transition moves stock (commit or cancel-from-commit) so the 60-second `unstable_cache` wrap in `src/lib/catalog.ts` repopulates immediately. `POST /api/v1/cart/items` no longer reads through the cache for its stock check; it does a direct `db.select()` on `stockQty + isActive`. Closes the "Out of stock" false positive on cart-add seen on `/shop` after admin confirms an order.
- **Bug fix:** `affectedRows` lookup. The admin order PATCH transactional decrement always threw `OUT_OF_STOCK` because the code read `res.affectedRows` on the drizzle/mysql2 result, which is actually `[ResultSetHeader, FieldPacket[]]` (a tuple). `affectedRows` lives on `res[0]`. Real bug behind the spurious 409s admins saw on Confirm payment. Defensive read now handles both shapes.
- UI: admin product photo grid now reads `PHOTO_BASE` (env-derived CDN URL) instead of the hardcoded `/products/<slug>/...` path. Same component now matches `<Tile>` and `<Gallery>` everywhere. Admin orders dropdown filters STATUSES to the row's allowed transitions per wallet/COD method.
- Logo `public/logo.png` regenerated as 8-bit RGBA with near-white pixels alpha-zeroed so it sits flush on the cream surface without a halo. Same 400×400.

### [0.14.0] — 2026-06-17 (shipped to testing)
- All admin-uploaded media (product photos, payment-method QRs, customer slips) now stored in Cloudflare R2 instead of the Hostinger filesystem. Easy Deploy's build-frozen `public/` made runtime disk writes silently invisible; R2 sidesteps the hosting model entirely. See TECH ADR "Photos on Cloudflare R2 (supersedes 'Photos on filesystem')".
- Two buckets: `merxylab-public` (products + QR, served via `cdn.merxylab.com` custom domain) and `merxylab-private` (slips, streamed back through the existing `GET /api/v1/orders/[id]/slip` route).
- New env vars: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_PUBLIC_BUCKET`, `R2_PRIVATE_BUCKET`, `NEXT_PUBLIC_CDN_URL`. See `.env.example` and the new "Setting up Cloudflare R2" section below.
- New module: `src/lib/r2.ts` (`putPublic`/`putPrivate`/`deletePublic`/`deletePrivate`/`getPrivateBytes`) and `src/lib/cdn.ts` (`r2PublicUrl` — accepts R2 keys OR legacy disk paths, builds a fully-qualified URL using `NEXT_PUBLIC_CDN_URL`).
- Routes rewired: `POST /api/v1/admin/products/[id]/photos/[slot]` (parallel hero + thumb PutObject), `POST /api/v1/admin/payment-methods/qr` (also adds a `DELETE` companion), `POST /api/v1/orders/[id]/slip` (PutObject to private bucket), `GET /api/v1/orders/[id]/slip` (`GetObject` from R2 after auth check). `products.has_photos` no longer relies on `readdir`; the slot-01 mutation in each route sets it directly.
- DB stores R2 keys (not URLs) in `payment_methods.qr_image_url` and `orders.payment_proof_url`. Render sites pass values through `r2PublicUrl()` server-side before handing them to client components. Legacy `/path/file.webp` values still resolve unchanged.
- `next.config.mjs` adds `images.remotePatterns` for the CDN host so `<Image>` accepts the external src.
- Deleted: `src/lib/slip-storage.ts` (was disk-based path resolver).

### [0.13.8] — 2026-06-17 (shipped to testing)
- Cut customer email count from 6 → 2 per happy-path order.
  - Dropped: `order-placed`, `slip-received`, `order-paid`, `order-shipped` templates. No longer sent.
  - Added: `order-invoice.tsx` (sent at admin → `paid`/`confirmed` with itemised totals + payment method — replaces both the placement email and the bare "payment received" email) and `order-delivered.tsx` (sent at admin → `delivered`).
- Owner mailbox unchanged: `new-order-alert`, `slip-submitted-alert`, `low-stock-alert` still fire as before (the operational signal lives there).
- `docs/PAYMENT.md` "Customer alerts" rewritten.

### [0.13.7] — 2026-06-17 (shipped to testing)
- Bootstrap fix: product seed now ships `has_photos = 0` for every row. Previous bootstraps wrote 1 unconditionally, which made `next/image` 500 on the missing `/products/<slug>/01-thumb.webp` files in any fresh deploy. Owner upload via `/admin/products` flips the flag back to 1 per-product via `syncHasPhotos()`. Maintenance SQL block added to `db-bootstrap.sql` for prod DBs already seeded with the wrong value.
- Wallet slip upload UI: the bare native `<input type="file">` rendered nearly invisible on the cream surface. Replaced with hidden-input-plus-styled-label pattern + filename readout, matching the admin photo grid. Same JPG/PNG/WEBP/8MB constraints, just a button you can actually see.

### [0.13.6] — 2026-06-17 (shipped to testing)
- Stock commit moves to payment confirmation, not order placement. Closes the "ghost reservation" failure mode where checkout decremented stock but slip upload 500'd (e.g. during the sharp/libvips outage) leaving items stuck.
  - `POST /api/v1/orders` now does a read-only `stockQty >= qty` snapshot check per line and returns 409 `OUT_OF_STOCK` if any line fails — **no UPDATE on `products`**. Order row is inserted in `pending_payment` with no inventory side effects.
  - `PATCH /api/v1/admin/orders/[id]` now performs the decrement transactionally when transitioning to `paid` (wallet flow) or `confirmed` (COD flow), with a `stockQty >= qty` guard per line; admin gets 409 `OUT_OF_STOCK` if anything was oversold in the race window. Cancelling out of `paid`/`confirmed` restores stock.
  - `POST /api/v1/orders/[id]/cancel` and `scripts/cancel-expired-orders.ts` no longer touch stock — pending orders never held any.
  - `LowStockAlert` email now fires on payment-confirmation (where the deduction actually happens), not at order placement.
- DB reset SQL for prod (one-off cleanup of phantom pending orders from the sharp-500 era) is in `docs/db-bootstrap.sql` under "Maintenance: release phantom-held stock + cancel stuck orders". Uncomment + paste into phpMyAdmin to release held stock + cancel stuck orders. Skip on fresh DBs.
- TECH.md "Stock oversell" + Phase 9 ADR consequences updated. SCHEMA.md endpoint descriptions for POST `/orders`, POST `/orders/[id]/cancel`, and the order-status flow section updated.

### [0.13.5] — 2026-06-17 (shipped to production)
- `sharp` ^0.35.1 → ^0.34.5. Hostinger CloudLinux glibc is below the 2.28 floor sharp 0.35's libvips 8.18 needs (`ERR_DLOPEN_FAILED: libvips-cpp.so.8.18.3`), so every upload route (product photo, slip, QR) 500'd through Passenger as an hPanel gateway error. Sharp 0.34.5 bundles libvips 8.17.3 (per `@img/sharp-libvips-* 1.2.4`) which CloudLinux satisfies. Lockfile regenerated; `@img/sharp-linux-*` variants are now recorded so Hostinger's `npm install --omit=dev` resolves linux binaries from a darwin-generated lockfile. Stale `allowScripts` entries for esbuild 0.18/0.25 and sharp 0.35 trimmed.

### [0.13.4] — 2026-06-17 (docs only)
- Doc sweep: replaced every stale `pnpm` command with `npm` equivalents across SETUP, DEPLOY, PLAN, AUTH-SETUP, LIGHTHOUSE, TECH (project standardised on npm — TECH ADR-09). Historical mentions inside ADRs + Phase 1.1 scaffold notes left as-is.
- Slip storage references corrected in SCHEMA, PAYMENT, TECH ADR-Phase-9 consequences, PLAN Phase 9.8 task: now point at `<repo>/private-uploads/slips/<orderId>/<uuid>.webp` + the streaming `GET /api/v1/orders/[id]/slip` route. Stale `public/slips/...` text removed.
- SCHEMA.md endpoints table gains a row for `GET /api/v1/orders/[id]/slip`.
- SETUP.md adds a "Database bootstrap — fresh DB via SQL" section: paste `docs/db-bootstrap.sql` into phpMyAdmin (or `mysql <` locally) for a fresh install. Recommended path over `npm run db:seed` for prod deploys.
- `docs/db-bootstrap.sql` header rewritten — drops reference to deleted `scripts/dump-sql.ts`; file is now hand-maintained from `src/db/schema/*.ts` + `src/data/*.json`.

### [0.13.3] — 2026-06-17 (shipped to testing)
- Disk-only hardening pass (no R2 yet — see TECH.md decision).
- **Slips moved out of `public/`.** New storage path: `<repo>/private-uploads/slips/<orderId>/<uuid>.webp` (gitignored). `orders.payment_proof_url` now stores the bare basename, not a path. Existing rows with legacy `/slips/<id>/<uuid>.webp` values still resolve via `slipBasenameFrom()` which strips to basename.
- New route: `GET /api/v1/orders/[id]/slip` — auth-gated (order owner OR admin), reads from `private-uploads/`, streams `image/webp` with `Cache-Control: private, no-store`. Replaces the static `/slips/...` URL that previously lived under `public/`.
- `src/lib/slip-storage.ts` centralises slip path resolution + basename validation.
- `next.config.mjs` adds long-lived cache headers: `/products/:path*` → `public, max-age=31536000, immutable` (admin UI cache-busts on replace via `?v=`), `/payment-qr/:path*` → `public, max-age=2592000` (30d). Single biggest perf win without a CDN.
- `src/app/order/[id]/page.tsx` slip render now points at the streaming route, not the public path.

### [0.13.2] — 2026-06-17 (shipped to testing)
- Security audit: patched all outstanding HIGH/MEDIUM npm-audit findings. `npm audit` now reports **0 vulnerabilities** (was 9: 2 high, 5 moderate, 2 low).
- `package.json` deps:
  - `next-auth` `5.0.0-beta.25` → `5.0.0-beta.31` (closes `GHSA-5jpx-9hw9-2fx4` email misdelivery).
  - `eslint` `9.17.0` → `9.39.4` (closes `GHSA-xffm-g5w8-qvg7` plugin-kit ReDoS).
- `package.json` overrides:
  - `esbuild: ^0.28.1` forces drizzle-kit's nested `@esbuild-kit/core-utils` off vulnerable esbuild (`GHSA-gv7w-rqvm-qjhr` RCE via NPM_CONFIG_REGISTRY + `GHSA-67mh-4wv8-2f99` dev-server SSRF). Dev-only path, but cleaned up.
  - `next > postcss: ^8.5.10` forces next's bundled postcss off `GHSA-qx2v-qp2m-jg93` CSS stringify XSS.
- `next.config.mjs` CSP tightened: production `script-src` drops `'unsafe-eval'`. Dev keeps `'unsafe-eval'` for HMR/React Refresh. `'unsafe-inline'` still present pending nonce middleware (deferred).
- typecheck ✅, build ✅. Held with Phase 10 — production push pending owner smoke-test.

### [0.13.1] — 2026-06-17 (shipped to testing)
- `refactor-clean` pass:
  - Deleted unused `scripts/dump-sql.ts` (docs/db-bootstrap.sql already shipped).
  - Unexported `EMAIL_REGEX` + `PHONE_REGEX` in `src/lib/validators.ts` — used only internally by `isEmail`/`isMyanmarPhone`.
- knip + depcheck residuals reviewed; remaining hits are false positives (Tailwind v4 PostCSS pipeline, React 19 types, Next lint deps, tsconfig path alias `@emails/*`, React Email default exports kept by convention).

### [0.13.0] — 2026-06-17 (shipped to testing)
- Phase 10 implemented and pushed to `testing` + `main` at `6bb7623`. Production held until owner smoke-tests.
- New endpoints: `POST /api/v1/admin/products`, extended `PATCH /api/v1/admin/products/[id]` with specs REPLACE, `POST` and `DELETE /api/v1/admin/products/[id]/photos/[slot]`. `sharp` dual-resize per upload: 1600×1600 hero + 600×600 thumb, EXIF stripped. Rate-limit 30/hr/admin on photo uploads.
- New lib: `src/lib/slugify.ts` (lowercase + diacritic strip + non-alnum to `-` + slice to 80; exports `SLUG_REGEX`).
- New UI: `+ New product` button at top of `/admin/products` opens `ProductDetailsForm` inline. Each existing row gets two expand buttons — `Edit details` + `Edit photos`. Save / Discard pair per expanded section, no auto-save.
- `ProductDetailsForm`: name → auto-slug (only while user hasn't customised it; slug is read-only in edit mode); category select; price MMK; tagline; description; swatch via `<input type="color">` + hex input; stock + threshold; active/featured toggles; dynamic specs editor (`+ row` / trash).
- `ProductPhotoGrid`: 4 fixed slots (01..04). Each cell shows the 600px thumb over the swatch-tinted background (cache-busted via `?v=`). Per-slot Replace + Remove. Client validates file type + size before sending.
- Render: `<Tile>` got a `useThumb` prop (default true for grid contexts). Hero + PDP gallery swatch-only fallback opt in to `useThumb={false}`. PDP gallery thumb strip switched to `0X-thumb.webp`.

### [0.12.0] — 2026-06-16 (docs only — implementation pending)
- Phase 10 design locked: inline product CRUD + photo pipeline on `/admin/products`.
- Adds `+ New product` button opening `ProductDetailsForm` with name → auto-slug, category select, price, tagline, description, swatch (native color picker), stock + threshold, featured/active toggles, and a dynamic specs editor (key/value rows).
- Each row gets two expand buttons: **Edit details** + **Edit photos** (4-slot grid 01..04 with per-slot Replace + Remove).
- Save / Discard pair per expanded section — no auto-save.
- Photo pipeline: client validates JPG/PNG/WEBP ≤ 10 MB; server `sharp` produces 1600×1600 hero + 600×600 thumb WEBP per slot, EXIF stripped. Stored under `public/products/<slug>/0X.webp` + `0X-thumb.webp`.
- Soft delete only (`is_active = false`).
- Doc updates: `PRD.md` (4 new owner stories), `TECH.md` (new ADR: inline product CRUD + dual-resize photo pipeline), `SCHEMA.md` (new admin endpoints for products + photos, rate-limit row), `DESIGN.md` (rewritten `AdminProductTable` + new `ProductDetailsForm` + `ProductPhotoGrid`), `PLAN.md` (Phase 10.1–10.10 tasks).
- Backlog: drag-to-reorder photos within `ProductPhotoGrid`.

### [0.11.0] — 2026-06-16
- Phase 9.x patch series shipped to `production`:
  - Form validation across `/signin`, `/signup`, `/account/addresses`, `/checkout`: per-field error messages on blur, red border + helper text, required-asterisk indicators, Myanmar phone regex `+959XXXXXXXXX`, password strength rule (≥10 + mixed case + digit). New shared `TextField` / `SelectField` / `TextAreaField` in `src/components/ui/field.tsx` backed by `src/lib/validators.ts`.
  - `/admin/payment-methods` switched from auto-save-on-blur to per-row Save / Discard. Pending QR file held client-side as object-URL preview, uploaded on Save. Atomic sequence: QR upload → field PATCH → local commit.
  - QR is now optional. Server filter at `/api/v1/payment-methods` requires only `account_name + account_phone`. `/order/[id]` wallet panel hides the QR slot when empty and lets account info span full width.
  - Sort order swapped from free-form number input to `<select>` 1..5 on both wallet and COD rows.
  - Added `KBZ Bank` (id `kbz_bank`, kind `wallet`) as a 5th method. Treats `account_phone` field as the bank account number. Run once on prod DB: `INSERT INTO payment_methods (id, name, kind, sort_order, is_active) VALUES ('kbz_bank', 'KBZ Bank', 'wallet', 5, 0);`.
  - Checkout UI: `+ Add new address` and "Continue to payment" buttons no longer overlap on the delivery step. Continue button has its own row, full-width on mobile, right-aligned on desktop. Payment step back/continue stack on mobile, space-between on desktop.

### [0.10.0] — 2026-06-16 (docs only — implementation pending)
- Phase 9 design locked: multi-method checkout (KBZ Pay / Aya Pay / UAB Pay / COD), in-app slip upload, BeeExpress per-division shipping, Telegram owner alerts, 24h auto-cancel.
- Doc updates: `CLAUDE.md` (payment stack rewritten), `docs/PRD.md` (new user stories + 0a/0b/0c/0d app flows + constraints), `docs/TECH.md` (two new ADRs: multi-method payment + BeeExpress shipping; security additions for slip upload + auto-cancel race), `docs/SCHEMA.md` (new `payment_methods` + `divisions` tables; expanded `orders.status` enum + new `orders` columns; rebuilt `addresses` for Myanmar shape; new public + admin endpoints), `docs/DESIGN.md` (three-step checkout component, per-status order confirmation panels, new components map), `docs/PLAN.md` (Phase 9.1–9.14 task list).
- New doc: `docs/PAYMENT.md` (owner runbook — methods, shipping table, status machine, daily ops, slip security, failure modes, env vars).
- `.env.example` extended with `TELEGRAM_BACKUP_USERNAME`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_OWNER_CHAT_ID`.

### [0.9.0] — 2026-06-16
- Catalog cut to 15 curated SKUs across 6 cats (keyboards/mice/headsets/microphones/speakers/accessories) — merged to 4 in Phase 9, headsets + microphones + speakers became `audio`. Real brand names (HyperX, Keychron, Nuphy, Logitech, Razer, VXE, Edifier, etc.). Placeholder photos copied into all 15 `public/products/<slug>/` dirs.
- Stripe integration removed (Myanmar retail = bank transfer only). Uninstalled SDK; deleted `src/lib/stripe.ts`, `/api/v1/stripe/webhook`, `/api/v1/orders/[id]/stripe-session`, `StripePayButton` from `/order/[id]`; scrubbed Stripe env keys from `.env.example`. Renamed `docs/STRIPE-AND-ADMIN.md` → `docs/ADMIN.md` with bank-transfer confirmation flow + admin promotion SQL.
- Docs scrubbed of Stripe refs: PRD (user stories, app flow, gating), TECH (ADR rewritten, security surface), SCHEMA (endpoint table, payment surface), DESIGN (order confirmation state), LIGHTHOUSE (TBT row).

### [0.8.0] — 2026-06-16
- Phase 8: React Email templates, custom `/admin` UI, Lighthouse playbook.
- Docs synced: `docs/PRD.md` (admin stories, payment flow, role gating), `docs/TECH.md` (5 new ADRs, expanded folder tree, Phase 8 security additions), `docs/SCHEMA.md` (admin endpoint tables, rate-limit table), `docs/DESIGN.md` (admin tone, KPI tiles), `docs/ADMIN.md`, `docs/LIGHTHOUSE.md`.

### [0.7.0] — 2026-06-16
- Phase 7: reviews + wishlist + newsletter + `output: 'standalone'`. `docs/AUTH-SETUP.md` + `docs/DEPLOY.md` shipped.

### [0.6.0] — 2026-06-16
- Phase 6: Auth.js v5, DB-backed cart, addresses, orders + checkout + bank-transfer confirmation, account pages.

### [0.5.0] — 2026-06-16
- Phase 5: MySQL backend via Drizzle, MMK currency, catalog APIs, stock badges.

### [0.4.0] — 2026-06-15
- Phase 4: photo folder convention + `hasPhotos` script + Gallery with fallback.

### [0.3.0] — 2026-06-15
- Phase 3: motion polish, sitemap, robots, OG metadata.

### [0.2.0] — 2026-06-15
- Phase 2: routes, cart drawer, search, checkout-less PDP.

### [0.1.0] — 2026-06-15

#### Added
- Project documentation scaffold: `docs/PRD.md`, `docs/TECH.md`, `docs/SCHEMA.md`, `docs/DESIGN.md`, `docs/PLAN.md`, `docs/SETUP.md`.
- Root `CLAUDE.md` with project rules and doc index.
- `.gitignore` with Node / Next.js / Claude entries.
- Initial design tokens (cream/ink/terracotta palette) defined in `docs/DESIGN.md`.
- Architecture decisions recorded as ADRs in `docs/TECH.md`.
- Future API contract drafted in `docs/SCHEMA.md` (placeholder phase has no live API).
- **Phase 1.1:** Next.js 15 + React 19 + TypeScript 5.7 strict scaffold (`package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `pnpm-workspace.yaml`).
- App Router shell: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`.
- `public/favicon.ico` + `public/logo.png` (merxylab flask + circuit-trace logo).
- **Phase 1.2-1.10:** Tailwind v4 CSS-first tokens, Fraunces + Inter via next/font, runtime deps (zustand, fuse.js, framer-motion, lucide-react, sonner, zod, clsx, tailwind-merge).
- `src/lib/types.ts` — Product, Category, CartItem, CartState, constants.
- `src/lib/utils.ts` — cn, formatPrice, slugify, clampQty.
- `src/lib/products.ts` — JSON loaders + query helpers.
- `src/lib/cart-store.ts` — zustand store with localStorage persistence.
- `src/lib/search.ts` — Fuse.js fuzzy search index.
- `src/data/products.json` — 32 products across 4 categories.
- `src/data/categories.json` — 4 categories (keyboards, mice, audio, accessories).
- **Phase 2:** All routes shipped — `/`, `/shop`, `/shop/[category]`, `/product/[slug]`, `/cart`, `/search`, `/not-found`.
- Components: Nav, Footer, CartDrawer, Hero, Stats, ProductGrid, Why, CTABanner, Newsletter, ProductCard, Tile, AddToCartButton, GridControls.
- Add-to-cart wired with toast feedback (sonner).
- 43 static pages prerendered. Build, typecheck, lint all green.
- **Phase 3 essentials:** `sitemap.xml` + `robots.txt` route handlers, Open Graph + Twitter card metadata, title template (`%s · merxylab`), `themeColor` viewport, MotionConfig with `reducedMotion="user"` honors prefers-reduced-motion globally for Framer Motion.
- Hero inline product chip polished (rounded ring, tracking tightened).
- Footer flask mark polished (proper invert filter + ring container).
- Live dev verified at http://localhost:3001 — homepage, shop, PDP, sitemap render correctly.
