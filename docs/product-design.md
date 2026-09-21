# product-design — merxylab

Compositing workflow for the 3-image product set: two product shots plus one spec card,
all 1:1, minimal text, on-brand.

**You supply the product. AI supplies only the surface.** Real product PNG with a
transparent background, generated backdrop plate underneath, shadow built by hand. That
keeps the product honest, which matters because the shop sells on "Real product in a
sealed box".

Brand values are not repeated here; they live in `docs/brand.md`. Worked example is the
**VXE Dragonfly R1 SE+**, with a fill-in template in section 10.

Last verified: 2026-08-17.

---

## 1. The workflow

```
your product PNG (transparent)
        +
generated backdrop plate  ──►  composite  ──►  two-layer shadow  ──►  export
        +                                                              1600px
generated surface texture                                              WebP q82
```

Three things get generated, none of them the product:

| Asset | What it is | Section |
|---|---|---|
| **Backdrop plate** | Empty cream sweep with directional falloff. The main surface. | 4 |
| **Surface texture** | Matte paper, sand, or a subtle material for variety. | 5 |
| **Nothing else** | The product is yours. Never let a model redraw it. | — |

**The one rule that matters:** image-editing models will happily "improve" your product
if you hand it to them. Redrawn shells, invented buttons, a hallucinated logo. For
catalog slots `01`-`04`, composite deterministically in Canva, Figma, Photoshop or
Affinity. AI-assisted placement (section 7) is fine for social, risky for catalog.

---

## 2. What your PNG needs

Get this right and the composite takes two minutes. Get it wrong and no prompt saves it.

| Requirement | Why |
|---|---|
| **True transparency**, not white-filled | A white-filled PNG on a cream plate shows a hard rectangle. |
| **1600px on the long edge, minimum** | The final export is 1600 × 1600. Upscaling a 600px cutout is visible. |
| **Clean edges, no halo** | Cutouts from a white background keep a white fringe. Defringe or contract the matte by 1-2px. |
| **No baked-in shadow** | You are adding a new shadow that matches the new light. An old shadow underneath reads as two light sources. |
| **No baked-in reflection** | Same reason. The brand look has no reflections. |
| **Neutral-to-warm white balance** | A product shot under cool office light looks blue against cream. Warm it slightly before compositing. |
| **Lit from one side, and you know which** | The plate's light direction must match. See section 6. |

Quick check: open the PNG on a mid-grey background. Any white or dark outline you can see
is a fringe that will show on cream too.

Fastest way to get good cutouts: shoot the product on plain white paper with one soft
light, then remove the background (Canva's Background Remover, `remove.bg`, or Photoshop
Select Subject). Shoot slightly *under*exposed so the shell keeps its form; a blown-out
matte black mouse cuts out badly.

---

## 3. The set

| # | Name | Product PNG | Plate | Text |
|---|---|---|---|---|
| **A** | Hero | Three-quarter view, full product | Cream, light upper-left | None |
| **B** | Detail | Tight crop of one feature | Same plate, blurred | None |
| **C** | Spec card | Not needed | Not needed, it is a rendered layout | Yes, minimal |

All three: **1:1, 1600 × 1600px**, no border, no frame, no watermark.

For B you can crop from the same PNG rather than shooting again, as long as the source is
big enough that a tight crop still lands above 1600px.

---

## 4. Prompt: backdrop plate

Generate this empty, at 1:1. It is the single most reusable asset in this file: one good
plate serves every product you sell.

```
An empty product photography backdrop with absolutely nothing on it. A seamless sheet
of warm cream paper, hex #F5EFE6, photographed straight on. Completely matte with no
gloss, no sheen, no reflection.

One large soft light source from the upper left, as if through a north-facing window
behind a diffusion panel. This creates a gentle luminance gradient: brightest in the
upper left quadrant, falling off smoothly toward the lower right corner, with roughly
a 12 percent difference between the brightest and darkest areas. The falloff is
smooth with no banding and no hard edge.

The lower centre of the frame is very slightly cooler and darker, the natural place a
small object's shadow would fall.

Square 1:1 composition. Photographic realism, natural paper micro-texture at a very
fine scale, sharp throughout.

The frame is completely empty. No product, no object, no prop, no hand, no plant, no
text, no letters, no numbers, no logo, no watermark, no visible paper seam, no
horizon line, no wall-to-floor transition, no vignette, no border, no frame, no
gradient banding, no colour cast other than warm cream.
```

**Variants worth generating once and keeping:**

- Swap `#F5EFE6` for `#E6D9C2` (sand) for a warmer, more tactile plate.
- Change "upper left" to "upper right" so you have a plate for products lit from the
  other side.
- Add "shot from a low three-quarter angle so a shallow surface plane is visible in the
  lower third" for shots that need a sense of the product sitting on something.

Generate four, keep the flattest and most even. Reject any with visible banding in the
falloff; it shows badly after WebP compression.

---

## 5. Prompt: surface texture

For variety, or when a product needs a more tactile ground than paper.

```
A flat overhead photograph of a warm matte surface, filling the entire frame edge to
edge as a seamless texture. [SURFACE]. Colour in the warm cream to sand range, hex
#F5EFE6 to #E6D9C2. Evenly lit with one soft source from the upper left, very low
contrast, no strong shadows and no hot spots.

Square 1:1. Photographic, fine detail, sharp across the whole frame.

No object, no product, no prop, no text, no logo, no watermark, no vignette, no
border, no visible edge or seam, no pattern repetition.
```

Swap `[SURFACE]` for one of:

- `Smooth uncoated matte paper with a very fine tooth`
- `Fine linen fabric with a subtle even weave, no wrinkles`
- `Unfinished pale oak wood with a soft straight grain, matte, no varnish`
- `Fine-grain matte plaster with a barely visible trowel texture`

Keep contrast low. A busy texture fights the product and breaks the calm.

---

## 6. Compositing: the shadow recipe

This is where "shade" actually happens, and it is the difference between a composite that
reads as a photograph and one that reads as a sticker.

### Match the light first

Look at your product PNG. Which side is bright? Use the plate whose light comes from the
same side. If they disagree, flip the plate horizontally rather than the product, because
flipping the product mirrors any asymmetry, side buttons and logos included.

### Two shadow layers, never one

A single soft shadow always looks pasted. Real objects cast two: a tight dark one where
they touch the surface, and a broad soft one from the body.

At 1600 × 1600, for a product occupying ~68% of the width:

| Layer | Offset | Blur | Opacity | Colour |
|---|---|---|---|---|
| **Contact** | 4px down | 12px | 40% | `#1C1B19` |
| **Cast** | 56px down, 40px right | 90px | 18% | `#3A3833` |

**Colour matters.** Both shadows are warm near-blacks, never pure `#000000` and never
blue-tinted. The brand's shadow tokens are all `rgba(28, 27, 25, …)` for exactly this
reason: a cool shadow on a warm cream surface looks wrong immediately.

If your tool only offers one shadow, use the cast values and accept it looks slightly
lifted. Better: duplicate the product layer, fill it solid `#1C1B19`, squash it
vertically to ~15% height, blur it, and place it under the product. That gives a real
perspective shadow.

### Direction

Light from **upper left** means shadows fall **down and to the right**. Both layers, same
direction. Getting these to disagree is the most common tell in a bad composite.

### Placement

- Product occupies **60-75%** of the frame width.
- At least **8%** clear on every edge.
- Optically centred, which usually means a few pixels *above* mathematical centre, since
  the shadow adds visual weight below.
- The product's lowest point sits on the plate's shadow area, not floating above it.

### Final checks

- **Colour temperature.** Product and plate should feel lit by the same light. If the
  product looks cool, warm it: +5 to +10 on temperature, or a very low-opacity `#F5EFE6`
  overlay clipped to the product.
- **Edge.** Zoom to 200% and look for white fringing along the silhouette.
- **Contrast.** A cutout from a bright studio shot often has more contrast than the plate.
  Pull the product's blacks up very slightly so it sits in the same air.

---

## 7. AI-assisted placement, if you would rather not composite by hand

Models that accept an input image (gpt-image-1 edit, Gemini image editing, Flow with a
reference) can place the product for you. Faster, less reliable.

Upload the product PNG **and** the generated plate, then:

```
Place the product from the first image onto the background from the second image.

CRITICAL: Do not modify the product in any way. Do not redraw it, restyle it,
re-render it, sharpen it, recolour it, change its proportions, add or remove buttons,
add a logo, or alter any detail of its surface. Reproduce the product exactly as
supplied, pixel for pixel. It is a real product and any change makes the image false.

Your only job is composition and shadow:
- Scale the product so it occupies about 68 percent of the frame width, optically
  centred, with at least 8 percent clear space on every edge.
- Ground it on the surface so it is in contact, not floating.
- Add two shadows falling down and to the right, consistent with a single soft light
  from the upper left: one tight dark contact shadow directly beneath the product, and
  one broad soft cast shadow at low opacity. Both a warm near-black, never pure black
  and never blue-tinted.
- Add no reflection.

Output square 1:1. Add no text, no logo, no watermark, no border, no frame, no props.
Do not change the background colour or add a gradient or vignette to it.
```

**Then verify before you use it.** Put the output next to your original PNG at 200% and
compare: button count, seam positions, cable exit, wheel texture, any printed marking. If
anything moved, discard it. For catalog slots, discard on any doubt and composite by hand.

---

## 8. Image C — the spec card, rendered not generated

No product image needed, and no image model should build this: they produce specs that
look right and are wrong, which is worse than ugly.

### Best: have Claude render it

Real fonts, exact hex, correct numbers, regenerable per product in seconds.

```
Build me a single self-contained HTML file: a 1:1 square product spec card for my
store, 1600 x 1600 px, designed to be screenshotted or printed to PNG at that size.

Brand:
- Background #F5EFE6. Card surface #FAF6EF with a 1px #E6DFD2 border, radius 20px.
- Ink #1C1B19 for primary text, #3A3833 secondary, #8A8275 for labels.
- Accent #C2613A, used once at most.
- Display font Fraunces (Google Fonts, weight 400) for the product name.
- Body font Inter (Google Fonts, 400/500/600) for everything else.
- Specs use tabular figures (font-variant-numeric: tabular-nums).

Content:
- Eyebrow, 12px, uppercase, 0.08em tracking, colour #8A8275: MICE
- Product name in Fraunces, about 64px, tight leading: VXE Dragonfly R1 SE+
- One line of Inter 22px in #3A3833: 55g wireless esports mouse, PAW3395 SE, 70hr battery
- A spec list, label left in #8A8275 and value right in #1C1B19, separated by 1px
  #E6DFD2 hairlines, generous vertical rhythm. Labels and values exactly as written,
  they are copied from the product page:
    Sensor         PAW3395 SE optical
    Max            18,000 (10 DPI steps)
    Max speed      400 IPS
    Polling rate   125 to 2000 Hz (2K dongle)
    Weight         55g
- Price bottom left in Fraunces 44px: Ks 150,000
- Wordmark bottom right, Inter 500, 20px, lowercase: merxylab

Layout: generous margins, at least 96px inside the card. Vary the vertical spacing
so it has rhythm rather than even gaps. No icons, no shadows other than a very
subtle 0 1px 2px rgba(28,27,25,0.04). No gradients. Calm and editorial, like a
design magazine spec panel. Nothing centred except by deliberate choice.
```

Screenshot at 1600 × 1600, or print to PDF and export.

### Alternative: Canva

1600 × 1600 design. Heading Fraunces (search it first; if absent choose a warm rounded
serif, not a sharp one like Playfair). Body Inter. Palette from `docs/brand.md` section 10.
Five specs, accent on one element only.

---

## 9. Tool notes

### Claude
Spec cards and any text-bearing layout, because it renders real type instead of inventing
it. HTML, SVG or a React artifact all give exact hex and real fonts. With the Canva
connector it can create the design in your account directly. Not a tool for photographic
plates.

### Google Flow / Imagen
Set aspect ratio to **1:1 in the UI**, not in the prompt. Negative-prompt support is thin,
so phrase exclusions positively: "completely matte" beats "not glossy", "warm cream only"
beats "no blue". Feed it flowing prose rather than labelled blocks; Imagen responds better
to descriptive sentences. Strongest on light and material, which is exactly what a plate
needs. Generate four, keep the flattest falloff.

### ChatGPT / gpt-image-1
Takes labelled blocks verbatim, so the section 4 prompt pastes straight in. Say **"square,
1:1"** explicitly. Best of the three at following "no text". Accepts multiple input
images, so it is the most usable option for section 7. If it adds text anyway, reply
"remove all text and regenerate" rather than starting a new thread.

### Background removal
Canva Background Remover, `remove.bg`, or Photoshop Select Subject then refine the edge.
Always contract the matte 1-2px and defringe afterwards.

---

## 10. Template

```
SHOT PLAN
Product PNG:   [file]           Long edge: [px]   Transparent: [y/n]
Light in PNG:  [upper left / upper right / flat]
Plate:         [cream / sand / texture]  Light: [matches PNG]
Product width: 68% of frame     Margin: min 8%
Contact shadow: 4px down, 12px blur, 40%, #1C1B19
Cast shadow:    56px down 40px right, 90px blur, 18%, #3A3833
Export:        1600 x 1600, WebP q82, under 200KB
```

Pull real values from the database and copy them verbatim:

```sql
SELECT name, category_id, price_mmk, swatch, tagline FROM products WHERE slug = '<slug>';
SELECT label, value FROM product_specs WHERE product_id = '<slug>' ORDER BY sort_order;
```

`swatch` is the product's base tone, useful for checking the cutout's colour is right.
`tagline` is the spec-card one-liner. The specs query gives you the card rows.

Copy spec labels and values character for character. "Max" is not "Max DPI", "55g" is not
"55 g", and "125 to 2000 Hz (2K dongle)" is not "up to 2000 Hz". Tidying a spec in a
design is how a wrong number reaches a product page, and the buyer holding the box is the
one who finds it.

---

## 11. Getting them into the shop

- **Format:** WebP, quality 82
- **Size:** 1600px long edge, under 200KB
- **Slots:** `01` hero, `02` detail, `03` angle, `04` in-context
- **Upload:** `/admin/products` → Edit photos. The server writes the 1600px hero and the
  600px thumb, strips EXIF, and flips `has_photos` for that product.

Do not drop files into `public/products/` by hand. Photos live on Cloudflare R2 and the
upload route is what keeps the database flag in step.

---

## 12. Before you publish

- [ ] Product is **your** PNG, unaltered. Nothing about it was redrawn.
- [ ] Square, 1600 × 1600, no border or frame
- [ ] Plate is cream or sand, matte, no gradient banding, no white, no black
- [ ] Plate light direction matches the product's own lighting
- [ ] Two shadows, both warm near-black, both falling down and right
- [ ] Product grounded, not floating, no reflection
- [ ] Fills 60-75% of frame, at least 8% margin all round
- [ ] No white fringe at 200% zoom
- [ ] Product and plate read as the same colour temperature
- [ ] Zero blue, cyan, magenta, neon or RGB spill
- [ ] No text on A or B. On C, every character checked against the product page
- [ ] Under 200KB as WebP q82
