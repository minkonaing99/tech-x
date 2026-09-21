# PRD — merxylab store

## Product Requirements

### Problem
Computer peripheral shops feel like loud gamer marketplaces — RGB-saturated, spec-shouting, hard to browse. merxylab sells mice, keyboards, audio, and accessories in a calm, editorial storefront that treats the hardware like craft objects.

### Goals + success metrics
- Visitor can land on homepage and reach a product detail page in < 15s.
- Visitor can add an item to cart and view cart in < 10s.
- Search returns relevant matches within 100ms (client-side Fuse.js).
- Lighthouse performance > 90 on mobile.
- Zero generic-template visual cues (no stock hero stack, no gradient bg, no "Shop Now" boilerplate).

### Target users
- Hobbyist and enthusiast PC users buying peripherals (mechanical keyboard fans, custom-mouse builders).
- Designers, developers, writers who want premium desk tools.
- Gift buyers looking for something nicer than a generic gamer brand.

### Features

**Core (MVP — placeholder phase)**
- Homepage mirroring reference layout: hero + thumbs + carousel, stats row, product grid, "why choose us" accordion, dark CTA banner, newsletter, dark footer
- Shop catalog (`/shop`) with filter + sort
- Category routes (`/shop/[category]`) — keyboards, mice, audio, accessories (headsets/mics/speakers merged into `audio` in Phase 9)
- Product detail page (`/product/[slug]`) with gallery, specs, add-to-cart
- Cart drawer + dedicated cart page (`/cart`)
- Search results page (`/search?q=`) — fuzzy match via Fuse.js
- Newsletter visual submit (toast only, no persistence)
- 30+ products as inline JSON, placeholder solid-swatch tiles

**Extended — Phase 4-7 (full e-commerce, shipped)**
- Real product photography on disk (`public/products/{slug}/{01-04}.webp`), `hasPhotos` flag, gallery hides missing slots
- MySQL backend via Drizzle ORM, Next.js route handlers. Credentials live in `.env.local` (`DATABASE_URL`), never in docs
- Auth.js v5 — email + password + Google OAuth, Hostinger SMTP via nodemailer
- Cart sync — cookie session for guests, merge on login
- User accounts + saved addresses + order history (`/account/*`)
- Checkout → orders stored as `pending_payment`, manual bank-transfer instructions emailed
- Inventory tracking — `stockQty` + `lowStockThreshold`, "only N left" badges, auto-out at 0
- Reviews — stars + text + verified-purchase tag
- Wishlist — guest (localStorage) + logged-in (DB), merge on login
- Newsletter — custom `newsletter_subscribers` table, admin CSV export
- Deploy target: Hostinger Business shared (Node.js via Passenger)

**Extended — Phase 8 (operator + payments, shipped)**
- React Email transactional templates (verify-email, order-confirmation, low-stock-alert) — warm-palette HTML with plaintext fallback
- Custom `/admin` UI — role-gated (`users.role = 'admin'`) dashboard with KPI tiles, inline product editor (price/stock/featured/active), order status updates, review moderation (approve/reject), newsletter CSV export
- Lighthouse + axe-core audit playbook (`docs/LIGHTHOUSE.md`) — per-route loop, LHCI snippet, score targets per category

**Extended — Phase 9 (storefront content + operator triage, shipped)**
- Content pages: about, contact, shipping, returns + warranty, FAQ, privacy — wired to the footer, copy grounded in real system behaviour. No terms-of-sale page by owner decision
- Newsletter removed by owner decision (no capacity to write one). The `newsletter_subscribers` table remains in the schema, unused
- Burmese localisation of four of those pages under `/my/*`, with `hreflang` alternates and Noto Sans Myanmar (see `docs/CONTENT-PAGES.md`)
- Contact form → `POST /api/v1/contact` (zod, per-IP rate limit, honeypot), delivered by SMTP
- Admin orders rebuilt as a work queue + searchable paginated ledger, with an editable stale-delivery threshold (see `docs/ADMIN.md`)
- Customer order tracking: payment-kind-aware status wording and a step progress tracker on `/account/orders/[id]`
- Phone entry with a fixed `+95` prefix and input normalisation across both address forms
- Categories merged from 6 to 4: headsets + microphones + speakers became `audio`
- `docs/db-bootstrap.sql` is the single install path; Drizzle migrations removed

**Extended — Phase 10 (product comparison, shipped)**
- Compare exactly two products from the same category, side by side, at `/compare?a=<slug>&b=<slug>`
- Entry from the PDP: a "Compare with" disclosure listing every other active product in that category. Hidden entirely when the category holds only one product
- Table rows: photo + name + price, average approved rating, then the union of both products' specs. A label only one side carries shows a hyphen on the other
- Same-category only. A mismatched, unknown, missing or self-referential pair 404s
- `noindex, follow`, absent from the sitemap: the URL count grows with the square of the catalog and every page repeats spec text the two PDPs already carry

**Out of scope (deferred or won't-do)**
- Real-time shipping / tax calculation — handled manually via order confirmation email
- Card payments / Stripe / online gateways — Myanmar retail uses bank transfer only
- Multi-currency display (MMK only). Multi-language is partial: six content pages ship English + Burmese (`/my/*`); shop, product, cart and checkout stay English
- Photo uploads via web UI — files dropped into `public/products/{slug}/` directly
- Vendor/seller onboarding
- Marketing CMS / blog
- Mobile app

### User stories
- As a visitor, I want to land on a calm homepage and immediately see the flagship product, so I understand what merxylab sells.
- As a shopper, I want to filter products by category and sort by price, so I narrow the catalog fast.
- As a shopper, I want to view product specs and add to cart in one click, so checkout-intent is preserved.
- As a returning visitor, I want my cart to survive a page refresh and a device switch, so I don't lose selections.
- As a curious visitor, I want to search "low profile keyboard" and see fuzzy matches instantly, so typos don't block me.
- As a new customer, I want to sign up with Google or email + password, so I can save addresses and track orders.
- As a customer, I want to save items to a wishlist before and after logging in, so my selections aren't lost.
- As a customer, I want clear bank-transfer instructions after checkout (no online card form), so I know how to complete payment.
- As a customer, I want to see "only 2 left" when stock is low, so I act quickly.
- As a customer, I want to leave a review after purchase, and see only verified reviews on the PDP, so my decisions are informed.
- As the shop owner, I want a calm `/admin` dashboard with KPI tiles, an inline product editor, and order/review/newsletter management — without leaving the brand visual language.
- As the shop owner, I want order confirmation emails to include the order ID as bank-transfer reference, so payment reconciliation is easy.
- As the shop owner, I want low-stock alerts emailed to me automatically the moment an order pushes stock under the threshold.
- As a customer, I want to pick from KBZ Pay / Aya Pay / UAB Pay / Cash on Delivery at checkout, see the merchant QR + account info, and upload my transfer slip on the order page — so I never leave the site to confirm payment.
- As a customer, I want my saved addresses to prefill at checkout, but be able to add a new one for a single order without saving it.
- As a customer, I want to know my division's shipping fee before I confirm payment, so there are no surprises.
- As a customer outside Yangon/Mandalay, I want COD hidden so I don't pick a method that won't work for me.
- As a customer, I want to cancel my own order while it's still `pending_payment`, so I'm not stuck if I changed my mind.
- As the shop owner, I want to manage payment methods (account name, phone, QR image, active flag) from `/admin/payment-methods` without redeploying.
- As the shop owner, I want unpaid orders to auto-cancel after 24h so stock isn't locked forever.
- As the shop owner, I want every new order and every slip submission to ping me by email AND Telegram bot so I can verify fast.
- As the shop owner, I want to add a new product without touching the database — name, slug (auto from name), category, price, tagline, description, swatch (color picker), stock, specs (key/value rows), and four photos from one inline form on `/admin/products`.
- As the shop owner, I want to edit an existing product's details, specs, and photos from the same screen — per-slot replace/remove on photos 01..04 — without redeploying.
- As the shop owner, I want a Save / Discard pattern on the product editor so I can scratch a draft if I changed my mind. No auto-save.
- As the shop owner, I want product photos to ship at two sizes — a 1600×1600 hero for the PDP and a 600×600 thumb for grid views — so PDP detail stays sharp while grids stay light.

### Constraints
- TypeScript strict mode + `noUncheckedIndexedAccess`.
- Must run on Node 20+.
- Hostinger Business shared hosting (Node.js via Passenger) is the deploy target — code must work within memory + cold-start constraints (`output: 'standalone'`).
- MySQL is the only persistence store (no Postgres-specific features).
- Currency is MMK (whole integer units, no subunit) everywhere — UI and DB.
- No card payments. Wallet apps (KBZ Pay / Aya Pay / UAB Pay) + COD only. No card data ever touches the app.
- Delivery via BeeExpress from Mandalay. Per-division flat fee. Kayah, Kayin, Sagaing are blocked (no coverage).
- COD only when destination ∈ {Yangon, Mandalay} AND total ≤ 500,000 MMK.
- Auto-cancel `pending_payment` orders after 24h, restore `stockQty`.
- Photos go on the same filesystem (`public/products/{slug}/{01-04}.webp`), no CDN yet.
- Admin actions never available without prior `UPDATE users SET role='admin'` via DB — there is no self-service admin upgrade.

### Open questions / assumptions
- Bank-transfer instructions copy: which bank(s), account number, beneficiary name — owner supplies before launch.
- Google OAuth client credentials owner-supplied at deploy.
- Hostinger SMTP host/port confirmed at deploy (`smtp.hostinger.com:465` default).
- MMK price values for the seeded catalog are placeholder estimates — owner adjusts via Drizzle Studio before launch.
- Domain name TBD — `merxylab.com` or similar.

---

## App Flow

### Entry points
- `/` — primary landing
- `/shop` — direct catalog link
- `/shop/[category]` — category deep link (SEO, ads)
- `/product/[slug]` — share / SEO landing for a product
- `/search?q=` — query param entry from external search

### Core flows

**0a. Checkout — delivery + payment method**
1. Customer on `/checkout` reviews cart.
2. Picks saved address (radio) or `+ Add new` (inline form: recipient, phone `+95 9XX XXX XXX`, division, city, township, street, optional landmark).
3. Division dropdown excludes Kayah, Kayin, Sagaing.
4. Shipping fee shown next to division selection. Updates total.
5. Picks payment method: KBZ Pay / Aya Pay / UAB Pay / COD. COD only visible if division ∈ {Yangon, Mandalay} AND total ≤ 500,000 MMK.
6. Submits → order written with `status='pending_payment'`, `expires_at = now + 24h`. Stock reserved (decremented).
7. Redirected to `/order/[id]`.

**0b. Payment confirmation (wallet path)**
1. `/order/[id]` shows: merchant QR + account name + account phone + amount in MMK + order UUID.
2. Customer opens wallet app, scans QR, transfers exact amount.
3. Customer returns to site, uploads slip image (JPG/PNG/WEBP, 8MB max, client-resized to 1600px), optional tx ref.
4. Status flips to `payment_submitted`. Owner gets email + Telegram ping.
5. Owner verifies in bank app → flips to `paid` from `/admin/orders/[id]`. Customer emailed.
6. Owner ships → flips to `shipped` → emailed → marks `delivered` on confirmation.

**0c. Payment confirmation (COD path)**
1. `/order/[id]` shows confirmation panel ("We'll call to confirm before shipping.") and bank-style summary.
2. Owner phones recipient → flips to `confirmed`.
3. Owner ships → `shipped` → driver collects cash at door → `delivered`.

**0d. Customer cancel**
1. From `/account/orders/[id]`, customer hits Cancel while `status='pending_payment'`. Stock restored. Status → `cancelled`.
2. After slip submitted, customer must contact owner via Telegram.

**1. Browse → Add to cart**
1. Visitor lands on `/`
2. Scrolls past hero → product grid
3. Clicks product card → `/product/[slug]`
4. Reads specs, clicks "Add to cart"
5. Nav cart badge ticks up; a toast confirms the product by name
6. Continues shopping OR takes the toast's "View cart" action → drawer slides in from right with items + subtotal → `/cart`

**2. Category browse**
1. Visitor clicks "Keyboards" in nav
2. Lands on `/shop/keyboards`
3. Sorts by price descending
4. Clicks product → PDP

**3. Search**
1. Visitor clicks search icon in nav (or types in inline search field)
2. Types query → instant fuzzy results
3. Clicks result → PDP

**3b. Compare two products**
1. Shopper on `/product/[slug]` opens the "Compare with" disclosure under the specs.
2. Picks another product in the same category → `/compare?a=<this>&b=<that>`.
3. Reads photo, name, price, rating and the merged spec table, two columns at any width.
4. Either clicks a name back to its PDP to buy, or opens the picker below the table to swap the right-hand product for a third.

**4. Cart review**
1. Visitor clicks cart icon (badge shows item count)
2. Drawer opens with line items + qty steppers + subtotal
3. Clicks "View cart" → `/cart` (full page summary)
4. Adjusts qty / removes items
5. (Placeholder phase ends here — checkout out of scope.)

### Navigation structure
- Top nav: logo (left) / Shop / Categories dropdown / Search icon / Cart icon
- Footer: Shop / Company / Support columns + a privacy link in the bottom bar — live hrefs
- Mobile: hamburger drawer with same items

### Auth gating
- Public: `/`, `/shop`, `/shop/[category]`, `/product/[slug]`, `/search`, `/signin`, `/signup`, `/verify`.
- Cart drawer + `/cart` work for anonymous users (cookie session) and authed users (DB).
- Auth required: `/account`, `/account/orders`, `/account/addresses`, `/account/wishlist`, `/checkout`, `/order/[id]`, all mutating cart / wishlist / order / review / address endpoints.
- Admin required (`users.role = 'admin'`): `/admin/*` pages and `/api/v1/admin/*` endpoints. Non-admin authed users hitting `/admin` redirect to `/account`.

### State transitions per screen
- **Homepage:** static (no loading state needed — JSON inlined)
- **Shop / Category:** loading skeleton on filter change (instant in placeholder), empty state when filter excludes all
- **PDP:** loading skeleton not needed (static), 404 if slug invalid
- **Search:** empty state ("Type to search"), no-results state ("No products match"), loading instant
- **Cart:** empty state ("Cart is empty — browse the shop"), error state on localStorage parse fail

### Edge cases
- Offline: cart persists via localStorage, browsing degrades gracefully (no remote calls in placeholder phase)
- localStorage disabled: cart state becomes session-only (fallback to in-memory zustand)
- Invalid product slug: 404 page
- `/compare` with a missing, unknown, repeated or cross-category slug: 404 page. The slugs come from a query string, so none of these are unreachable
- `/compare` where a product has no approved reviews: "No reviews yet" in place of stars
- Empty search query: show prompt, do not run search
- Cart with deleted product (post-API): show "no longer available" placeholder
