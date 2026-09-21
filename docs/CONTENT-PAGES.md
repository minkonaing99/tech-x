# Content pages + locales

Static customer-facing pages (about, contact, support) and the two-locale system that serves four of them in Burmese.

## Pages

| Route | Burmese | Notes |
| ----- | ------- | ----- |
| `/about` | no | English only, deliberately. Owner rejected the translation. |
| `/contact` | `/my/contact` | Channel list + contact form. |
| `/shipping` | `/my/shipping` | Renders the live `divisions` fee table. Dynamic. |
| `/returns` | `/my/returns` | Includes `#warranty` anchor — the footer "Warranty" link targets it. |
| `/faq` | `/my/faq` | 19 answers in 5 groups. |
| `/privacy` | no | English only until a native speaker reviews a translation. Linked from the footer bottom bar, not a Legal column. |

Removed on request: `/manifesto`, `/press`, `/cookies`, `/terms`. There is no Legal footer column; `/privacy` hangs off the bottom bar.

> No terms-of-sale page ships. `/privacy` exists because Google's OAuth consent screen asks for a privacy-policy URL, and payment partners generally do too. Cookie disclosure is a section inside it rather than its own page.

Content is grounded in what the code actually does — 24h unpaid expiry, COD limited to Yangon/Mandalay under Ks 500,000, bcrypt password hashes, R2 private slip bucket, the `mxl_session` cart cookie, Google OAuth. Change the behaviour, change the copy.

## Locale system

`src/lib/i18n.ts`. Two locales, English at the bare path, Burmese under `/my/*`. There is no middleware and no `[locale]` catch-all segment — the shop, cart, checkout and product pages stay English-only, and a catch-all would have swallowed them.

- `localePath('my', '/faq')` → `/my/faq`
- `languageAlternates('/faq')` → the `alternates.languages` map for `hreflang`

Each page's copy and view live in **one file** under `src/components/pages/`, with both languages side by side in a `Dict<T>`:

```ts
const COPY: Dict<FaqCopy> = { en: { ... }, my: { ... } }
export function FaqView({ locale }: { locale: Locale }) { const t = COPY[locale] ... }
```

The route files under `src/app/<page>/page.tsx` and `src/app/my/<page>/page.tsx` are ~10-line wrappers that pass `locale` and set metadata. To fix a translation, edit one object; no JSX hunting.

### Adding a locale

1. Add the code to `LOCALES` and a label to `LOCALE_LABEL` in `src/lib/i18n.ts`.
2. Add the key to every `Dict` in `src/components/pages/*` — TypeScript will list them for you.
3. Copy the `src/app/my/*` route files under the new prefix.
4. Extend `languageAlternates()` and the `CONTENT_PATHS` loop in `src/app/sitemap.ts`.

### Typography

Inter and Fraunces carry no Burmese glyphs. `Noto_Sans_Myanmar` loads in `src/app/layout.tsx` and applies through the `.font-my` utility in `globals.css`, set on the page wrapper by `PageShell`. Burmese pages also drop the display serif for headings and run a looser line-height (1.9 body, 1.35 headings) because Burmese stacks diacritics vertically.

### Shared shell

`src/components/page/shell.tsx` exports `PageShell`, `Section`, `List`. `PageShell` renders the eyebrow, `<h1>`, lead, optional "last updated" meta, and the language switch. Pass `translated={false}` for a page with no other locale (that is what hides the switch on `/about`).

## Shop details

`src/lib/site-info.ts` is the single source for address, phone, Telegram, LINE, Facebook and hours. Server-only — do not import it from a client component. Fields left `null` are hidden by the pages that render them; `SITE.email` is currently null, so no email row shows on `/contact`.

`contactInbox()` resolves where the contact form delivers: `SITE.email`, falling back to `SMTP_USER`. Without `SMTP_HOST` configured the form returns `502 SEND_FAILED`.

## Contact form

`POST /api/v1/contact` — zod-validated, 5 requests/hour per IP via `rateLimit`, honeypot `website` field (silently accepted so bots learn nothing), message 10–4000 chars. Delivers by `sendMail` to `contactInbox()`.

## See also

- `docs/DESIGN.md` — palette, type scale, spacing the pages inherit
- `docs/TECH.md` — ADR for the locale routing decision
