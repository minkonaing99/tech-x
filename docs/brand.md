# brand — merxylab

Reference for anything made outside the codebase: social posts, product photography,
packaging inserts, ads, slide decks, AI image prompts.

Every value here was read out of the running site, not from an earlier spec. Source of
truth for code is `src/app/globals.css` (tokens) and `src/lib/categories.ts` (catalog
copy). See `brand.html` in this folder for the same thing as a visual specimen sheet.

Last verified: 2026-08-17.

---

## 1. What the shop is

A Myanmar peripherals shop: keyboards, mice, monitors, audio, accessories. Genuine
sealed stock with manufacturer warranty, chosen a few items at a time rather than
stocked by the pallet. Delivery nationwide by BeeExpress; cash on delivery in Yangon
and Mandalay.

**Returns and warranty, stated exactly.** A factory fault reported within **two weeks**
of delivery is settled by merxylab directly - refund or replacement, in Myanmar. After
two weeks it becomes a manufacturer warranty claim: merxylab sends the product to the
company and follows their policy, and the outcome is the company's to decide. Wrong item
sent is merxylab's cost both ways. **There are no change-of-mind returns.** Any ad, post,
or caption promising "30-day returns", "money back if you don't like it", or a one-month
window is wrong - the site said one month until 2026-08-17 and no longer does.

**It is not a manufacturer.** Nothing is "made" or "built" by merxylab. Copy that
implies fabrication ("built quietly", "made in small batches") is wrong and has been
removed from the site.

**It sells gaming gear.** Featured products include a 55g PAW3395 esports mouse and a
G PRO X Superlight 2. Copy must not position against gaming ("not for tournaments",
"chosen for the desk, not the tournament"). The distinction is *hype*, not *audience*:
merxylab sells an esports mouse without shouting about it.

## 2. Visual position

Calm. Editorial. Crafted. Tactile. Anti-template.

Reads like a small-batch furniture shop or a design magazine that happens to stock
peripherals. Warm cream paper, one terracotta accent, a soft serif for headlines.

**Deliberately avoided:** RGB gradients, black backgrounds, neon, hexagon meshes,
carbon-fibre texture, "GAMING GRADE" hype, exclamation marks, drop shadows used for
drama, stock photos of people wearing headsets.

## 3. Colour

Single warm hue family. Every neutral is tinted toward the brand's orange (hue 78-89
in OKLCH), so nothing is a true grey and nothing is `#000` or `#fff`.

### Brand

| Token | Hex | RGB | OKLCH | Use |
|---|---|---|---|---|
| `cream` | `#F5EFE6` | 245, 239, 230 | `oklch(95.4% 0.014 78.3)` | Page background. The dominant surface. |
| `surface` | `#FAF6EF` | 250, 246, 239 | `oklch(97.4% 0.010 81.8)` | Slightly lifted panels. A ~2% step from cream, so it reads only next to a border. |
| `sand` | `#E6D9C2` | 230, 217, 194 | `oklch(89.0% 0.034 82.0)` | Swatch tiles, pills, skeleton pulse peak. |
| `line` | `#E6DFD2` | 230, 223, 210 | `oklch(90.6% 0.019 83.1)` | Hairline dividers, input borders, skeleton rest. |
| `ink` | `#1C1B19` | 28, 27, 25 | `oklch(22.2% 0.004 84.6)` | Headlines, body, primary buttons. |
| `ink-soft` | `#3A3833` | 58, 56, 51 | `oklch(34.1% 0.009 88.7)` | Secondary body copy. |
| `muted` | `#8A8275` | 138, 130, 117 | `oklch(61.0% 0.021 80.1)` | Captions, labels, metadata. **See the contrast note below.** |
| `accent` | `#C2613A` | 194, 97, 58 | `oklch(60.1% 0.135 41.7)` | Terracotta. Links, focus rings, current state, primary hover. |
| `accent-soft` | `#D88565` | 216, 133, 101 | `oklch(69.7% 0.112 41.7)` | Accent hover on dark surfaces. |
| `dark-bg` | `#161513` | 22, 21, 19 | `oklch(19.6% 0.004 84.6)` | Footer, CTA banner. |
| `dark-ink` | `#F5EFE6` | 245, 239, 230 | `oklch(95.4% 0.014 78.3)` | Text on `dark-bg`. Same value as `cream`. |

### Semantic

| Token | Hex | RGB | OKLCH | Use |
|---|---|---|---|---|
| `success` | `#5F7A4A` | 95, 122, 74 | `oklch(54.6% 0.078 132.4)` | Confirmed, in stock, delivered. |
| `warning` | `#B07A2E` | 176, 122, 46 | `oklch(62.1% 0.113 71.8)` | Low stock, awaiting verification. |
| `error` | `#A23B2A` | 162, 59, 42 | `oklch(49.5% 0.140 31.7)` | Form errors, cancelled. |
| `info` | `#4A6B7A` | 74, 107, 122 | `oklch(50.8% 0.045 228.0)` | Neutral notices. The only cool hue in the system. |

### Colour strategy

**Restrained.** Tinted neutrals carry the surface; `accent` stays under roughly 10% of
any given screen and is reserved for primary actions, current selection and state.
Accent as decoration is off-brand. The one place colour goes heavy is the dark footer
and CTA banner, which invert to `dark-bg`.

### Measured contrast (WCAG 2.1)

Computed, not estimated. AA needs 4.5:1 for text under 18.66px, 3:1 for large text and
UI components.

| Pair | Ratio | Verdict |
|---|---|---|
| `ink` on `cream` | 15.06:1 | AAA |
| `cream` on `ink` | 15.06:1 | AAA |
| `cream` on `dark-bg` | 15.96:1 | AAA |
| `ink-soft` on `cream` | 10.24:1 | AAA |
| `error` on `cream` | 5.75:1 | AA |
| `success` on `cream` | 4.20:1 | Large text only |
| `accent` on `cream` | 3.63:1 | Large text and UI only |
| `cream` on `accent` | 3.63:1 | Large text and UI only |
| `muted` on `cream` | **3.32:1** | **Fails AA for body text** |

> **Two things to design around.**
>
> `muted` at 3.32:1 fails AA for normal-size text, and the site uses it at 12-13px for
> field labels, helper text and metadata. An earlier version of `DESIGN.md` recorded
> this as 4.6:1, which was wrong. Darkening `muted` to roughly `#6F685C` would clear
> 4.5:1 while staying in the same warm family. Until that decision is made, treat
> `muted` as decorative-weight and never put anything load-bearing in it.
>
> `accent` at 3.63:1 is fine for buttons, focus rings and 24px-plus headings, but
> accent-coloured body text or small links do not pass. Use `ink` with an accent
> underline instead, which is what the site does.

## 4. Typography

| Role | Family | Loaded as | Notes |
|---|---|---|---|
| Display | **Fraunces** | `next/font/google`, variable, axes `opsz` + `SOFT` | Soft serif. Headlines, product names, totals. |
| Body / UI | **Inter** | `next/font/google`, variable | Everything else. `font-feature-settings: 'ss01', 'cv11'`. |
| Burmese | **Noto Sans Myanmar** | weights 400 / 500 / 600 | Only for `/my/*`. Inter and Fraunces carry no Burmese glyphs. |

Fallbacks: `Georgia, serif` for display; `system-ui, -apple-system, sans-serif` for body.

### Sizes in real use

Fixed pixel steps, not fluid clamps.

**Display (Fraunces):** 52 / 48 / 44 / 40 / 36 / 28 / 26 / 24 / 22 / 20 / 18 px.
The most common are 40px (page h1), 22px (section h2) and 20px (order totals).

**Body and UI (Inter):** 16 / 15 / 14 / 13 / 12 / 11 px.
The most common are 13px (metadata), 14px (UI and buttons) and 12px (field labels).

Two utilities matter for anything numeric:

- `.eyebrow` — 12px / 16px, uppercase, `letter-spacing: 0.08em`, weight 500, colour `muted`.
- `.price` — `font-variant-numeric: tabular-nums`, weight 600. Every price, everywhere.

Body copy caps at 52-65 characters per line.

## 5. Shape, depth, motion

**Radius:** 6px (`radius-sm`, small chips) · 12px (`radius`, cards, inputs, tiles) ·
20px (`radius-lg`, large panels) · 999px (`radius-pill`, buttons, tags, badges).

**Shadow** — warm-tinted, never blue, and used sparingly:

```
sm  0 1px 2px  rgba(28, 27, 25, 0.04)
md  0 4px 12px rgba(28, 27, 25, 0.08)
lg  0 12px 32px rgba(28, 27, 25, 0.12)
```

**Spacing:** 4px base. Scale 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128.
Major sections sit 96-128px apart on desktop, 64-80px on mobile.

**Motion:** 200ms ease-out for colour and transform. Cart drawer 280ms
`cubic-bezier(0.16, 1, 0.3, 1)`. Section reveal 10px rise plus fade, 480ms, once.
Skeletons pulse `line` to `sand` over 1.4s ease-in-out. No bounce, no elastic, no
parallax, no scroll-hijack. All motion honours `prefers-reduced-motion`.

**Focus:** 2px solid `accent`, offset 2px. Never removed.

## 6. Logo

| Asset | File | Detail |
|---|---|---|
| Primary mark | `public/logo.png` | 400×400 PNG, transparent background. Conical flask with a circuit-trace pattern inside and a pixel scatter rising from the neck. Solid `ink`. |
| Favicon | `public/favicon.ico` | 16 / 32 / 48px, 32bpp, **white** glyph on transparent. |

**Wordmark:** `merxylab`, always lowercase, Fraunces, weight 500, tight tracking. In the
header it sits at 18px beside a 28px mark with 8px between them.

Clear space: at least the width of the flask's neck on every side. Minimum legible size
for the mark is 24px; below that the circuit traces fill in.

> The white favicon is invisible on light browser chrome (Chrome and Safari light-mode
> tab strips are near-white). It is correct only on dark chrome. An adaptive `icon.svg`
> using `prefers-color-scheme` would fix both cases.

## 7. Voice

Plain, specific, unhurried. Short declaratives. A period at the end of a headline is a
house habit ("Sign in." / "Delivered." / "Nothing on the shelf is filler.").

**Rules**

- Say the concrete thing. "We will call to confirm this order within 3 hours" beats
  "We'll be in touch shortly."
- No em dashes. Commas, colons, semicolons, periods, parentheses.
- No exclamation marks. No emoji in product or UI copy.
- No hype adjectives: revolutionary, ultimate, insane, game-changing, premium.
- Never claim to manufacture.
- Never position against gaming.
- Numbers are exact. Prices are `Ks 249,000` via `formatMmk()`, tabular figures, no
  decimals.

**On-brand**

> Nothing on the shelf is filler.
> Keyboards, mice, monitors, audio, accessories - a short list in each. We pick them the
> way a furniture shop picks chairs: slowly, and only the ones that still feel right a
> year in.

> Featherweight esports shells and full-size workhorses. Honest shapes, sensors that
> hold their aim.

> Sealed boxes with the manufacturer warranty intact, bought through proper channels.
> No grey-market imports, no refurbished units passed off as new.

> Every board, mouse and mic spends time on a real desk before it is listed. Case flex,
> stabiliser rattle, a sensor that drifts, a mic that hisses - better we find it than you.

**Off-brand**

> Unleash your true potential with GAMING GRADE precision!!
> Built by hand in small batches.
> Chosen for the desk, not the tournament.

## 8. Category copy

Verbatim from `src/lib/categories.ts`. Reuse rather than rewrite.

| Category | Description |
|---|---|
| Keyboards | Mechanical, low-profile and hot-swap boards. Quiet enough to type on all day, quick enough to play on. |
| Mice | Featherweight esports shells and full-size workhorses. Honest shapes, sensors that hold their aim. |
| Monitors | Panels for long sessions. Colour that holds, refresh that keeps up, stands that actually adjust. |
| Audio | Headsets, desktop mics, and compact desk speakers, tuned for voices first, music close behind. |
| Accessories | Mats, wrist rests, and the small things that finish a desk. |

## 9. Imagery

The rule that makes photos look like merxylab rather than a marketplace listing: warm
matte backdrop, one soft light, product grounded by a real shadow.

- **Backdrop:** cream `#F5EFE6` or matte sand `#E6D9C2`. Never pure white, never glossy,
  never a gradient.
- **Light:** soft, single direction. No hard rim light, no coloured gels, no RGB spill
  even on gaming products.
- **Shadow:** subtle and grounded on the surface. Nothing floating.
- **Subject:** fills 60-75% of frame, 8% breathing room on every edge.
- **Composition:** square 1:1 for grid tiles, 4:5 for hero. Matching aspect keeps the
  layout stable when a photo replaces a swatch.
- **Files:** WebP, quality 82, 1600px long edge, under 200KB. Slots per product:
  `01` hero, `02` detail, `03` angle, `04` in-context. Stored on Cloudflare R2.

**For generated or sourced imagery, prompt toward:** warm cream seamless backdrop, soft
diffused window light from one side, matte surface, shallow grounded shadow, editorial
product photography, muted warm palette, no text, no logos, no reflections.

**Prompt away from:** neon, RGB lighting, dark moody studio, lens flare, glossy black
acrylic, blue rim light, gaming setup with LED strips, motion blur, people.

## 10. Quick reference

```
cream    #F5EFE6      ink       #1C1B19      accent   #C2613A
surface  #FAF6EF      ink-soft  #3A3833      dark-bg  #161513
sand     #E6D9C2      muted     #8A8275      line     #E6DFD2

Display  Fraunces (soft serif)      Body  Inter
Radius   6 / 12 / 20 / 999          Base spacing  4px
Motion   200ms ease-out             Focus  2px accent, offset 2px
```
