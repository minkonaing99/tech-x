# DEPLOY — what uses what

Hostinger Business shared. One host runs the Next.js app under Phusion Passenger, MySQL, and SMTP. Reference, not a walkthrough — the steps are obvious, the values and the traps are not.

## hPanel app slot

hPanel → Advanced → Node.js.

| Setting | Value |
| --- | --- |
| Node.js version | 20.x |
| Application mode | Production |
| Application root | `domains/your-domain.com/merxylab` — outside `public_html` unless you want files served raw. Passenger routes the domain either way. |
| Application URL | your domain or subdomain |
| Startup file | `server.js` |

Port allocation is internal; Passenger maps it.

## Environment variables

hPanel → Node.js → your app → Environment variables, one row each.

| Key | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `mysql://merxylab:PASS@localhost:3306/merxylab-store` |
| `AUTH_SECRET` | `openssl rand -base64 32` — **fresh, never the dev value** |
| `AUTH_URL` | `https://your-domain.com` |
| `AUTH_TRUST_HOST` | `1` |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | from Google Cloud, optional |
| `SMTP_HOST` / `SMTP_PORT` | `smtp.hostinger.com` / `465` |
| `SMTP_USER` / `SMTP_PASS` | mailbox address and password |
| `EMAIL_FROM` | `merxylab <noreply@your-domain.com>` |
| `BANK_PAYMENT_INSTRUCTIONS` | bank line carrying a `{orderId}` token |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain.com` |

Saving restarts Passenger. Credentials for SMTP and the OAuth client: `docs/SETUP.md`.

## Build and bundle

`next.config.ts` sets `output: 'standalone'`, so the runtime tree is small but split across three places that have to be reassembled:

```bash
npm ci && npm run build

mkdir -p deploy
cp -r .next/standalone/. deploy/
cp -r public deploy/public
cp -r .next/static deploy/.next/static

rsync -avz --delete deploy/ user@your-domain.com:/home/user/domains/your-domain.com/merxylab/
```

Then restart from hPanel → Node.js → Restart.

**Two traps worth the ink:**

- **npm only.** No `pnpm-lock.yaml` should exist (ADR-09). If one reappears, delete it — its presence makes Next's auto-installer shell out to pnpm, which is not on Hostinger, and the build dies with `spawn pnpm ENOENT`.
- **Prod-only installs have no devDependencies**, so `next build` must not need eslint or the type checker. `eslint.ignoreDuringBuilds` and `typescript.ignoreBuildErrors` are set, and `typescript` / `@types/react` / `@types/node` sit in `dependencies` because Next's TS setup check demands them. The host build therefore checks nothing — run `npm run lint` and `npm run typecheck` locally first.

## Database

Create in hPanel → Databases → MySQL. Don't use `root`. A hyphen in the name (`merxylab-store`) needs backticks in raw SQL; Drizzle is fine via the URL.

Schema, from your laptop with Remote MySQL temporarily whitelisted:

```bash
mysql -h PROD_HOST -u merxylab -p merxylab-store < docs/db-bootstrap.sql
```

That file carries the catalog seed too. **Turn Remote MySQL off afterwards.**

**There is no migration runner.** A schema change is a hand-written `ALTER`, or a one-off script following `scripts/cancel-expired-orders.ts`. Keep it backward-compatible across the restart window: a destructive change ships in two passes — code that stops referencing the column, then the drop.

## Drizzle Studio against production

Never expose it. Tunnel:

```bash
ssh -L 3307:127.0.0.1:3306 user@your-domain.com
DATABASE_URL="mysql://merxylab:PASS@127.0.0.1:3307/merxylab-store" npm run db:studio
```

## SSL and OAuth

hPanel → SSL → install for apex and `www`, then Force HTTPS. The Google OAuth client needs the production origin and `https://your-domain.com/api/auth/callback/google` added to the same client, and **Publish app** on the consent screen once non-test users need to sign in.

## Photos

On Cloudflare R2, not the app filesystem. Uploaded per product through `/admin/products` → Edit photos; the server writes a 1600px hero and a 600px thumb and flips `has_photos` itself. Nothing to rsync, and deploys never touch imagery.

## Backups

Business plans have daily auto-backup in hPanel → Files → Backups. Weekly off-host dump, via hPanel → Advanced → Cron Jobs:

```
0 3 * * 0 mysqldump --no-tablespaces -u merxylab -p"PASS" merxylab-store | gzip > ~/backups/merxylab-$(date +\%F).sql.gz
```

Keep four before rotating.

## When something breaks

hPanel → Node.js → app → **Logs** captures stdout and stderr. Server faults also reach the owner Telegram chat through `src/instrumentation.ts`, so the logs are for detail rather than for noticing. Access logs are at `logs/access.log`. Uptime wants an external monitor.

## CI

`.github/workflows/ci.yml` runs typecheck, lint, test, build and a gitleaks scan on every push and PR. **Nothing deploys from CI** — deploy is manual. A red check blocks a merge, not a deploy. CI builds against dummy `DATABASE_URL` and `AUTH_SECRET`; real secrets live only in the hPanel environment panel and `.env.local`.
