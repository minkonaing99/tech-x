# SCHEMA — merxylab store

Phase 4-7: MySQL persistence via Drizzle ORM. Tables defined in `src/db/schema/*.ts`. The database is the only catalog source; the former `src/data/*.json` seed snapshot is gone (`docs/db-bootstrap.sql` dumps live rows when a seed file is needed).

Naming: `snake_case` columns, `lower_snake` table names, PKs are CHAR(36) UUIDs or VARCHAR slug-style natural keys where useful.

Currency: **MMK** stored as **whole-integer BIGINT** (no subunit). Display in UI as `Ks 249,000`.

---

## Data Models

### Categories (no table)

Categories are **code, not data**: `CATEGORIES` in `src/lib/categories.ts`, an
`as const` array of `{ id, name, description }` in display order. The `id` is
the `/shop/<id>` URL segment.

There is no `categories` table, and `products.category_id` therefore carries no
foreign key. `isCategoryId()` in the zod schemas of `POST /api/v1/admin/products`
and `PATCH /api/v1/admin/products/[id]` is what enforces the reference, so an
unknown category cannot be written even though the database would now accept
one. The admin category picker renders the same array, so it cannot offer an id
the storefront has no page for.

The set is fixed at five (keyboards, mice, monitors, audio, accessories).
Adding a sixth is a code change: append to `CATEGORIES` and deploy. Nothing else
needs touching, because the nav, footer Shop column, `/shop` filter chips and
product labels all read that array.

History: the table existed through 0.13 alongside a hard-coded `CategoryId`
union and a third hard-coded copy in the footer, which could and did disagree.
0.14 briefly made the table authoritative; 0.15 dropped it. Products are the
only catalog data that changes per deployment, so one source in code beats a
table plus a union plus a join.

### `products`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | VARCHAR(64) | PK | slug-safe id |
| slug | VARCHAR(80) | UNIQUE NOT NULL | URL slug |
| name | VARCHAR(120) | NOT NULL | |
| category_id | VARCHAR(32) | NOT NULL | One of `CATEGORIES` in `src/lib/categories.ts`. No FK: there is no categories table. Validated by `isCategoryId` in the admin write routes. |
| price_mmk | BIGINT | NOT NULL, ≥ 0 | whole MMK units |
| sale_price_mmk | BIGINT | NULL | NULL = not on sale. When set: ≥ 0 and strictly < `price_mmk`, enforced in the admin write routes |
| tagline | VARCHAR(200) | NOT NULL | |
| description | TEXT | NOT NULL | |
| swatch | CHAR(7) | NOT NULL | `^#[0-9A-Fa-f]{6}$` |
| stock_qty | INT | NOT NULL DEFAULT 0 | |
| low_stock_threshold | INT | NOT NULL DEFAULT 3 | "only N left" trigger |
| has_photos | BOOLEAN | NOT NULL DEFAULT false | set by the server on photo upload in `/admin/products` |
| is_active | BOOLEAN | NOT NULL DEFAULT true | hide without deleting |
| featured | BOOLEAN | NOT NULL DEFAULT false | homepage hero candidate |
| created_at | TIMESTAMP | NOT NULL DEFAULT now() | |
| updated_at | TIMESTAMP | NOT NULL DEFAULT now() ON UPDATE now() | |

Indexes: `idx_products_category`, `idx_products_featured`, `idx_products_is_active`, fulltext index on `(name, tagline, description)` for optional server search fallback.

### `product_specs`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGINT | PK AUTO_INCREMENT | |
| product_id | VARCHAR(64) | NOT NULL, FK → products.id ON DELETE CASCADE | |
| label | VARCHAR(80) | NOT NULL | |
| value | VARCHAR(200) | NOT NULL | |
| sort_order | INT | NOT NULL DEFAULT 0 | |

Index: `idx_specs_product` on `(product_id, sort_order)`.

### Auth tables (Auth.js v5 Drizzle adapter shape)

**`users`**
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | CHAR(36) | PK | UUID |
| email | VARCHAR(254) | UNIQUE NOT NULL | |
| email_verified | TIMESTAMP | NULL | verified-at, NULL means unverified |
| password_hash | VARCHAR(60) | NULL | bcrypt 12 rounds, NULL for OAuth-only |
| password_changed_at | TIMESTAMP(3) | NULL | When the password last moved. NULL means "not since this column shipped", which makes `src/lib/auth.ts` adopt any token the user holds. Every writer of `password_hash` must set it, or the change never reaches an issued session. |
| name | VARCHAR(120) | NULL | |
| image | VARCHAR(500) | NULL | OAuth avatar URL |
| role | ENUM('customer','admin') | NOT NULL DEFAULT 'customer' | |
| created_at, updated_at | TIMESTAMP | | |

**`accounts`** (OAuth linkages — Auth.js adapter schema)
- `user_id`, `type`, `provider`, `provider_account_id`, `refresh_token`, `access_token`, `expires_at`, `token_type`, `scope`, `id_token`, `session_state`
- PK: `(provider, provider_account_id)`

**`sessions`** (only used if database session strategy chosen — currently JWT, so empty)
- `session_token` PK, `user_id`, `expires`

**`verification_tokens`** (email verify + password reset)
- `identifier` (email), `token` (sha256 hash of the mailed value), `purpose`, `expires`
- PK: `(identifier, token)`
- `purpose` is `ENUM('verify','reset') DEFAULT 'verify'`. Both flows share this
  table, keyed only by address and digest, so without it a token minted to
  verify an address would be spendable at the reset route and the other way
  round. Every read filters on it; the default keeps pre-existing rows, and
  anything the Auth.js adapter writes, valid.
- Reset tokens supersede: requesting one deletes any earlier `reset` row for
  that address, and spending one deletes them all. There is never more than one
  live reset link per account.

### `addresses`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | CHAR(36) | PK | |
| user_id | CHAR(36) | NOT NULL, FK → users.id ON DELETE CASCADE | |
| label | VARCHAR(40) | NOT NULL | "Home", "Office" |
| recipient | VARCHAR(120) | NOT NULL | |
| phone | VARCHAR(20) | NOT NULL | Myanmar `+95 9XX XXX XXX`, regex enforced |
| division | VARCHAR(40) | NOT NULL, FK → divisions.id | Region/State/Naypyidaw |
| city | VARCHAR(120) | NOT NULL | e.g. Yangon, Mandalay |
| township | VARCHAR(120) | NOT NULL | e.g. Hlaing, Chanmyathazi |
| street | VARCHAR(200) | NOT NULL | street + house no |
| landmark | VARCHAR(200) | NULL | optional ("near X market") |
| telegram_username | VARCHAR(32) | NULL | optional; bare handle, no `@` or `t.me/`. Backup channel for the confirmation call. Validated against Telegram's own rule (5-32, letter first, `[A-Za-z0-9_]`). |
| maps_url | VARCHAR(512) | NULL | optional Google Maps pin for the courier. `https` only, Google hosts only, validated by `isGoogleMapsUrl` before storage and again before render. |
| is_default | BOOLEAN | NOT NULL DEFAULT false | |
| created_at, updated_at | TIMESTAMP | | |

Index: `idx_addresses_user` on `(user_id)`.

Phase 9 migration: drop `line1`, `line2`, `region`, `postal`, `country`; add `division`, `township`, `street`, `landmark`. Existing rows backfilled to `division='Yangon'`, `city='Yangon'`, `township='unknown'`, `street=COALESCE(line1, '')` then manually corrected (single-admin shop).

### `divisions`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | VARCHAR(40) | PK | slug: `yangon`, `mandalay`, `naypyidaw`, … |
| name | VARCHAR(60) | NOT NULL | "Yangon Region" |
| delivery_fee_mmk | BIGINT | NOT NULL | BeeExpress flat fee |
| cod_allowed | BOOLEAN | NOT NULL DEFAULT false | true only for Yangon, Mandalay |
| is_blocked | BOOLEAN | NOT NULL DEFAULT false | true for Kayah, Kayin, Sagaing — no BeeExpress coverage |
| sort_order | INT | NOT NULL DEFAULT 0 | dropdown order |
| created_at, updated_at | TIMESTAMP | | |

Seeded with all 15 Myanmar divisions. Blocked rows still exist; dropdown filters `is_blocked = false`.

### `payment_methods`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | VARCHAR(40) | PK | `kbz_pay`, `aya_pay`, `uab_pay`, `kbz_bank`, `cod` |
| name | VARCHAR(60) | NOT NULL | "KBZ Pay" |
| kind | ENUM('wallet','cod') | NOT NULL | controls UI surface |
| account_name | VARCHAR(120) | NULL | owner's name on the wallet account |
| account_phone | VARCHAR(20) | NULL | merchant phone for transfer |
| qr_image_url | VARCHAR(255) | NULL | R2 object key (`payment-qr/<id>.webp`) in the public bucket. Legacy rows may still hold the disk path `/payment-qr/<id>.webp`; `r2PublicUrl()` accepts either shape and builds a full URL using `NEXT_PUBLIC_CDN_URL`. |
| instructions_md | TEXT | NULL | extra notes shown on order page |
| sort_order | INT | NOT NULL DEFAULT 0 | |
| is_active | BOOLEAN | NOT NULL DEFAULT false | hidden when false; methods incomplete (missing account info or QR) silently hidden too |
| created_at, updated_at | TIMESTAMP | | |

### `carts`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | CHAR(36) | PK | |
| user_id | CHAR(36) | NULL, FK → users.id ON DELETE CASCADE | NULL for guest |
| session_id | CHAR(36) | NULL | cookie value for guest carts |
| updated_at | TIMESTAMP | NOT NULL DEFAULT now() ON UPDATE now() | |

Constraint: exactly one of `user_id` or `session_id` is non-null.
Indexes: `idx_carts_user`, `idx_carts_session`.

### `cart_items`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| cart_id | CHAR(36) | NOT NULL, FK → carts.id ON DELETE CASCADE | |
| product_id | VARCHAR(64) | NOT NULL, FK → products.id ON DELETE CASCADE | |
| qty | INT | NOT NULL, 1-99 | |
| added_at | TIMESTAMP | NOT NULL DEFAULT now() | |

PK: `(cart_id, product_id)`.

### `wishlists`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| user_id | CHAR(36) | NOT NULL, FK → users.id ON DELETE CASCADE | |
| product_id | VARCHAR(64) | NOT NULL, FK → products.id ON DELETE CASCADE | |
| added_at | TIMESTAMP | NOT NULL DEFAULT now() | |

PK: `(user_id, product_id)`. Guests use localStorage only; merged on login by the browser, since no server can read local storage. The merge is one batched insert relying on that PK to absorb anything already saved, and the local copy is cleared on sign-out so it cannot follow the next person into their account.

### `orders`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | CHAR(36) | PK | also used as payment reference |
| user_id | CHAR(36) | NOT NULL, FK → users.id | |
| status | ENUM('pending_payment','payment_submitted','confirmed','delivered','cancelled') | NOT NULL DEFAULT 'pending_payment' | wallet path: `pending_payment` → `payment_submitted` → `confirmed` → `delivered`. COD path: `pending_payment` → `confirmed` → `delivered`. Any non-terminal → `cancelled`. `confirmed` is the single payment-commit boundary (decrements stock + sends invoice email) for both methods. |
| subtotal_mmk | BIGINT | NOT NULL, ≥ 0 | items only |
| delivery_fee_mmk | BIGINT | NOT NULL, ≥ 0 | snapshot from `divisions.delivery_fee_mmk` at order time |
| total_mmk | BIGINT | NOT NULL, ≥ 0 | `subtotal_mmk + delivery_fee_mmk` |
| shipping_address_id | CHAR(36) | NULL, FK → addresses.id ON DELETE SET NULL | Provenance link only. Never read for delivery details — use the `ship_*` snapshot below. |
| ship_recipient | VARCHAR(120) | NULL | Delivery destination frozen at placement, same rule as `order_items.name_snapshot`. Address rows stay customer-editable, so reading through the join let a Wednesday edit silently redirect a Monday order that had not shipped. No FKs on any `ship_*` column. |
| ship_phone | VARCHAR(20) | NULL | |
| ship_telegram | VARCHAR(32) | NULL | |
| ship_division_id | VARCHAR(40) | NULL | plain value, not a FK |
| ship_division_name | VARCHAR(60) | NULL | snapshot: division names are admin-editable |
| ship_city | VARCHAR(120) | NULL | |
| ship_township | VARCHAR(120) | NULL | |
| ship_street | VARCHAR(200) | NULL | |
| ship_landmark | VARCHAR(200) | NULL | |
| ship_maps_url | VARCHAR(512) | NULL | re-validated at render, not trusted from storage |
| payment_method_id | VARCHAR(40) | NOT NULL, FK → payment_methods.id ON DELETE RESTRICT | |
| payment_proof_url | VARCHAR(255) | NULL | Bare basename `<uuid>.webp` of the slip object in R2 private bucket at key `slips/<order_id>/<basename>`. Legacy rows may hold a full `/slips/<orderId>/<uuid>.webp` path — the slip-streaming route strips to basename. Never a public URL. |
| payment_tx_ref | VARCHAR(120) | NULL | optional customer-entered wallet tx ID |
| payment_ref | VARCHAR(64) | NULL | mirror of order UUID by default; owner can overwrite with bank-side ref |
| expires_at | TIMESTAMP | NOT NULL | `placed_at + 24h`; auto-cancel cron checks this |
| notes | TEXT | NULL | customer notes / admin notes |
| placed_at | TIMESTAMP | NOT NULL DEFAULT now() | |
| updated_at | TIMESTAMP | NOT NULL DEFAULT now() ON UPDATE now() | |

Indexes: `idx_orders_user`, `idx_orders_status`, `idx_orders_placed`, `idx_orders_expires` (`status, expires_at`) for the auto-cancel cron.
Removed: `billing_address_id` (single-address checkout is sufficient at retail volume).

### `order_items`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | BIGINT | PK AUTO_INCREMENT | |
| order_id | CHAR(36) | NOT NULL, FK → orders.id ON DELETE CASCADE | |
| product_id | VARCHAR(64) | NOT NULL, FK → products.id ON DELETE RESTRICT | |
| qty | INT | NOT NULL, ≥ 1 | |
| unit_price_mmk_snapshot | BIGINT | NOT NULL | what the customer actually paid, sale price included |
| list_price_mmk_snapshot | BIGINT | NULL | the normal price this line was discounted from; NULL when it was not on sale |
| name_snapshot | VARCHAR(120) | NOT NULL | product name at time of order |

Snapshots preserve order history if product price/name changes later.

### `reviews`
| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | CHAR(36) | PK | |
| product_id | VARCHAR(64) | NOT NULL, FK → products.id ON DELETE CASCADE | |
| user_id | CHAR(36) | NOT NULL, FK → users.id ON DELETE CASCADE | |
| rating | TINYINT | NOT NULL, 1-5 | |
| title | VARCHAR(120) | NULL | |
| body | TEXT | NOT NULL | 10-2000 chars |
| status | ENUM('pending','approved','rejected') | NOT NULL DEFAULT 'pending' | |
| verified_purchase | BOOLEAN | NOT NULL DEFAULT false | auto-set if user has matching order_item |
| created_at | TIMESTAMP | NOT NULL DEFAULT now() | |

Constraint: `UNIQUE(product_id, user_id)` — one review per product per user.
Index: `idx_reviews_product_status`.

---

## Relationships

```
categories 1 ── ∞ products
products   1 ── ∞ product_specs
products   1 ── ∞ cart_items
products   1 ── ∞ order_items (RESTRICT — keep history)
products   1 ── ∞ wishlists
products   1 ── ∞ reviews

users      1 ── ∞ addresses
users      1 ── ∞ carts
users      1 ── ∞ orders
users      1 ── ∞ reviews
users      1 ── ∞ wishlists

carts      1 ── ∞ cart_items
orders     1 ── ∞ order_items
orders     0 ── 1 shipping_address (addresses)
orders     0 ── 1 billing_address (addresses)
```

## Enums + constants
```ts
type OrderStatus = 'pending_payment' | 'paid' | 'fulfilled' | 'cancelled'
type ReviewStatus = 'pending' | 'approved' | 'rejected'
type UserRole = 'customer' | 'admin'
type Currency = 'MMK'

const QTY_MIN = 1
const QTY_MAX = 99
const SEARCH_QUERY_MAX = 200
const REVIEW_BODY_MIN = 10
const REVIEW_BODY_MAX = 2000
const RATING_MIN = 1
const RATING_MAX = 5
const PASSWORD_MIN = 10
const BCRYPT_ROUNDS = 12
const VERIFICATION_TOKEN_TTL_MIN = 30
const PASSWORD_RESET_TTL_MIN = 15
const SESSION_DAYS = 30
```

## Validation (zod, at route boundary)

Id shapes live in `src/lib/ids.ts` (`UUID_RE`, `PRODUCT_ID_RE`) and are imported
by every route that guards a path segment. `SLUG_REGEX` in `src/lib/slugify.ts`
is separate and stricter: it is the rule for *minting* a slug, and it refuses
leading and trailing dashes that `PRODUCT_ID_RE` must keep accepting for rows
written before it existed.

- `productSlug`: `PRODUCT_ID_RE` (`/^[a-z0-9-]+$/`), 1-80 chars
- `email`: RFC 5322 simplified, ≤ 254 chars
- `password`: ≥ 10 chars, requires lowercase + uppercase + digit
- `cartItemQty`: int, 1-99
- `addressPhone`: E.164 regex
- `addressPostal`: 3-20 chars, alnum + dash + space
- `reviewRating`: int, 1-5
- `reviewBody`: trimmed, 10-2000 chars, HTML stripped

## Schema changes on a live database

This repo keeps no migration history - `src/db/migrations` does not exist, and
`docs/db-bootstrap.sql` only runs on a fresh install. A schema change therefore
lands in three places: the Drizzle schema under `src/db/schema/`, the bootstrap
file, and a statement run by hand against the live database.

Run the statement **before** deploying the code that depends on it. Both columns
below are additive and nullable, so an existing row is untouched and the old
code keeps working against the new schema.

```sql
-- Sale price feature
ALTER TABLE `products`
  ADD COLUMN `sale_price_mmk` BIGINT NULL AFTER `price_mmk`;

ALTER TABLE `order_items`
  ADD COLUMN `list_price_mmk_snapshot` BIGINT NULL AFTER `unit_price_mmk_snapshot`;

-- Password reset
ALTER TABLE `verification_tokens`
  ADD COLUMN `purpose` ENUM('verify','reset') NOT NULL DEFAULT 'verify' AFTER `token`;

ALTER TABLE `users`
  ADD COLUMN `password_changed_at` TIMESTAMP(3) NULL AFTER `password_hash`;
```

Both reset columns are safe to apply ahead of the deploy. `purpose` defaults to
`verify`, which is what every existing row is, and the verify route keeps
matching them. `password_changed_at` stays NULL, and the JWT check treats NULL
as "accept whatever token this user holds" — so applying the ALTER early, or
rolling the code back after it, signs nobody out. **Do not backfill it.** A
backfill would give every existing session a stamp it does not carry and log
every customer out at once.

Verified by loading the previous bootstrap into a scratch database, applying the
statements above, and diffing `SHOW COLUMNS` against a fresh install of the
current bootstrap: identical for both tables.

## Soft delete strategy
- Products: `is_active = false` to hide; do not hard-delete (order_items reference).
- Reviews: `status = 'rejected'` to hide.
- Users: hard-delete via DSAR request (cascades to addresses/cart/wishlist; orders retain `user_id` via SET NULL on user delete? **TBD — keep restrict for now to preserve sales records.**).
- Categories: deletion blocked if any active product references it.

## Audit fields standard
- All tables that mutate: `created_at`, `updated_at`.
- No `created_by` / `updated_by` in MVP — single-admin model.

## Auth model
- Auth.js v5 JWT strategy. Session token in `httpOnly`, `secure`, `sameSite=lax` cookie. 30-day rolling.
- Password hash: bcrypt rounds 12.
- Email verification required before sign-in completes.
- Password reset: token in `verification_tokens` with `purpose = 'reset'`, 15-min TTL, single-use, one live link per account. Any account with the address on file can reset — including OAuth-only ones, which gain a password, and unverified ones, which are verified by the act of opening the link.
- Sessions are evicted on password change via `users.password_changed_at`: the JWT carries the stamp it was minted with, and the `jwt` callback in `src/lib/auth.ts` refuses a token that no longer matches. A NULL column means the password has not moved since the column shipped and any token is adopted.

## File/media storage
- Product photos: Cloudflare R2 public bucket, `products/{slug}/{01-04}.webp` plus a `-thumb` variant per slot (no DB rows). Served through `NEXT_PUBLIC_CDN_URL`; `PHOTO_BASE` falls back to `/products` when that is unset.
- Uploading slot 01 in `/admin/products` sets `products.has_photos`; removing it clears the flag. The server writes both sizes from one upload with `sharp`.
- Gallery and `Tile` are 404-tolerant: a missing file falls back to the product swatch via `onError`.
- Naming: `^0[1-4]\.webp$`. Max file size 2 MB. Owner generates WebP locally with `cwebp -q 82`.
- Future: lift to R2/S3 by changing one base URL constant. Folder structure already matches `s3://bucket/products/{slug}/01.webp`.

## Caching layer
- Catalog reads: `unstable_cache` wrapping Drizzle queries, tagged `products`, `category:{id}`. Revalidate every 60s + on demand via `revalidateTag` after Studio writes (manual trigger).
- Cart, orders, wishlist: no cache (per-user, mutating).
- Search index (Fuse): built on the server-rendered catalog, per page load.

## Background jobs
- Phase 4-7 has no queue. Tasks run inline:
  - Order confirmation email: awaited in checkout handler (acceptable < 500ms via Hostinger SMTP).
  - Low-stock alert email: triggered inline on order success if any item drops below `low_stock_threshold` — owner gets one mail per breach.

## `site_settings` keys

Schema-free key/value store (`key` PK, `value` text, `updated_at`). Read with `getSetting`, written with `setSetting` (`src/lib/site-settings.ts`). Rows are data, not schema — adding a key needs no migration.

| Key | Written by | Meaning |
| --- | ---------- | ------- |
| `why_image` | `POST /api/v1/admin/site/why-image` | R2 object key for the homepage "Why" image. |
| `orders_stale_days` | `PATCH /api/v1/admin/settings` | Days before a `confirmed` order enters the admin stale queue. Clamped 1–30, defaults to 3 when unset or unparseable. |

`PATCH /api/v1/admin/settings` allowlists writable keys and validates each with its own schema. Do not turn it into a generic key/value writer — an admin session would become arbitrary write access to this table.

## Migration strategy

**`docs/db-bootstrap.sql` is the single source of install truth.** There is no
migration history: the generated `src/db/migrations/` folder was removed, and
`drizzle-kit migrate` is not wired up. It never worked against these databases
anyway — the tables came from the bootstrap script, so `__drizzle_migrations`
was empty and a migrate run tried to replay `CREATE TABLE`s that already
existed.

Changing the schema:
1. Edit `src/db/schema/*.ts`.
2. Write the matching `CREATE TABLE` / `ALTER TABLE` into section 1 of
   `docs/db-bootstrap.sql` by hand. `npm run db:generate` can produce the SQL to
   copy from; it writes to the gitignored `.drizzle-generated/`, which you
   delete afterwards. That folder is scratch, never a history.
3. Apply the change to each live database with a one-off script in `scripts/`
   (a short `db.execute(sql\`ALTER TABLE ...\`)` script) or a direct `ALTER`.
4. Hand-edit `docs/db-bootstrap.sql` if reference data or the catalog moved.

Verify before trusting the file: create a scratch database, run the bootstrap
into it, and diff `information_schema.COLUMNS` against the live database. Zero
drift means a rebuild is safe.

Rebuilding from scratch (the intended path): drop every table, then import
`docs/db-bootstrap.sql`. Customer data — users, orders, carts, reviews,
wishlists, site_settings — is never in that file and does not survive a
rebuild.

---

## API

### Status
**Phase 4 = filesystem photos only (no API change).**
**Phase 5+ = live API replacing inline JSON.**

### Base URL + versioning
- All endpoints under `/api/v1/...`.
- Backward compatibility: deprecate, never silently remove; minimum 90 days notice in PRs.

### Auth method
- JWT in `httpOnly` cookie via Auth.js. Server reads `auth()` helper.
- Public read endpoints unauthenticated.
- All mutations require an active session OR a same-origin guest cart cookie for cart endpoints.

### Endpoint table

**Catalog (public reads)**

There are no catalog endpoints. Every catalog read - shop, category, product,
search, sitemap - happens inside a server component through `src/lib/catalog.ts`
(`getAllProducts`, `getAllCategories`, `getProductBySlug`, ...), which wraps the
DB query in `unstable_cache` with a 60s revalidate and the `products` /
`categories` tags. The public `GET /api/v1/products`, `/products/[slug]` and
`/categories` routes were removed in favour of that path - nothing called them.

**Cart**
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/cart` | Current cart (session-keyed) | No |
| POST | `/api/v1/cart/items` | Add item `{productId, qty}`. Refuses 409 when the line would exceed stock - checked against the total the line reaches, since adding sums into what is there | No |
| PATCH | `/api/v1/cart/items/[productId]` | Set qty `{qty}`. Same 409. `qty: 0` empties the line and skips the check, since removing is how a blocked cart gets fixed | No |
| DELETE | `/api/v1/cart/items/[productId]` | Remove item | No |
| POST | `/api/v1/cart/merge` | Merge guest cart into user cart. Not on the sign-in path — the NextAuth `signIn` event does that server-side for every provider. Kept as an idempotent manual retry. | Yes |

**Wishlist**
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/wishlist` | List wishlist items | Yes |
| POST | `/api/v1/wishlist/[productId]` | Add | Yes |
| DELETE | `/api/v1/wishlist/[productId]` | Remove | Yes |
| POST | `/api/v1/wishlist/merge` | Merge guest localStorage wishlist | Yes |

**Addresses**
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/addresses` | List own addresses | Yes |
| POST | `/api/v1/addresses` | Create | Yes |
| PATCH | `/api/v1/addresses/[id]` | Update | Yes |
| DELETE | `/api/v1/addresses/[id]` | Delete | Yes |

**Orders**
| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/orders` | Place order from current cart. Body: `{shippingAddressId \| newAddress, paymentMethodId, notes?}`. Server snapshots delivery_fee from `divisions`, sets `expires_at = now() + 24h`. Performs a per-line `stockQty >= qty` snapshot check (returns 409 `OUT_OF_STOCK` if any fails) but **does not** decrement stock — see TECH "Stock oversell". Order is created in `pending_payment` and physical inventory is committed later when admin flips status to `confirmed`. | Yes |
| GET | `/api/v1/orders` | List own orders | Yes |
| POST | `/api/v1/orders/[id]/slip` | Upload payment proof (multipart, image ≤ 8MB). Server validates magic-byte + MIME (JPG/PNG/WEBP), `sharp` resize to ≤1600px + WebP re-encode (EXIF stripped), `PutObject` to R2 private bucket at key `slips/<orderId>/<uuid>.webp`. Sets `payment_proof_url` = basename, `payment_tx_ref` (optional), flips status `pending_payment` → `payment_submitted`. On replacement deletes the prior R2 object only after the new put succeeds. Rejects if status not `pending_payment`/`payment_submitted` or method `kind = 'cod'`. Rate-limit 10/hour/user. | Yes |
| GET  | `/api/v1/orders/[id]/slip` | Stream the slip back as `image/webp` after auth check (`order.user_id === session.user.id` OR `users.role = 'admin'`). Response headers: `Cache-Control: private, no-store`. 404 if no slip on the order. Used by both customer order page and admin order view; the static `/slips/...` path is no longer served. | Yes |
| POST | `/api/v1/orders/[id]/cancel` | Customer-initiated cancel. Allowed only when `status = 'pending_payment'`. Pure status flip — pending orders never held stock under the commit-at-payment model. | Yes |

**Payment methods and divisions**

No public endpoints. `/checkout` is a server component and reads active payment
methods and non-blocked divisions straight from the DB; `/shipping` uses
`getDeliveryFees()`. The former `GET /api/v1/payment-methods` and
`GET /api/v1/divisions` routes were removed - no client called them.

**Reviews**
| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/products/[slug]/reviews` | Approved reviews for product | No |
| POST | `/api/v1/products/[slug]/reviews` | Submit review (status pending), auto verified-purchase | Yes |

**Contact**
| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/contact` | Send a message to the shop (zod, 5/hr/IP, honeypot) | No |

**Auth (Auth.js handled)**
- All under `/api/auth/*` — sign in, sign out, callback (Google), CSRF, verify-request, error.

**Custom auth helpers**
| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/auth/signup` | bcrypt(12) password hash + email verification token | No |
| POST | `/api/v1/auth/verify` | Consume verification token (`purpose = 'verify'`) + flip `email_verified` | No |
| POST | `/api/v1/auth/forgot-password` | Body `{email}`. Mints a `reset` token (15 min, supersedes any earlier one) and mails the link. Answers `{ok: true}` whether or not the address is registered — same posture as signup and sign-in. Writes nothing for an unknown address. | No |
| PATCH | `/api/v1/auth/change-password` | Body `{currentPassword, newPassword}`. For a signed-in customer. Proves the current password with bcrypt before writing — the session alone is not enough — then stamps `password_changed_at`, which signs out every other device. Returns the new stamp so the caller can re-authenticate and keep its own session. 409 `NO_PASSWORD_SET` for a Google-only account, which is pointed at the reset flow instead. Does not touch `email_verified`. | Yes |
| POST | `/api/v1/auth/reset-password` | Body `{email, token, password}`. Spends a live `reset` token, writes the bcrypt(12) hash, stamps `password_changed_at`, and sets `email_verified` when it was NULL. Deletes every `reset` token for the address, then mails a change notice. 404 on an expired, spent, or wrong-purpose token. | No |

**Admin (Phase 8 — `users.role = 'admin'` required)**
| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/admin/products` | Create new product. Body: `{slug, name, categoryId, priceMmk, salePriceMmk?, tagline, description, swatch, stockQty, lowStockThreshold, featured, isActive, specs[]}`. Slug regex `^[a-z0-9-]+$`, uniqueness checked server-side. `id = slug`. Inserts product + spec rows in a transaction. Revalidates `products` cache tag. | Admin |
| PATCH | `/api/v1/admin/products/[id]` | Full or partial update of product columns and specs. Same body shape as POST minus id. Revalidates cache. | Admin |
| POST | `/api/v1/admin/products/[id]/photos/[slot]` | Multipart upload of slot ∈ {01, 02, 03, 04}. JPG/PNG/WEBP ≤ 10 MB. `sharp` produces two buffers: `products/<slug>/0X.webp` (1600×1600 max, EXIF stripped) and `products/<slug>/0X-thumb.webp` (600×600 max). Both `PutObject`'d to R2 public bucket in parallel; on partial failure the route deletes both and 502s. Flips `products.has_photos = true` on slot-01 success. Replaces any existing pair via overwrite. Rate-limit 30/hr/admin. Returns full CDN URLs in the response. | Admin |
| DELETE | `/api/v1/admin/products/[id]/photos/[slot]` | Removes the hero + thumb pair for one slot. If the slot deleted was 01 and no other slots remain, sets `has_photos = false`. | Admin |
| PATCH | `/api/v1/admin/orders/[id]` | Update `status`. Allowed transitions enforced server-side per status machine. Wallet: `pending_payment` → `payment_submitted` → `confirmed` → `delivered`. COD: `pending_payment` → `confirmed` → `delivered`. Any non-terminal → `cancelled`. Transition to `confirmed` decrements stock per line items (transactional, `stockQty >= qty` guard, returns 409 `OUT_OF_STOCK` on race) and sends the customer an `OrderInvoice` email; transition to `delivered` sends `OrderDelivered`; cancel-from-`confirmed` restores stock. Revalidates the `products` cache tag on any stock-moving transition. | Admin |
| DELETE | `/api/v1/admin/products/[id]` | Hard-delete a product when safe. Refuses with 409 `CONFLICT` if any `order_items` row references the product (order history must stay referentially intact). On safe delete: row removed (FK cascade cleans `product_specs`, `reviews`, `cart_items`, `wishlists`) and best-effort `DeleteObject` for all eight R2 keys (`products/<slug>/0X.webp` + `products/<slug>/0X-thumb.webp` for X ∈ {1..4}). Revalidates `products` cache tag. Admin client falls back to `PATCH isActive=false` on 409 so the row becomes a soft-delete instead. | Admin |
| PATCH | `/api/v1/admin/reviews/[id]` | Update `status` (`pending` / `approved` / `rejected`). | Admin |
| GET, POST, PATCH, DELETE | `/api/v1/admin/payment-methods[/[id]]` | CRUD + QR upload. QR is optional — a wallet/bank method is "complete" with just account_name + account_phone. Validates kind enum, regex on account_phone. | Admin |
| PATCH | `/api/v1/admin/divisions/[id]` | Edit `delivery_fee_mmk`, `cod_allowed`, `is_blocked`, `sort_order`. Name + id immutable. | Admin |

### Request/response example

```json
// GET /api/v1/products/mxk-65-walnut
{
  "data": {
    "id": "mxk-65-walnut",
    "slug": "mxk-65-walnut",
    "name": "MXK-65 Walnut",
    "category": "keyboards",
    "priceMmk": 520000,
    "salePriceMmk": null,
    "tagline": "65 percent hot-swap with a walnut top case.",
    "description": "…",
    "specs": [{ "label": "Layout", "value": "65 percent" }],
    "swatch": "#9C7A55",
    "stockQty": 8,
    "lowStockThreshold": 3,
    "hasPhotos": true,
    "featured": true,
    "reviews": { "count": 12, "average": 4.6 },
    "createdAt": "2026-06-15T00:00:00Z",
    "updatedAt": "2026-06-15T00:00:00Z"
  },
  "error": null
}
```

### Error response format
```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid product slug.",
    "details": { "field": "slug", "reason": "regex_mismatch" },
    "status": 400
  }
}
```

Standard error codes: `VALIDATION_ERROR`, `NOT_FOUND`, `UNAUTHENTICATED`, `FORBIDDEN`, `RATE_LIMITED`, `OUT_OF_STOCK`, `CONFLICT`, `INTERNAL`.

Cart and checkout add three: `INSUFFICIENT_STOCK` and `UNAVAILABLE` from the cart write routes, and `CART_UNORDERABLE` from `POST /api/v1/orders`. The last one carries every refused line at once rather than the first:

```json
{
  "data": null,
  "error": {
    "code": "CART_UNORDERABLE",
    "message": "Only 2 of Keychron K2 Pro left.",
    "details": {
      "lines": [
        { "productId": "keychron-k2-pro", "problem": { "kind": "insufficient", "available": 2 } },
        { "productId": "premium-deskmat", "problem": { "kind": "out_of_stock" } }
      ]
    },
    "status": 409
  }
}
```

`message` is a sentence for the customer; `details` is what the client acts on. Until 2026-08-22 this route answered `OUT_OF_STOCK:<productId>` in `message` and the checkout form put that on screen verbatim.

`PATCH /api/v1/admin/orders/[id]` follows the same rule. A confirmation that loses the stock race answers:

```json
{
  "data": null,
  "error": {
    "code": "OUT_OF_STOCK",
    "message": "Not enough stock left for keychron-k2-pro. Restock before confirming.",
    "details": { "productId": "keychron-k2-pro" },
    "status": 409
  }
}
```

The `OUT_OF_STOCK:<productId>` string still exists inside the route, as the throw that rolls the transaction back, but it is unpacked before it becomes a response. It used to be the response, and both admin screens rebuilt the id from it with `split(':')`.

### Rate limiting
Implemented in `src/lib/rate-limit.ts` — in-memory bucket, single instance. Swap to Upstash on horizontal scale.

The client IP comes from the **proxy-appended end** of `X-Forwarded-For`, not the
first entry. Each proxy appends the address it saw, so everything left of the
last `TRUSTED_PROXY_HOPS` entries is caller-supplied: reading the first entry
lets any client mint a fresh bucket per request and bypass every limit below.
`TRUSTED_PROXY_HOPS` defaults to 1 (Hostinger's terminating proxy); set it to 0
when nothing fronts the app, which makes the limiter ignore `X-Forwarded-For`
and fall back to `X-Real-IP`.

| Endpoint | Limit |
|---|---|
| `POST /api/v1/contact` | 5/hour/IP |
| `POST /api/v1/cart/items` | 60/min/session |
| `POST /api/v1/orders` | 10/hour/user |
| `POST /api/v1/orders/*/slip` | 10/hour/user |
| `POST /api/v1/orders/*/cancel` | 5/hour/user |
| `POST /api/v1/admin/products/*/photos/*` | 30/hour/admin |
| `POST /api/v1/products/*/reviews` | 5/day/user |
| `POST /api/v1/auth/signup` | 5/hour/IP |
| `POST /api/auth/callback/credentials` | 10/15min/email + 20/15min/IP |
| `POST /api/v1/auth/forgot-password` | 10/hour/IP + 5/hour/email |
| `POST /api/v1/auth/reset-password` | 10/hour/IP |
| `PATCH /api/v1/auth/change-password` | 10/hour/user |

429 response includes `Retry-After` header. The sign-in limiter wraps Auth.js's
own handler in `src/lib/auth-handlers.ts` (Auth.js owns that route, so the app's
per-route limiting never sees it) and answers in the `{ url }` shape the Auth.js
client expects, carrying `?error=TooManyRequests`. Attempts are counted whether
or not they succeed.

### Cross-origin writes
`src/middleware.ts` refuses any non-`GET`/`HEAD`/`OPTIONS` request to `/api/*`
whose `Origin` does not match either `AUTH_URL`/`NEXT_PUBLIC_SITE_URL` or the
request's own `Host`, returning 403 `CROSS_ORIGIN`. Sessions are cookie-borne, so
without this the only thing standing between a third-party page and an
authenticated write is the Auth.js cookie's default `SameSite=lax` — a default
this repo never asserts. A missing `Origin` is treated as cross-site.

The same middleware sets `Content-Security-Policy` with a per-request nonce;
`next.config.mjs` deliberately does not, since two CSP headers are intersected by
the browser and the policy must live in one place.

### Owner alerts and PII

Telegram alerts carry an order reference, method, total and a **masked** customer
address (`maskEmail()` in `src/lib/mask.ts`, e.g. `mi****om`). The unmasked
address goes only to the owner's own inbox via the order-alert email. When SMTP
is unconfigured, production logs the recipient masked and never the body, which
would otherwise contain live verification tokens.

### Admin actions audit
No `audit_log` table yet — admin role is single-operator in MVP, and Drizzle Studio access already requires SSH tunnel. When second admin lands, add `audit_log(actor_id, action, target_table, target_id, payload_json, created_at)` and log every `/api/v1/admin/*` mutation.

### Payment surface
- No card payments. No external gateway. Wallet apps (KBZ Pay / Aya Pay / UAB Pay) + Cash on Delivery only.
- Each wallet/bank method is a row in `payment_methods` with owner-provided account name + account phone (or bank account number). QR is optional — if `qr_image_url` is null the order page hides the QR slot and renders account info at full width. Customer scans the QR (or types the account number manually), transfers exact MMK amount, returns to `/order/[id]`, uploads slip image (and optional tx ref) → `status='payment_submitted'`.
- Owner verifies in bank app → flips to `paid` from `/admin/orders/[id]`. State transitions are idempotent.
- COD: no slip. Status `pending_payment` → owner phone confirms → `confirmed` → ship → `delivered`. Driver collects cash at door.
- Auto-cancel cron (`scripts/cancel-expired-orders.ts`, runs periodically) sets `status='cancelled'` where `status='pending_payment' AND expires_at < NOW()`. No stock math — pending orders never held inventory under the commit-at-payment model.
- Slip file storage: R2 private bucket at key `slips/<orderId>/<uuid>.webp`. `sharp` server-side resize to ≤1600px + EXIF strip + WebP re-encode, 8MB cap on upload. Served only via authed `GET /api/v1/orders/[id]/slip` streaming route (does a `GetObject` against R2 after auth check) — never directly addressable on the public web.
