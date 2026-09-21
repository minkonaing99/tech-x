# LIGHTHOUSE — performance, a11y, SEO audit

Run Lighthouse against the local production build before any release. The dev server's HMR overhead hides real scores — always audit `npm run start`, not `npm run dev`.

---

## Quick run

### 1. Local audit (one-shot)

```bash
npm run build
npm run start &
sleep 5
npx -y lighthouse http://localhost:3000 \
  --only-categories=performance,accessibility,best-practices,seo \
  --form-factor=mobile \
  --throttling-method=simulate \
  --output=json,html \
  --output-path=./lighthouse-report \
  --quiet
kill %1
```

Outputs `lighthouse-report.report.html` (open in browser) and `lighthouse-report.report.json`.

### 2. Per-route runs

Audit each critical path:

```bash
for path in "/" "/shop" "/product/mxk-65-walnut" "/shop/keyboards" "/search?q=keyboard"; do
  safe=$(echo "$path" | tr '/?' '__')
  npx -y lighthouse "http://localhost:3000$path" \
    --only-categories=performance,accessibility,best-practices,seo \
    --form-factor=mobile \
    --output=html \
    --output-path="./reports/lh$safe.html" \
    --quiet
done
```

### 3. Targets

Acceptable: all green (≥ 90) on every audited route, mobile, throttled 4G.

| Category        | Target | Hard floor |
|-----------------|--------|------------|
| Performance     | ≥ 90   | 75         |
| Accessibility   | 100    | 95         |
| Best Practices  | 100    | 90         |
| SEO             | 100    | 95         |

If any score falls below the hard floor, **block the release** until fixed.

---

## Common issues + fixes

### Performance < 90

| Issue                       | Likely cause                            | Fix                                              |
|-----------------------------|------------------------------------------|--------------------------------------------------|
| LCP > 2.5s                  | Hero image not `priority`                | `<Tile priority>` on hero, preload key tile      |
| CLS > 0.1                   | Web font loading, missing dimensions     | `next/font` is already used; verify Image `fill` w/ explicit aspect ratio |
| TBT high                    | Big JS bundles on route                  | Dynamic-import heavy client components (Fuse, admin tables) |
| Unused JS                   | Dead deps                                | Audit `npm why <pkg>`, remove unused            |
| Slow server response (TTFB) | Drizzle cold cache                       | `unstable_cache` revalidate 60s already wired; verify route handlers awaiting needed work only |

### Accessibility < 100

- All interactive elements need `aria-label` if icon-only — Nav/Cart/Heart already have them; double-check any new ones.
- Color contrast: check `--color-muted` against `--color-cream` (4.6:1 — passes AA but not AAA).
- Form fields: every `<input>` has a paired `<label>`.
- Headings: no skipped levels.
- Buttons disabled state: don't rely on color alone — add icon or text.

### Best Practices < 100

- HTTPS only on prod. Dev runs http — that's fine; the score on http will dip but is non-issue on real deploy.
- No console errors. Run audit with browser devtools open and watch for runtime warnings.
- Image aspect ratio: use `next/image` with `fill` only inside a sized parent.

### SEO < 100

- Every page has a unique `<title>` — verified via title template.
- Every page has a `<meta name="description">` — set via `generateMetadata`.
- Sitemap + robots already shipped (`/sitemap.xml`, `/robots.txt`).
- Structured data (JSON-LD) is the next win — add `Product` schema to PDP and `BreadcrumbList` to shop pages.

---

## CI integration (optional, later)

Add `@lhci/cli` for automated scoring on PRs:

```bash
npm install -D @lhci/cli
```

`.lighthouserc.json` at repo root:

```json
{
  "ci": {
    "collect": {
      "startServerCommand": "npm run start",
      "url": [
        "http://localhost:3000",
        "http://localhost:3000/shop",
        "http://localhost:3000/product/mxk-65-walnut"
      ],
      "numberOfRuns": 3
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.95 }],
        "categories:best-practices": ["error", { "minScore": 0.9 }],
        "categories:seo": ["error", { "minScore": 0.95 }]
      }
    }
  }
}
```

Run on every PR via GitHub Actions; block merge if assertions fail.

---

## Production audit

After deploy to Hostinger:

```bash
npx -y lighthouse https://your-domain.com \
  --only-categories=performance,accessibility,best-practices,seo \
  --form-factor=mobile --throttling-method=simulate \
  --output=html --output-path=./lighthouse-prod.html --quiet
```

Production scores are usually slightly higher than local (real CDN edge caching, optimized routing).

---

## Manual a11y deep-dive

Lighthouse catches the obvious. For thorough WCAG 2.1 AA:

- Tab through every page from the address bar with no mouse.
- Use macOS VoiceOver (Cmd+F5) or NVDA on the homepage and PDP.
- Run axe DevTools (browser extension) on every route — it finds issues Lighthouse skips (focus order, ARIA misuse).
- Verify `prefers-reduced-motion` is honored — toggle in macOS System Settings → Accessibility → Motion.

---

## Smoke after deploy

- [ ] `npm run build && npm run start` clean on local prod build.
- [ ] Lighthouse `/`, `/shop`, `/product/[slug]` ≥ 90 mobile.
- [ ] axe DevTools shows 0 serious / critical violations on the same routes.
- [ ] No console errors when clicking through Add to cart → Checkout → Place order on a verified test account.
