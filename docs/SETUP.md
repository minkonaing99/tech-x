# SETUP — merxylab store

## Setup

### Prerequisites
- **Node.js** ≥ 20.0.0
- **npm** ≥ 10 (project standardised on npm — see TECH ADR-09. Hostinger's corepack chokes on pnpm 11.)
- **MySQL** ≥ 8.0 (Phase 5+) — local dev with `root` user, default port 3306
- **cwebp** (libwebp) — for converting product photos to WebP (`brew install webp`)
- Git
- A modern browser (Chromium, Firefox, Safari)

### Install steps
```bash
# Clone (when repo exists)
git clone <repo-url> merxylab-store
cd merxylab-store

# Install dependencies
npm install

# Run dev server
npm run dev
# → http://localhost:3000
```

### Env vars
Placeholder phase has **no required env vars**. The catalog is inlined as JSON.

**Phase 5+** uses `.env.local` (gitignored). A committed `.env.example` lists all keys with empty values.

| Key | Description | Required from phase |
|-----|-------------|---------------------|
| `DATABASE_URL` | `mysql://root:Tkhantiang1@localhost:3306/merxylab` (local dev only) | 5 |
| `AUTH_SECRET` | NextAuth JWT secret — generate via `openssl rand -base64 32` | 6 |
| `AUTH_URL` | Canonical site URL (`http://localhost:3000` dev) | 6 |
| `AUTH_GOOGLE_ID` | Google OAuth client ID | 6 |
| `AUTH_GOOGLE_SECRET` | Google OAuth client secret | 6 |
| `SMTP_HOST` | Hostinger SMTP (`smtp.hostinger.com`) | 6 |
| `SMTP_PORT` | `465` (TLS) | 6 |
| `SMTP_USER` | Mailbox username (e.g. `noreply@your-domain.com`) | 6 |
| `SMTP_PASS` | Mailbox password from hPanel | 6 |
| `EMAIL_FROM` | Display From: header (e.g. `merxylab <noreply@your-domain.com>`) | 6 |
| `BANK_PAYMENT_INSTRUCTIONS` | Plain-text block included in order confirmation emails | 6 |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL exposed to client (sitemap, OG) | 3 |
| `UPSTASH_REDIS_REST_URL` | Optional rate-limit backend; falls back to in-memory if unset | 7 |
| `UPSTASH_REDIS_REST_TOKEN` | Pair to URL | 7 |

**Never commit `.env.local`. Never reuse the dev MySQL password (`Tkhantiang1`) in production.**

### Local MySQL setup (Phase 5)
```bash
# install (macOS)
brew install mysql
brew services start mysql

# secure + set root password
mysql_secure_installation
# pick: yes / Tkhantiang1 / yes / yes / yes / yes

# create database
mysql -u root -p
# at the prompt:
CREATE DATABASE merxylab CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
EXIT;

# verify connection
mysql -u root -p merxylab -e "SHOW TABLES;"
```

### Database bootstrap — fresh DB via SQL (preferred for prod)
For a clean install (local or Hostinger), don't run the seed scripts — paste `docs/db-bootstrap.sql` directly:

```bash
# Local
mysql -u root -p merxylab < docs/db-bootstrap.sql

# Hostinger
# hPanel → MySQL Databases → phpMyAdmin → select `u<acct>_merxylab_store` DB → Import → upload docs/db-bootstrap.sql → Go.
```

The file creates 16 tables + FK constraints + indexes, then inserts 15 divisions, 5 payment methods, and the **7-product catalog with its 25 spec rows** (sections 4-5), so a fresh install boots with a working shop. Edit those sections by hand as the catalog changes, or add products through `/admin` and leave the file as a baseline. No app code or env vars touched.

Those two tables are not catalog data and must stay: checkout reads divisions for delivery fees and COD eligibility, and the payment step reads payment_methods.

There is no `categories` table. The five categories live in `src/lib/categories.ts` and ship with the code.

The whole file is hand-maintained: section 1 (schema) from `src/db/schema/*.ts`, sections 2-5 by editing it directly. A `db:dump-seed` generator used to rewrite sections 2-3 from a live database and was removed - its rewrite window ran to end-of-file, so it silently deleted the product catalog in sections 4-5.

There is **no migration path**. `src/db/migrations/` and `npm run db:migrate` were removed: migrations never ran against these databases, so the history was empty and a migrate attempt replayed `CREATE TABLE`s that already existed. Schema changes go into the bootstrap file by hand plus a one-off script in `scripts/`. `npm run db:generate` still exists to produce SQL worth copying, and `npm run db:push` still diffs schema against a database.

The tail of `db-bootstrap.sql` also documents the **stock-commit model** (0.13.6+) and includes a commented-out one-off **"release phantom-held stock"** SQL block for any DB that ran on the pre-0.13.6 order code. Uncomment + run that block once on prod if upload-failures left orders stuck in `pending_payment` / `payment_submitted` with stock decremented but never confirmed. Skip on fresh DBs.

### Granting admin role
After the first signup (admin user creates a normal account via the signup flow), promote the user via SQL — there is no UI escalation path by design:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

Run from phpMyAdmin → SQL tab. Verify with `SELECT id, email, role FROM users WHERE role='admin';`. From then on `/admin/*` UI + `/api/v1/admin/*` routes accept the session.

### Setting up Cloudflare R2
Required from 0.14.0+ for product photo / payment QR / slip uploads. See TECH ADR "Photos on Cloudflare R2".

1. **Create two buckets** in the Cloudflare R2 dashboard. They must be **two distinct
   buckets** — see the warning below.
   - `merxylab-store` — product photos + payment-method QR codes. Reads must be public.
   - `merxylab-secret` — customer payment slips. **No public binding of any kind.**
2. **Expose only the public bucket.** Bind a custom domain (bucket → Settings → Custom
   domains → e.g. `cdn.merxylab.com` under CF DNS), which becomes `NEXT_PUBLIC_CDN_URL`.
   The r2.dev Public Development URL also works and is what production currently uses, but
   Cloudflare rate-limits it and does not recommend it for production; a custom domain is
   the upgrade.
3. **Leave the private bucket closed.** No custom domain, no Public Development URL, no
   CORS policy — the app reads it server-side over the S3 API only. Do **not** add a Bucket
   Lock rule either: retention blocks the `DeleteObject` the slip route issues when a
   customer replaces a slip.
4. **Create an API token** (R2 → Manage R2 API Tokens). Scope to both buckets, permissions:
   Object Read + Write + Delete. Capture `Access Key ID`, `Secret Access Key`, and your
   `Account ID` (URL bar in the R2 dashboard).
5. **Populate `.env.local`** (or hPanel → Easy Deploy → env vars on Hostinger):
   ```
   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_PUBLIC_BUCKET=merxylab-store
   R2_PRIVATE_BUCKET=merxylab-secret
   NEXT_PUBLIC_CDN_URL=https://cdn.merxylab.com
   ```

> **The two bucket names must differ.** Production ran with both variables set to the same
> bucket, and because that bucket had a public r2.dev binding, every customer payment slip
> written to `slips/<orderId>/<uuid>.webp` was fetchable without a session — bypassing the
> authed `GET /api/v1/orders/[id]/slip` route entirely. The UUID path segments made the URLs
> unguessable, which is the only reason this was not worse. Fixed 2026-08-17 by splitting
> `merxylab-secret` out. If you ever set these two to the same value, you have re-created it.
6. **Rotate the API token every 90 days** along with `AUTH_SECRET` and SMTP creds.

Smoke test after deploy:
- `/admin/products` → upload one product photo → page render should load both 1600px hero and 600px thumb via `cdn.merxylab.com/products/<slug>/...`.
- `/admin/payment-methods` → upload one QR → order page renders via CDN.
- Place a test order, upload a slip → confirm `/api/v1/orders/<id>/slip` streams the image (200 image/webp) for the owner + admin, 403 / 404 for anyone else.

### Photo workflow (Phase 4)
Photos live in `public/products/{slug}/{NN}.webp`, slot 01 required for `hasPhotos = true`.

```bash
# 1. Drop original photos into the slug folder
mv ~/Downloads/mxk-keyboard-*.jpg public/products/mxk-65-walnut/

# 2. Convert to WebP (quality 82, ≤200KB, max 1600px long edge)
cd public/products/mxk-65-walnut
cwebp -q 82 -resize 1600 0 mxk-keyboard-1.jpg -o 01.webp
cwebp -q 82 -resize 1600 0 mxk-keyboard-2.jpg -o 02.webp
# etc — up to 04.webp

# 3. Clean up originals
rm *.jpg

# 4. Upload photos in /admin/products - has_photos is set by the server
```

### How to run locally
```bash
npm run dev               # dev server with HMR
npm run build             # production build
npm run start             # serve production build
npm run lint              # ESLint
npm run typecheck         # tsc --noEmit
npm test              # vitest
npm run test:e2e          # playwright
npm run format            # prettier write

# Database
npm run db:generate       # drizzle-kit generate (SQL to copy into db-bootstrap.sql)
npm run db:push           # diff schema against a database
npm run db:studio         # open Drizzle Studio admin UI (local only)

# Operations
npm run user:password -- <email>   # set a user's password (prompts; never pass it as an argument)
npm run cron:cancel-expired  # cancel unpaid orders past expires_at

# Phase 6
npm run email:dev         # react-email preview server on :3030
```

### Common errors + fixes
- **`Module not found: Can't resolve '@/...'`** — Ensure `tsconfig.json` `paths` maps `@/*` to `./src/*`.
- **`Failed to compile. <some Tailwind utility>`** — Tailwind v4 expects all sources scanned via `@source` in CSS or `content` in config; verify `src/**/*.{ts,tsx}` is included.
- **Hydration mismatch on cart drawer** — Cart state reads from localStorage; render shell server-side, hydrate qty client-side only (`useEffect` guard).
- **Fonts flashing** — Confirm `next/font/google` is imported in `app/layout.tsx`, not a client component.
- **`ECONNREFUSED 3306`** — MySQL not running. `brew services start mysql`.
- **`ER_NOT_SUPPORTED_AUTH_MODE`** — older mysql2 + MySQL 8 auth plugin mismatch. Switch user to `mysql_native_password` or upgrade mysql2.
- **`AUTH_SECRET missing`** — generate via `openssl rand -base64 32` and put in `.env.local`.
- **SMTP timeout** — confirm port 465 (TLS) on Hostinger; some ISPs block 25/587.
- **Drizzle Studio won't open** — needs `DATABASE_URL` set in `.env.local`; runs at `https://local.drizzle.studio`.

---

## SMTP + Google OAuth

Both are optional to run the app, and required before verification emails or
Google sign-in work. Folded in from `docs/AUTH-SETUP.md`, which was deleted -
`docs/DEPLOY.md` still points here for the production redirect URI.

### SMTP (Hostinger Webmail)

hPanel -> Emails -> Email Accounts -> Create email account. The Business plan
gives five; `noreply@` for transactional sends is enough to start.

| Setting | Value |
| --- | --- |
| SMTP host | `smtp.hostinger.com` |
| SMTP port | `465` (TLS) - preferred, `587` STARTTLS as fallback |
| Username | the full email address |
| Password | the mailbox password |

```env
SMTP_HOST="smtp.hostinger.com"
SMTP_PORT="465"
SMTP_USER="noreply@your-domain.com"
SMTP_PASS="<the mailbox password>"
EMAIL_FROM="merxylab <noreply@your-domain.com>"
```

Restart `npm run dev` after. A different mail provider works the same way with
its own host and port.

Without SMTP, verify an account by hand: set `email_verified` to the current
timestamp on the `users` row in Drizzle Studio.

### Google OAuth client

1. [console.cloud.google.com](https://console.cloud.google.com/) -> new project.
2. **APIs & Services -> OAuth consent screen**. External. App name, support
   email, developer contact. Leave scopes at the defaults - Google adds
   `userinfo.email`, `userinfo.profile` and `openid`, which is all this needs.
   Add your own address under test users while the app is in Testing.
3. **APIs & Services -> Credentials -> Create Credentials -> OAuth client ID**.
   Application type Web application.
   - Authorised JavaScript origins: `http://localhost:3000`, and the production
     origin when there is one.
   - Authorised redirect URIs: `http://localhost:3000/api/auth/callback/google`,
     and `https://your-domain.com/api/auth/callback/google` for production.
4. Copy the client id and secret from the dialog.

```env
AUTH_GOOGLE_ID="<ends in .apps.googleusercontent.com>"
AUTH_GOOGLE_SECRET="<the client secret>"
```

The signin page shows "Continue with Google" on its own once both are present -
the `hasGoogle` flag in `src/lib/auth.ts`.

A failing redirect is almost always the URI in step 3 not matching exactly:
`http` against `https`, or a trailing slash.

Going to production: add the production origin and redirect URI to the same
client, set `AUTH_URL` to the production URL, and **Publish app** on the consent
screen when non-test users need it.

---

## Elsewhere

- Tests: `docs/TESTING.md` — what is covered, what is not, and how to add one.
- Release history: `CHANGELOG.md` at the repo root.
- Deploying: `docs/DEPLOY.md`.
