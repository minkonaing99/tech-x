# merxylab store

A production e-commerce storefront and operator back office for a Myanmar computer-peripheral shop, built as a single Next.js 15 application. It sells keyboards, mice, audio and accessories, and it handles the part most storefront templates skip: a market with no card gateway, where payment is a bank transfer plus a screenshot, and where a human has to verify that screenshot before stock moves.


## Why it exists

Peripheral shops online look the same: RGB gradients, spec-shouting, stock hero stacks. This one is deliberately quiet - warm cream palette, serif display type, editorial layout - and it is built for a real constraint set rather than a demo. Myanmar retail runs on wallet transfers (KBZ Pay, Aya Pay, UAB Pay), bank transfers and cash on delivery. There is no Stripe surface to hide behind, so the money path had to be designed rather than installed.

## What it does

**Storefront**

- Catalogue with category routes, filter and sort, product detail pages with gallery, specs and stock badges
- Client-side fuzzy search (Fuse.js, ~10KB) over a catalogue passed down from a server component
- Cart that survives refresh and device switch: cookie session for guests, merged into the user cart on sign-in
- Accounts with email + password or Google OAuth, saved addresses, wishlist, order history and a live status tracker
- Checkout that prices the order server-side, blocks divisions with no courier coverage, and hides cash on delivery for anyone outside the two divisions where it works
- Six content pages localised to Burmese under `/my/*` with `hreflang` alternates

**Operator back office**

- Role-gated `/admin` with KPI tiles, inline product editing, and review moderation
- Orders as a work queue first and a ledger second: slips to verify, COD calls to make, deliveries gone stale past an editable threshold - then a searchable, paginated history
- Payment methods editable at runtime (account details, QR image, instructions, active toggle) so the owner can pull a compromised wallet without a redeploy
- Per-division delivery fees, COD flags and coverage blocks, editable in the UI
- Transactional email in React Email, plus optional Telegram push for owner alerts

## Engineering notes

**The money path is a state machine, not a boolean.** Orders move through `pending_payment → payment_submitted → confirmed → delivered`, with `cancelled` reachable and terminal. `confirmed` is the single commit boundary for both the wallet and the COD path: entering it decrements stock and sends the invoice, leaving it restores stock. The decrement is a conditional `UPDATE` that refuses to match when stock has already gone, so two concurrent confirmations cannot oversell. Legal transitions are a tested table, not scattered `if` statements.

**Trust boundaries are enforced server-side, every request.** Prices are recomputed from the catalogue and the division fee even when the request body carries its own totals. Address ownership is checked before an address can be attached to an order. The admin role is re-read from the database per request rather than trusted from the JWT, so a revoked admin loses access immediately instead of at token expiry. Every write route validates through zod at the boundary.

**Payment slips are treated as sensitive.** Uploads are magic-byte sniffed, re-encoded through `sharp` to strip EXIF, and stored in a private Cloudflare R2 bucket with no public CDN binding. They are served only through an authenticated streaming route that checks owner-or-admin and sends `Cache-Control: private, no-store`. Order IDs are 122-bit UUIDs, so even a leaked link isolates one customer.

**Defence in depth on the web layer.** A nonce-based CSP with `strict-dynamic` and no `unsafe-inline`; an origin gate in middleware that requires a same-origin `Origin` header on every API write, so CSRF protection does not rest on a cookie's `SameSite` default; an in-memory bucket rate limiter that picks the correct hop out of `X-Forwarded-For` (a forged chain cannot mint its own bucket) and evicts at a hard key cap so it cannot grow unbounded. Verification tokens are stored as SHA-256 digests, never in the form they were mailed. Signup answers identically whether or not the address is taken.

**Privacy in the plumbing.** Owner alerts carry order ID, amount and a link - never the street, phone or raw email. Addresses shown back to the customer have the local part of the email masked, domain intact.

**Testing follows the risk, not the coverage number.** 34 Vitest suites, no jsdom, because the risk here is logic rather than markup: status transitions, money formatting, phone normalisation across six input shapes, rate-limit hop selection, stock movement, upload guards. Global coverage sits around 42% while the routes where a regression costs money or leaks data are carried high - checkout 91%, admin order status 97%, signup and address routes 100%. Two suites exist because the bug they describe shipped first.

**Performance and accessibility are treated as requirements.** React Server Components by default, `next/font` for zero CLS, restrained Framer Motion that honours `prefers-reduced-motion`, Tailwind v4 tokens compiled to CSS variables with no runtime cost. Lighthouse targets are green across performance, accessibility, best practices and SEO on mobile, audited per route against a production build.

**Operational failure modes are designed, not discovered.** Unpaid orders auto-cancel on a nightly sweep so stock is not locked forever. Rejected slips return the order to `pending_payment` for re-upload rather than dying. Blocked courier divisions are data, so opening coverage is a form edit. Every one of these is written down in the runbook, in the register of failure modes and recoveries.

## Stack

TypeScript (strict, `noUncheckedIndexedAccess`) · Next.js 15 App Router · React 19 · Tailwind CSS v4 · Framer Motion · Zustand · Fuse.js · Auth.js v5 with the Drizzle adapter · Drizzle ORM on MySQL 8 · zod · React Email + nodemailer · Cloudflare R2 · Vitest

## Layout

```
src/app/          routes: storefront, /account, /admin, /api/v1
src/components/   presentational + interactive UI, grouped by surface
src/lib/          domain logic: pricing, order transitions, guards, rate limit, mail
src/db/schema/    Drizzle schema, single source of truth for types
emails/           React Email templates
scripts/          nightly order sweep, operator password reset
docs/             PRD, tech notes, schema, design system, runbooks, test plan
```

## Documentation

Written for a solo operator who will read it in six months, not for a portfolio reviewer.

| Doc | Contents |
| --- | --- |
| `docs/PRD.md` | Problem, users, scope, and what was deliberately left out |
| `docs/TECH.md` | Architecture, stack rationale, request lifecycle, decision records |
| `docs/SCHEMA.md` | Tables, relations, and why each constraint exists |
| `docs/PAYMENT.md` | Checkout, payment methods, slip verification, failure recovery |
| `docs/ADMIN.md` | Operator surface and the daily order queue |
| `docs/DESIGN.md`, `docs/brand.md` | Design system, tokens, type scale, brand rules |
| `docs/TESTING.md` | What is covered, what is not, and why |
| `docs/SETUP.md`, `docs/DEPLOY.md` | Running it locally, and putting it on the host |
| `docs/order-workflow.html` | Interactive diagram of the full order lifecycle |
| `CHANGELOG.md` | Release history |
