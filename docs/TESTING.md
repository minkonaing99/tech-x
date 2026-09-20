# Testing

Vitest, Node environment by default. The risk in this codebase is logic - status transitions, money, phone normalisation, input guards - not markup.

A handful of components hold decisions rather than markup, and those opt into a DOM per file with a `// @vitest-environment jsdom` docblock. The rest of the suite stays in Node and pays nothing for it.

## Commands

| Command | Use |
| ------- | --- |
| `npm test` | Run once. What CI runs. |
| `npm run test:watch` | Re-runs on save while working. |
| `npm run test:coverage` | Text summary + `coverage/` HTML report (gitignored). |

## Layout

Tests sit **beside the code**, `src/lib/validators.test.ts` next to `src/lib/validators.ts`. Vitest finds them with no config, a rename moves both, and nothing imports them so they never reach the Next bundle.

`vitest.config.mts` does four things worth knowing:

- Aliases `@/` and `@emails` so tests resolve the same paths the app does.
- Stubs the `server-only` package (`src/test/server-only-stub.ts`). Without it, importing `admin-orders.ts` or `site-info.ts` throws - that package exists to blow up outside a React Server Component.
- Collects `*.test.tsx` as well as `*.test.ts`.
- Names the JSX runtime: `oxc: { jsx: { runtime: 'automatic' } }`. `tsconfig.json` says `jsx: preserve` because Next runs its own transform, and Vitest has no such downstream step. The knob is `oxc`, not `esbuild` - Vitest 4 transforms with rolldown, and the esbuild setting is accepted silently then ignored, leaving `Unexpected JSX expression` at parse time.

## What is covered

| Suite | Guards |
| ----- | ------ |
| `lib/order-transitions.test.ts` | Every legal status move, per payment kind. Cancel is terminal. The admin dropdown never offers cancel as a new choice. |
| `lib/validators.test.ts` | Phone normalisation (six input shapes → one stored form), E.164 idempotency, password rules, email. |
| `lib/order-status.test.ts` | Customer wording for all 10 status × payment-kind combinations. Locks the COD "Awaiting payment" bug shut. |
| `lib/admin-orders.test.ts` | `?status=` and `?page=` guards, LIKE-wildcard escaping, stale-days clamping and defaults. |
| `lib/money.test.ts` | MMK formatting, cart quantity clamping, relative-time labels. |
| `api/v1/contact/route.test.ts` | Validation rejects, honeypot, rate limit at 5/hour, mail contents. |
| `lib/report-error.test.ts` | Alert contents, 10-minute throttle per fault, HTML escaping, never throws. |
| `lib/rate-limit.test.ts` | `X-Forwarded-For` hop selection (a forged chain cannot mint a bucket), window counting, and bucket-store eviction at the 10,000-key cap. |
| `lib/admin-guard.test.ts` | Role comes from the database, not the token: a JWT still claiming `admin` after revocation gets 403, a promotion the token predates is honoured, a deleted user row reads as signed out. |
| `lib/telegram.test.ts` | Plain text by default (an awkward character cannot make Telegram reject an order alert), markup only on opt-in, silent when unconfigured, swallows an outage. |
| `api/v1/orders/route.test.ts` | **Checkout.** Prices come from the catalog and division even when the body carries `subtotalMmk`/`totalMmk`; address ownership; blocked divisions; the COD cap; stock refusal; and that a rejected checkout leaves no address behind. Also that the Telegram alert carries no street, phone, or raw email. |
| `api/v1/admin/orders/[id]/route.test.ts` | **Stock movement.** Decrement on confirm, restore on cancel-from-confirmed, no movement on cancel-from-pending, and 409 when the conditional decrement matches no row. Plus the invoice/delivered/cancelled/low-stock mails. |
| `api/v1/auth/signup/route.test.ts` | Verification token stored as a SHA-256 digest, not as mailed; a verified account with a password is never written to; a taken address answers identically to a fresh one; password character classes. |
| `api/v1/auth/verify/route.test.ts` | Token match/miss, length guard, and the 10/hour limiter. |
| `api/v1/orders/[id]/slip/route.test.ts` | Owner-or-admin read (including the revoked-admin case), non-slip stored values refused, upload size/MIME/decode guards, upstream failure leaves the order unadvanced, prior slip deleted on replace. |
| `api/v1/addresses/[id]/route.test.ts` | Ownership scoping, the confirmed-order address lock on both edit and delete, telegram/maps normalisation, cleared optionals stored as `null`. |
| `api/v1/cart/items/[productId]/route.test.ts` | Slug guard, qty range, and that update/remove share the 60/min cart budget. Plus the stock refusal this route never had - and that emptying a line still works whatever the stock says, because removing is how a blocked cart gets fixed. |
| `app/sitemap.test.ts` | Static routes still render when the catalog read throws — the case that used to fail the CI build. |
| `lib/cart-store.test.ts` | **Add-to-cart honesty.** `add()` reports 409/404/429/network back to the caller instead of swallowing it, and never opens the drawer. Plus `fetch`/`setQty`/`remove`/`merge` resyncing from the server rather than keeping a stale cart after a failed mutation. |
| `components/product/add-to-cart-button.test.tsx` | A failed add raises `toast.error` and never the confirmation; the drawer opens only when the toast action is taken; a burst of clicks collapses to one `add`; an out-of-stock button calls nothing. |
| `components/product/card.test.tsx` | The same four for the grid quick-add, which is the surface where a shopper adds several things in a row. |
| `lib/cart-session.test.ts` | **The guest-cart merge.** Promote when the account has no cart, otherwise one batched upsert that sends the guest quantity and leaves the addition to the database. Locks the guest cart row. Every write on the transaction handle, never straight at `db`, and a failed write escapes so drizzle can roll back. |
| `components/cart-hydrator.test.tsx` | Rereads the cart whenever the session changes, including a cold load that resolves straight to signed in — the shape of a Google sign-in landing back on the site, and the one the original bug hid in. |
| `components/wishlist/wishlist-hydrator.test.tsx` | The same cold-load case for the wishlist, which merges rather than reads because its guest data is in local storage and no server can see it. |
| `lib/wishlist-store.test.ts` | The local list survives a refused merge (`fetch` resolves for a 500 as happily as for a 200), survives a request that never lands, and is cleared on sign-out so it cannot follow the next person into their account. |
| `lib/cart-availability.test.ts` | **The one rule for whether a cart line can be ordered** - retired, sold out, or fewer left than asked for. Retired wins when both are true, since no restock fixes it. Negative stock reads as sold out, not as a shortfall. |
| `api/v1/cart/items/route.test.ts` | **Adding.** Refused above stock, and counted against the total the line would reach rather than the quantity requested - adding sums into what is already there, so two-at-a-time was getting past a stock of three. Retired products answer 409, missing ones 404. |
| `api/v1/wishlist/merge/route.test.ts` | Ids attach to the session user and never to a `userId` in the body, the whole list goes in one statement, non-slug ids and over-cap lists are refused, and a genuine write failure is no longer answered with `ok`. |

Six of these were written after the bug they describe shipped — the COD status label, the `getStaleDays` default, the add button that confirmed a sold-out product as "Added", the Google sign-in that emptied the basket, the wishlist merge that cleared local storage whether or not the server took the items, and a cart that would hold five of a product the shop had two of. That is the point of them.

## What is deliberately not covered

**Stock commit and release against a real database.** The branch logic inside the order `PATCH` transaction *is* now covered (`api/v1/admin/orders/[id]/route.test.ts`) with the driver mocked, including the `affectedRows === 0` refusal — the mock returns `[{ affectedRows }]` precisely because the route reads `res[0]`, not `res`, and that unwrapping has been wrong before. What is still untested is the actual SQL: whether MySQL really refuses the conditional `UPDATE` under concurrency. That needs a seeded database and a Playwright or integration run, worth building when order volume justifies it.

**Most components and every page.** React Testing Library and jsdom are now installed, but they are pointed only at the components that hold a decision - the two add buttons, which choose between confirming and reporting a failure and must refuse a second click mid-flight, and the two hydrators, which decide whether a sign-in merges or merely reads. Everything else still mostly renders props, and rendering props back to yourself proves nothing.

The bar for adding another: the component branches on something, or it guards against a user action that would otherwise double-fire. Not "it exists".

`checkout-form.tsx` now clears that bar and still has no test. It decides whether the order button is live, tells empty apart from unorderable, and re-reads the cart when the server refuses a line. It is also 700 lines with an address form in it, which is why it has not been done rather than why it should not be.

**The remaining API routes** — wishlist, reviews, and the admin CRUD for products, divisions, payment methods, and settings. These are thin zod-then-write handlers behind a now-tested `requireAdmin()`, where a regression costs a 500 rather than money or data. Testing them would move the global percentage without adding much safety.

## Coverage

The global number is ~62%, and the shape matters more than the figure: the report includes every DB and IO module, much of which is not unit-testable without integration setup. The routes where a silent regression costs money or leaks data are the ones carried high — checkout 91%, admin order status 97%, signup 100%, verify 100%, slip 97%, addresses 100%, `admin-guard` 100%, `rate-limit` 100%, and both add buttons at 93-94%.

The report covers `src/lib/**`, `src/app/api/**`, and `src/components/product/**`. That last one is scoped to a directory rather than all of `src/components` on purpose: including forty untested components would drop the figure by ten points overnight and say nothing true about the risk. Widen it a directory at a time, as tests arrive.

No thresholds are enforced yet. Add them once integration tests exist, otherwise every unrelated new file fails the build.

## CI

`.github/workflows/ci.yml` runs on every push and pull request:

1. `npm ci` on Node 20 with npm cache
2. `npm run typecheck`
3. `npm run lint`
4. `npm test`
5. `npm run build` with dummy env (`DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`)

The build needs no real database, but **not** because nothing queries at build time — that claim was wrong and broke this job. `/sitemap.xml` is statically generated and reads the catalog, so with an unreachable database the query threw and the export failed, taking the whole build with it. `src/app/sitemap.ts` now catches that and emits the static and category routes without the product URLs; the catalog read is cached with a 60-second revalidate, so a sitemap built without products fills them in on the first request that can reach the database. `app/sitemap.test.ts` covers the throwing case.

Every other DB-backed page is `force-dynamic`, so a syntactically valid dummy URL is enough for them. Verify locally with:

```
DATABASE_URL=mysql://ci:ci@127.0.0.1:3306/ci AUTH_SECRET=x \
NEXT_PUBLIC_SITE_URL=https://example.com npx next build
```

**Then delete `.next`.** A production build and `next dev` write incompatible layouts to the same directory — production puts middleware at `.next/server/src/middleware.js`, dev expects `.next/server/middleware.js` — so a dev server started over a production build dies with `ENOENT ... middleware.js`.

A second job runs **gitleaks** over the repository to catch committed credentials. Concurrency is set so a newer push cancels the older run on the same branch.

## Adding a test

1. Put the file next to the source, named `*.test.ts`.
2. Mock at the module boundary, not inside the unit — `vi.mock('@/db', ...)` beats threading a fake client through the function signature.
3. If a route handler needs a request, build a real `Request`. They are plain functions; no server needed.
4. Rate-limited routes keep state in a module-level Map — give each test its own `x-forwarded-for` or they bleed into each other.

For a component, add `// @vitest-environment jsdom` as the first line and name the file `*.test.tsx`. Two things bite:

- Mock the store and `sonner` rather than driving the real ones. `useCart` is used with a selector, so the fake is `useCart: (select) => select({ add, open })`, built with `vi.hoisted` because `vi.mock` factories are hoisted above the file.
- Anything using `whileInView` reaches for an `IntersectionObserver` the moment it mounts, and jsdom has none. `ProductCard` does. Stub it inert; see `card.test.tsx`.
- jsdom under Vitest 4 ships no `localStorage` either, despite `window` being present. `wishlist-store.test.ts` stubs a four-method in-memory stand-in rather than pulling in `happy-dom` for one file.

Two more that cost time here:

- A `Response` body can only be read once, so a shared `const OK = jsonResponse(...)` breaks the moment a test answers two requests. Make it a factory.
- `vi.fn(async () => x)` gives `mock.calls` the type `[]`, and destructuring an argument out of it fails `tsc` even while the test passes. Type the mock — `vi.fn<(path: string) => Promise<Response>>(...)` — rather than adding a parameter you do not use.
