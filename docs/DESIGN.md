# DESIGN — merxylab store

## Design goals
**Calm. Editorial. Crafted. Tactile. Anti-template.**

We are explicitly avoiding the standard peripheral-shop visual language (RGB gradients, black backgrounds, "GAMING GRADE" hype). The store should feel like a small-batch furniture shop or a design magazine that happens to sell keyboards.

## Reference
- Layout reference: furniture e-commerce landing (warm cream/black palette, serif headline, hero with side thumbs, stats row, 3x2 product grid, lifestyle accordion, dark CTA banner, dark footer). The inline product chip and carousel dots were dropped in Phase 9; the newsletter section was removed entirely.
- Voice/tone reference: Teenage Engineering shop, MoMA Design Store, Drop's first product pages.

## Target devices + breakpoints
**Mobile-first.** Designed for narrow viewports, scales up.

| Breakpoint | Width | Use |
|------------|-------|-----|
| `sm` | 640px | Large phone |
| `md` | 768px | Tablet portrait |
| `lg` | 1024px | Tablet landscape / small laptop |
| `xl` | 1280px | Desktop |
| `2xl` | 1536px | Wide desktop |

## Color system

### Brand
| Token | Hex | Use |
|-------|-----|-----|
| `--cream` | `#F7F6F3` | Page background |
| `--surface` | `#FBFBF9` | Cards, hero panel |
| `--sand` | `#E7E2D9` | Subtle elevation, swatch tile |
| `--ink` | `#1C1B19` | Body text, headlines |
| `--ink-soft` | `#3A3833` | Secondary text |
| `--muted` | `#8A8275` | Captions, meta |
| `--accent` | `#C2613A` | Terracotta — buttons, links, focus ring |
| `--accent-soft` | `#D88565` | Accent hover |
| `--line` | `#E8E6E1` | Dividers, card borders |
| `--dark-bg` | `#161513` | CTA banner + footer bg |
| `--dark-ink` | `#F7F6F3` | Text on dark bg |

**Softened 2026-08.** The background family was warm beige (`cream` at OKLCH chroma 0.0136) and read too strong. Chroma dropped ~74% across `cream` / `surface` / `sand` / `line`; the palette is now a warm near-neutral. Lightness of `sand` and `line` was pulled down to compensate, so elevation and border separation against the page hold at their previous ratios (line/cream 1.15, sand/cream 1.19). Ink, accent and the dark banner are unchanged.

### Semantic
| Token | Hex | Use |
|-------|-----|-----|
| `--success` | `#5F7A4A` | Add-to-cart confirmed |
| `--warning` | `#B07A2E` | Low stock notice |
| `--error` | `#A23B2A` | Form error |
| `--info` | `#4A6B7A` | Neutral toast |

### Dark mode
**Not planned for placeholder phase.** Warm cream palette is the identity. May add a "night" mode in extended phase if user demand exists.

## Typography

### Fonts
- **Display:** Fraunces (variable, optical sizes, soft serif) — headlines, product names on PDP.
- **Body:** Inter (variable, neutral grotesque) — paragraphs, UI text.
- Both loaded via `next/font/google` → self-hosted, no CLS.

### Scale
| Token | Size / Line | Use |
|-------|-------------|-----|
| `display-xl` | 72 / 80, Fraunces 400 | Hero headline |
| `display-lg` | 56 / 64, Fraunces 400 | Section headlines |
| `display-md` | 40 / 48, Fraunces 400 | PDP product name |
| `h2` | 32 / 40, Fraunces 500 | Subsection headers |
| `h3` | 24 / 32, Inter 600 | Card titles |
| `body-lg` | 18 / 28, Inter 400 | Lead paragraphs |
| `body` | 16 / 24, Inter 400 | Default body |
| `body-sm` | 14 / 20, Inter 400 | Meta, helper text |
| `caption` | 12 / 16, Inter 500, tracking 0.04em uppercase | Eyebrows, labels |
| `price` | 20 / 24, Inter 600, tabular-nums | All price displays |

## Spacing system
- Base unit: **4px**
- Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128
- Tailwind defaults align; use `gap-*`, `p-*`, `m-*`.
- Section vertical rhythm: 96–128px between major homepage sections on desktop, 64–80px on mobile.

## Radius
| Token | Value | Use |
|-------|-------|-----|
| `radius-sm` | 6px | Inline pills, small chips |
| `radius` | 12px | Cards, inputs, buttons |
| `radius-lg` | 20px | Hero panel, banner |
| `radius-pill` | 999px | Tags, category chips, badges |

## Shadows
Restrained, warm-tinted (no blue shadow).
| Token | Value | Use |
|-------|-------|-----|
| `shadow-sm` | `0 1px 2px rgba(28,27,25,0.04)` | Card resting |
| `shadow-md` | `0 4px 12px rgba(28,27,25,0.08)` | Card hover, drawer |
| `shadow-lg` | `0 12px 32px rgba(28,27,25,0.12)` | Modal, focused hero element |

## Component inventory

### Primitives (shadcn copy-in)
- Button (variants: primary, secondary, ghost, icon)
- Sheet → CartDrawer wrapper
- Dialog → SearchDialog (extended)
- Accordion → Why Choose Us section
- Input (text, email, search)
- Badge / Pill

### Custom
- `Nav` — sticky top, logo + categories + search icon + cart icon (badge)
- `Footer` — dark, brand blurb + Shop / Company / Support columns, privacy link in the bottom bar
- `ProductCard` — swatch tile + name + price + add-to-cart icon + stock badge
- `ProductTile` — square placeholder (swatch) or real photo when `hasPhotos`
- `Hero` — left: headline, subcopy, two CTAs. Right: square showcase. The active featured product fills the big square with a glass caption strip (category, name, price) pinned inside it; the 4-thumb row beneath keeps every thumbnail showing its photo, the active one marked with an accent ring + offset. Switching products crossfades absolutely-positioned layers via `AnimatePresence`. Reduced motion → duration 0. Same model on mobile (tap-only; no carousel dots).
  - Removed 2026-08: the inline product-swatch chip in the headline and the "carved well" active thumb. Both rendered as flat colour blocks and read as broken images. The old `layoutId` swatch-flight and its 1x1 transparent-pixel workaround went with them.
- `StatsRow` — 3-column stat blocks
- `WhyAccordion` — left image + right accordion
- `CTABanner` — dark bg, headline + tile cutout
- `CategoryChips` — horizontal scroll on mobile
- `Gallery` — PDP main image + thumbs, hides missing slots
- `SpecsTable` — two-column label/value
- `Toast` (sonner) — add-to-cart + auth confirm + admin save feedback
- `QtyStepper` — - / value / +
- **Phase 4-7 additions:**
  - `HeartButton` — wishlist toggle, outline → filled accent, optimistic state
  - `StockBadge` — "In stock" (success), "Only N left" (warning), "Out of stock" (muted)
  - `LineProblemBadge` — the same three states for a cart line that cannot be ordered, in error colour. Sibling to `StockBadge` and louder on purpose: that one is scarcity, this one is a blocked order.
  - `Stars` — 1-5 reading + interactive variants
  - `ReviewBlock` (replaces ReviewCard + ReviewForm separation) — average rating + count + write-review collapsible form + per-review article cards with verified badge
  - `AddressManager` — list rows + delete action + add-address form with named `Field` inputs
  - `CheckoutForm` — three-step state machine (delivery / payment method / review). Saved addresses + new-address form + division-aware shipping fee + payment method radios + summary aside + place-order CTA.
  - `SignInForm` / `SignUpForm` — email + password + Google button
  - `WalletInstructionsCard` (inlined in `/order/[id]`) — QR + account name + phone + amount + order UUID
  - `SlipUploadForm` (inlined in `/order/[id]`) — drag-drop + file picker + optional tx ref + submit
  - `CodConfirmationCard` (inlined in `/order/[id]`) — "we'll call to confirm" + Telegram backup link
  - `TelegramBackupContact` — `t.me/<username>` link button, secondary contact channel
  - `AccountNav` (in `account/layout.tsx`) — sub-nav for `/account` (Orders / Addresses / Wishlist / Sign out)
- **Phase 8 additions:**
  - `AdminNav` (in `admin/layout.tsx`) — Overview / Products / Orders / Reviews / Payment Methods / Divisions / Branding
  - `PaymentMethodTable` — `/admin/payment-methods` inline editor (name, kind, account info, QR upload, active toggle).
  - `DivisionTable` — `/admin/divisions` inline editor (delivery_fee_mmk, cod_allowed, is_blocked, sort_order). Name + id immutable.
  - `AdminProductTable` — list with primary action "+ New product" at top. Row collapses to name + slug + view-link, price (MMK, tabular-nums), stock, low-stock threshold, isActive/featured pills. Two expand buttons per row: **Edit details** (opens an inline form pre-filled) and **Edit photos** (opens the 4-slot grid). Save / Discard pair per expanded section — no auto-save.
  - `ProductDetailsForm` — used for both create + edit. Fields: name (drives auto-slug), slug (editable, regex-validated), category (select of the live categories), price MMK, tagline, description, swatch (`<input type="color">`), stock_qty, low_stock_threshold, featured + is_active toggles. Specs editor: list of `{label, value}` rows with `+` to add and trash to remove.
  - `ProductPhotoGrid` — fixed 4-slot grid (01..04). Each cell shows the 600px thumb preview if uploaded, otherwise a swatch-tinted placeholder. Per-slot Replace (file picker) and Remove (trash). Client validates JPG/PNG/WEBP ≤ 10 MB before sending. Server writes both hero (1600px) + thumb (600px) WEBPs from one upload.
  - `AdminOrdersTable` — order id (+ slip mark) + customer + wallet/COD + total + forward-only status dropdown + relative placed time. Terminal rows dim to 45%. Sits under `OrderQueue` (needs-you groups) with search, status chips and pagination between them.
  - `AdminReviewsList` — filter chips (pending / approved / rejected / all) + per-review card with status pill + approve/reject buttons.
  - KPI tile (in `admin/page.tsx`) — eyebrow label + large display number, clickable to drill-down page.
- **Phase 10 additions:**
  - `ComparePicker` — native `<details>` whose `<summary>` is dressed as a secondary pill button matching "View cart": `Columns2` icon + label + a count pill of how many rivals exist. Opens an absolutely-positioned 264px panel below it, capped at 288px and scrolling, headed "Compare &lt;product&gt; with" and holding one link per other product in the category. Renders nothing when there are none. Sits in the PDP action row beside Add to cart and the wishlist heart — placed under the spec sheet instead, as it first shipped, it read as another content section and nobody found it. Used again under the compare table, labelled "Compare with another", with the left-hand product pinned.
  - `CompareTable` — real `<table>`, `table-fixed`, narrow label column (84px, 150px from `sm`). Two product columns at every width; type steps 13px → 14px rather than stacking, because stacking removes the only thing the page does. Header cells carry a square `Tile` + name linking to the PDP. Fixed rows: price (`Price` + `SaleBadge`), rating (`Stars` + "4.5 (12)", or muted "No reviews yet"). Spec rows follow, a missing value rendering a muted hyphen with `sr-only` "Not listed". `<caption class="sr-only">` names the pair; no row highlighting.

## Interaction patterns

### Hover
- Product card: 200ms ease-out, `translateY(-2px)`, shadow grows `sm → md`.
- Button primary: bg `accent → accent-soft`.
- Nav link: underline animates left-to-right (1px accent).

### Focus
- Visible focus ring: 2px `accent` offset 2px, never removed.
- Tab order matches visual reading order.

### Transitions
- Default: 200ms ease-out for transforms + colors.
- Cart drawer slide-in: 280ms `cubic-bezier(0.16, 1, 0.3, 1)`.
- Accordion expand: 240ms ease-out.

### Loading states
- Page transitions: instant in placeholder phase (static).
- Image swap on hero carousel: 300ms cross-fade.
- Skeleton tiles: warm sand pulse `1.4s ease-in-out infinite`.

### Toast notifications
- Position: top-center, both breakpoints, offset 76px to clear the 64px sticky nav.
- Duration: 5s. These carry an action, and the reader has to notice it, aim, and click.
- Add-to-cart: `Added - <product name>` with a "View cart" action that opens the drawer.
- A failed add is a `toast.error` carrying the server's own reason ("Out of stock.", "Product not found.", "Too many requests.").

Bottom-right is the usual default and it was wrong here. The cart drawer parks its own "View cart" footer in that corner, so the toast covered the control it was pointing at. Top-center is also nearer the cart button in the nav, which is the thing the toast is talking about, and nothing else in the layout occupies it.

### Blocked cart lines
A line the shop cannot fill is marked wherever it renders - the drawer, `/cart`, the checkout summary. Thumbnail drops to `opacity-45 grayscale`, the name greys, and `LineProblemBadge` states the reason in error colour: "Out of stock", "No longer available", "Only 2 left".

Deliberately louder than `StockBadge`, which nudges a shopper who can still buy the thing. This one marks a line that is holding up the order, so it reads as a fault rather than as scarcity.

Both ways forward shut while a line is marked: `/cart`'s Checkout link and checkout's Place order, each with one line of explanation under it. The `+` stepper stops at stock, so no button looks live while the route is about to refuse it.

The checkout summary carries the fix rather than pointing at it - "Reduce to 2" where stock remains, "Remove" always - because that form holds a half-typed address and a trip to `/cart` loses it.

### Add-to-cart feedback
Three signals, one job each:

- **Nav badge** springs on change. Says *where* the item went. Read peripherally, no words.
- **Toast** says *what* went and offers the next step.
- **Cart drawer** opens only when asked - the nav button, or the toast action. It does not open on add.

The drawer used to open on every add. That made it a second confirmation of something the toast had already said, and on the shop grid, where the quick-add button exists precisely so a shopper can add several things in a row, a modal drawer on every click fought the task.

Announcing is done by a visually hidden live region in the nav, not by the badge - the badge is `aria-hidden` because it remounts on every change to replay its animation, and the drawer's own quantity and remove buttons raise no toast, so the live region is the only thing that reports those.

### Motion principles
- Subtle scroll-fade-up on sections (10px → 0, opacity 0 → 1, 480ms, once).
- No parallax. No scroll-hijack. No magnetic cursor.
- Prefers-reduced-motion: disable all `whileInView` motion → instant render.

## Accessibility requirements
- **WCAG 2.1 AA** baseline.
- Color contrast: body text ≥ 4.5:1 (ink on cream = 15.9:1 ✓).
- **Known AA failures, not yet fixed.** The 4.6:1 figure previously recorded for `muted` was wrong. Measured against the current cream: `muted` `#8A8275` = 3.51:1 and `accent` `#C2613A` = 3.84:1, both under the 4.5:1 body-text floor (`text-muted` appears ~177 times, `text-accent` ~45). Both clear 3:1, so they pass for large text and non-text UI, but not for captions and meta at body size. Fix when scope allows: `muted` → `#756E61`, and a darker `accent-text` token → `#B4542D` for inline links, keeping `#C2613A` as a button surface.
- Keyboard navigation: all interactive elements reachable + activatable via Tab + Enter/Space.
- Screen reader: semantic HTML (`<nav>`, `<main>`, `<section>`, `<article>`, `<button>`); aria-labels on icon-only buttons.
- Skip link to main content.
- Form labels always visible (no placeholder-as-label).
- Cart count: live region announces qty changes.
- Modal/drawer: focus trap + return focus on close + Esc to close.
- Image alts: descriptive (placeholder phase: alt = product name + category).
- Motion: honor `prefers-reduced-motion`.

## Icon set
**Lucide React.** Stroke 1.5, size 20px default. Matches editorial calm tone better than Heroicons solid.

## Imagery direction
**Placeholder phase (done):** solid-swatch tiles per product, color from `Product.swatch`.

**Phase 4+ (real photos):**
- Files: `public/products/{slug}/{01-04}.webp`. Slot 01 = hero, 02 = detail, 03 = angle, 04 = in-context.
- Aspect: 1:1 grid tiles, 4:5 hero tile. Match swatch aspect so layout is image-stable on swap.
- Style guide for photography:
  - Backdrop: cream `#F7F6F3` or matte sand `#E7E2D9` — never pure white, never glossy.
  - Lighting: soft, single direction. No hard rim light. Subtle shadow grounded in floor.
  - Subject: occupies 60-75 percent of frame. No floating products.
  - Crop margin: 8 percent breathing room on all edges.
  - File: WebP, quality 82, < 200 KB target, 1600 px long edge.
- Fallback: when `hasPhotos = false`, render swatch tile. When `hasPhotos = true` but specific slot 404s, hide that slot.
- `next/image` serves with `priority` on hero tile only, lazy on grid.

## Currency display
- `formatMmk(value)` — `Ks 249,000` (space-separated, no decimals).
- Use `tabular-nums` everywhere prices appear.
- Strikethrough on original price when discounted; original keeps muted color.

## Stock badge variants
- **In stock** — small caption-style pill, success color, optional ("ships in 3 days")
- **Only N left** — warning color, pill, accent if N ≤ 2
- **Out of stock** — muted, locks add-to-cart button to disabled state

## Wishlist heart
- Outline (lucide `Heart`) when off, filled accent when on.
- Top-right of ProductCard tile, only visible on hover (desktop) or always (mobile, touch).
- Optimistic state — flips on click before server confirms.

## Reviews UI
- Average rating + count above review list.
- "Verified purchase" pill next to user name (small, sand bg, ink text).
- Sort: most recent (default; distribution bar + per-bucket filter is a future enhancement).
- Form: stars selector (radio group, keyboard arrows traversable), title (optional), body (textarea with char counter 10–2000).
- Pending-state copy: "Thanks — your review is awaiting moderation."

## Admin UI tone
- Same warm-palette tokens as the customer-facing pages — no separate dashboard skin.
- Tables: thin `divide-y` lines, `text-[13px]`, eyebrow-style uppercase headers, no zebra-stripe.
- Inputs: same `bg-cream border-line` style as customer forms; tabular-nums on number cells.
- Mutations confirm via toast (`sonner`), never with a modal. Operator works in flow.
- KPI tiles use cream/sand surfaces, no charts in MVP.
- Status pills: success (green) for approved/paid, warning (amber) for pending, muted for rejected/cancelled.

## Checkout (Phase 9 multistep)
Single page, no route changes between steps. State machine in component, `useReducer`. Each step collapses to a summary line + Edit link once advanced.

1. **Delivery** — Recipient name input, phone input (`+95 9XX XXX XXX` mask, regex `^\+959\d{7,9}$`), Division select (sorted by `divisions.sort_order`, blocked rows hidden), City + Township + Street + Landmark (optional). Saved addresses (authed users) appear as cards above the form; click a card to prefill + skip form. "Save this address" toggle defaults on for new entries.
2. **Payment method** — Radio cards (one per active method). Each card: wallet logo + name + small note (e.g. "Bank app", "Cash on Delivery"). COD card only renders when `division ∈ {Yangon, Mandalay}` AND `cart_subtotal + delivery_fee ≤ 500,000 MMK`.
3. **Review + place** — Order summary aside: line items, subtotal, delivery fee (with division label), total in MMK. Place-order CTA is the primary serif button. Disabled while submitting; toast on success → push to `/order/[id]`.

Sticky right-aligned summary on desktop; collapses above the form on mobile.

## Order confirmation states
- `pending_payment` (wallet path): one card per wallet method's instructions. QR image at 240×240, account name + phone in monospace, exact amount + order UUID block, copy buttons next to UUID and phone. Below: slip upload (drag-drop zone + file picker, JPG/PNG/WEBP, 8MB cap, client-side compress on submit), optional tx ref input, submit button.
- `pending_payment` (COD): single panel — "We'll call to confirm. No payment now." + cancel CTA + Telegram backup contact.
- `payment_submitted`: amber-tinted panel ("Slip received. Verifying with bank.") — hides upload form, shows thumbnail of submitted slip + a "Replace" link until status moves past this state.
- `confirmed` (COD): muted panel ("Confirmed by phone. Shipping soon.").
- `paid`: green-tinted panel ("Payment received. Preparing for shipment.").
- `shipped`: blue-tinted panel ("Shipped via BeeExpress. Tracking: <ref>.") if owner pasted a tracking ref.
- `delivered`: muted panel ("Delivered.") + nudge to leave a review.
- `cancelled`: muted red panel ("Order cancelled.") + reason text.

Each state hides the steps that no longer apply (no double-payment risk).

## Empty / error / 404 states
- Empty cart: serif headline "Your cart is empty." + body "Browse the shop to find something." + accent link → `/shop`.
- No search results: "No products match your query." + "Try a broader term or browse [all products](/shop)."
- 404 product: serif "Not found." + body "That product doesn't exist or has been removed." + link to `/shop`.
- All error states use page-level layout, never bare browser fallback.

## Reference assets present in repo
- `logo-crop-400x400.png` — use as `Nav` logo.
- `favicon.ico` — root favicon.
- `original-287154cf24bfaad1fb78d571b6e23bbd.webp` — homepage layout reference only (do not ship).

## Design reference links
- Figma: TBD
- Style tile: TBD (build inline via /impeccable + /taste-skill pass)
