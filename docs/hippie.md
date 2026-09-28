# hippie.js — the colour site ("Mixing down, late at night.")

Owner: foundation F2. File: `src/lib/hippie.js`. Fonts: Poppins (nav) and Archivo (the sign), both declared in
`index.html` and preloaded by `main.js`. Nothing is loaded at runtime and no image, frame, crop or pixel file of the
source is embedded: the page is numbers (polygons, strokes, a coarse sky grid) painted with canvas paths.

## Method: traced (user decision, 2026-09-27)

For the colour ending the user approved **traced geometry** (docs/STYLE.md, "User decision (2026-09-27), the ending").
So this is the **traced page again**, restored from `archive/prev-builds/f2r-prev/hippie.traced.js` (in git history; its notes are in `tracing/hippie/prev-builds-f2r-prev/`), with the fixes
listed below. The hand-drawn rebuild that replaced it (ΔE ≈ 8.5 on the page) is kept verbatim at
`tracing/hippie/prev-builds-f2-drawn-prev/hippie.drawn.js` with its doc (`hippie.drawn.md`). The API is unchanged, so no shot
had to change.

How the trace was made (pipeline: `tracing/hippie/trace-scripts-f2k-tools/`, see its README; it reproduces the stored data
exactly, e.g. `trace.py spec-sr2.json` gives TR_SR vertex for vertex):

* The source frame is un-graded exactly (inverse of the finish pass: flicker, vignette, S-curve, halation —
  `ungrade.py`), split into colour classes (k-means palettes per tile, bilateral pre-filter), cleaned (majority
  filter, island removal, Gaussian-smoothed class masks) and each region contoured and simplified to ~0.6–0.8 px, with
  its own median pre-grade colour.
* Ink lines are black-hat ridges, skeletonised and stored as variable-width strokes.
* Data: `TR_*` literals, `polys: [colourIndex, soft, x0, y0, …]`, `strokes: [inkIndex, x, y, width·10, …]`, painted
  by `drawPatch()` (fills per colour group; soft groups also painted blurred; round-capped stroke segments).
* Tiles, in paint order: `TR_XL`, `TR_XR` (the artwork beyond the page edges, which only the strip shows: traced on
  the median of the 91–94 s strip frames mapped back to colour coordinates; colour x −426…2 and 2204…2600),
  `TR_TOP` (y 0–250), `TR_SL` (x < 835, y ≥ 220), `TR_MID` (x 835–1240, y 245–834), `TR_DK` (x 835–1240, y ≥ 826),
  `TR_SR` (x ≥ 1240, y ≥ 240), `TR_OWL` (x 1935–2125, y 50–258, traced on **115.6 s** when the owl is away, so the
  page has no owl). All others from 117.4 s. The headline's footprint is cut out of them.
* On top: `TR_DES` (the designer, a traced cel layer inside his silhouette), his eyes (hand-drawn from 8×
  measurements), the beanie crown between the letters, the stars (4-point sparkles at measured positions), the sign
  (board and wires drawn, lettering in type), `TR_HL` (the headline, traced), the nav rail (Poppins, measured).
* Sky: `SKY_GRID`, the source's own low-frequency pre-grade sky tone on a 48 px grid, bilinear; #242331 beyond the
  page.

### Changes in this restore pass

* **Tile seams removed.** Regions cut by a tile's rect stopped half a pixel short of it and their rounded corners
  opened notches, so every tile join showed a dotted dark line (x 835 through the ribbon and the desk; x 0 / 2206 and
  y ≈ 241 across the strip). Now: edge vertices are pushed 6 px past the rect (`TILE_SNAP`), tiles overlap by 3 px
  (`TILE_PAD`), and the sky goes under all tiles first (each tile re-skies only its rect inset by the pad).
* **Pixel-aligned strip.** The strip used to be painted straight at its fractional scale (1.397 canvas px per colour
  px), where antialiased clip edges re-created the seams. `hippieBannerCanvas()` now paints the colour rect it shows
  at an integer scale (2×) with an integer offset and resamples it into the strip. `hippiePageCanvas({ scale })`
  does the same for non-integer scales.
* **Blur radii follow the scale** (canvas `filter: blur()` ignores the transform; checked in Chrome), so the 2× strip
  looks like the page.
* **Ink weight 0.7×** (`INK_W`): the traced keyline widths run heavy against the source's soft lines. σ8 page ΔE
  3.16 → 2.69, strip 3.42 → 3.24; on the face and the gear 0.7 reads closest (0.4 scores lower still but loses the
  finer face lines).
* **Print texture** (`FINISH`, `printFinish()`): the source's page has texture the film's grade does not add
  (band-pass 1.5–4 frame px on flat inks: 1.4 levels on the sky, 1.9 on light inks, against 0.6 / 0.9 in the render;
  the same in frame px on the page and on the strip). A seeded noise tile (σ 2 frame px blobs, +2 % multiplicative,
  +2.8 levels additive in the darks) is applied at display scale to the page canvas and to the strip canvas. It
  now measures 1.2–1.3 against the source's 1.3–1.4. Blurred ΔE is unchanged by it (±0.02); it is there for the look.
* **The sign**: lettering refitted to the source's letter mask (Archivo 750, extra-condensed, 30.5 px, x-stretch
  1.03, rotation −0.174; IoU 0.50 at 1 px) in the measured ink #c9a862 (was 600 / condensed / 27 px, #e2bb6e, which
  read thin and pale); the wires are light cords with dark edges, as in the source; board ink #eed9c7. Sign region
  ΔE σ8 6.7 → 5.2.
* **Off-page stars** in the strip re-measured on 92 s: (−179, 141) and (2363, 134) (the right one was 51 px off).
* **The designer's eyes** (hand-drawn over the trace): irises re-sampled pre-grade — near-black brown (#1a111d centre,
  #22141a rim), not the warm #4a2419 they had; smaller catch-lights; lighter lid creases and under-eye lines.
* `BANNER` = sites.js `HEADER` (re-measured since the trace), `BANNER_MAP` the re-measured mapping through the current
  `FRAMED` (the trace's old values were the same frame mapping through an older `FRAMED`).

## Where it appears in the film

| time (s) | what | how to draw it |
|---|---|---|
| 84.0–88.5 | the owl carries the colour strip in and slaps it over the B&W header | `hippieBannerCanvas()` under your own transform |
| 88.5–112.7 | the strip in the B&W page's header slot (framed screen, cut flurry, shards, cracked page) | `ctx.drawImage(hippieBannerCanvas(), HEADER.x, HEADER.y, HEADER.w, HEADER.h)` in page coords |
| 111.6–112.7 | the colour page through the blast hole | `hippiePageCanvas()` |
| 112.7–114.9 | the colour page arrives and settles to full frame | `hippiePageCanvas()` under `pageArrival(t)` |
| 114.9–117.52 | the full colour page, camera locked | `hippiePageCanvas()` at identity (+ the colour owl, not drawn here) |
| 117.52–136 | small on the laptop in the morning room | `hippiePageCanvas()` or `hippiePageSmall(w)` mapped onto the screen |

Users (grep of `src/`): s23 (`hippieBannerCanvas`, `releaseHippie`), s24 (`s24/d/page.js`: `hippieBannerCanvas`),
s25 (`hippieBannerCanvas`, `releaseHippie`), s26 (`hippieBannerCanvas`, `hippiePageCanvas`, `pageArrival`,
`releaseHippie`), s27 (`hippiePageCanvas`, painted into the lid texture). s28 does not import it.

## Coordinates

* **Colour page** = 2206 × 946, identical to the source frame from 114.9 s on (page→frame is identity from 114.9 to
  117.52 s).
* The artwork reaches past the page (colour x −426…2600) because the strip is a scaled crop wider than the page.
* **B&W page** = the sōko page of `sites.js`; on the framed screen `frame = FRAMED.{x,y} + FRAMED.{sx,sy} · page`.

## API (`src/lib/hippie.js`) — unchanged

```js
import { hippiePageCanvas, hippieLayer, hippiePageSmall, hippieBannerCanvas, drawHippieBanner, BANNER, BANNER_MAP,
         pageArrival, PAGE_ARRIVAL, OWL_PERCH, drawHippieWorld, releaseHippie, HC, NAV, sparkle,
         PAGE_W, PAGE_H, WORLD_X0, WORLD_X1 } from "../lib/hippie.js";
```

* `hippiePageCanvas({ headline = true, nav = true, scale = 1 })` → cached canvas `2206·scale × 946·scale`, the whole
  page, print texture applied. `scale: 2` re-rasterises the vectors sharply for push-ins.
* `hippieLayer(name, scale = 1)` → cached 2206 × 946 canvas in page coordinates (no print texture):
  `"illustration"` (page without headline and nav, opaque), `"backdrop"` (the old hand-built sky/stars/ribbons/clouds,
  opaque — only an approximation of what is behind the gear: the traced backdrop is not separable from the gear),
  `"scene"` (everything traced that is not sky, plus designer and sign; transparent), `"designer"` (designer and the
  middle of the desk), `"headline"`, `"nav"`.
* `hippiePageSmall(w, { headline, nav })` → the page pre-shrunk in halving steps to width `w`.
* `BANNER` = sites.js `HEADER` (`{ x: 36.96, y: 62.14, w: 2114.23, h: 207.12 }`); `drawHippieBanner(ctx, alpha = 1)`
  blits the strip there.
* `BANNER_MAP = { sx: 0.6986, sy: 0.6879, tx: 335.2, ty: 11.3 }`: B&W page = S · colour + T (colour → frame
  `x' = 0.5887 x + 444.8`, `y' = 0.5829 y + 142.4`). The strip shows colour x −427…2599, y 74…375.
* `hippieBannerCanvas()` → the strip, `BANNER.w × BANNER.h` at 2× (cached), print texture applied. A plain rectangle;
  grip, bend, shadow and torn edges belong to the shot.
* `pageArrival(t)` → `{ s, tx, ty }` (`PAGE_ARRIVAL`, film time): s 0.822 at 112.7 → 0.939 at 113.6 → 0.995 at 114.5
  → 1 at 114.9 s.
* `OWL_PERCH = { x: 2022, y: 236 }`: the lid of the top gold box between the colour owl's feet (not drawn here).
* `drawHippieWorld(ctx, { headline, nav, scene })` paints the artwork directly (uncached, no print texture). Paint it
  only at an integer scale with an integer offset (the tiles' clip edges must be pixel-aligned) — or use the cached
  canvases. `releaseHippie()` drops every cache.
* `HC` palette, `NAV` (pill labels and measured x-ranges), `sparkle(ctx, x, y, R, col, thin)`.

Deterministic: no randomness at draw time (all noise is seeded). `hippie.js` is ~930 KB, nearly all trace data. Cost
(not timed: the snapshot clock freezes `performance.now`): the page is one vector paint (~27 k vertices per big tile,
~2.7 k strokes) plus a texture pass over 2.1 Mpx; the strip is a paint of a 6070 × 622 canvas, a resample and a texture pass over
1.75 Mpx; both once, then cached. Two renders of the same frame are bit-identical.

## Fidelity (honest)

Mean CIE76 ΔE on Gaussian-blurred frames, render against source, both through the film's grade.

**Page alone** (scratch page harness, 117.4 s, owl corner x 1920–2206 y 40–260 masked): σ2 4.25, σ4 3.34,
**σ8 2.69**, σ12 2.43 (restored trace as archived: 3.16). **Strip alone** (92 s, the strip rect): σ8 **3.24**
(archived trace: 3.43). Headline region (x 640–1520, y 0–380): σ8 2.18 (the drawn rebuild: 4.63). Face (x 960–1180,
y 380–520): 3.55 (drawn: 7.15). Sign (x 340–560, y 300–450): 5.13 (archived trace: 6.70).

**In the film** (all dependent shots rendered with the current shot code, page/strip region, σ8; "before" = the drawn
lib with the same shots, then the baseline `renders/film.mp4`):

| t | shot | region | film.mp4 | drawn lib | traced (this) |
|---|---|---|---|---|---|
| 88.6 | s23 | strip | 7.30 | 7.02 | 4.86 |
| 90 | s23 | strip | 6.67 | 6.57 | 3.71 |
| 92 | s23 | strip | 6.72 | 6.47 | 3.25 |
| 95 | s23 | strip | 8.04 | 7.61 | 5.31 |
| 96.8 | s23 | strip | 7.50 | 6.97 | 4.69 |
| 97.2 | s24 | strip | 7.98 | 7.60 | 5.55 |
| 98.4, 100.2, 100.4 | s24 | (no page on screen) | — | — | full frame unchanged |
| 101 | s25 | strip | 7.53 | 7.24 | 5.98 |
| 104 | s25 | strip | 8.73 | 7.98 | 6.49 |
| 107 | s25 | strip | 10.90 | 10.36 | 9.18 |
| 110.4 | s25 | strip | 10.41 | 9.61 | 8.79 |
| 114 | s26 | full frame | 12.10 | 11.88 | 9.82 |
| 115.4 | s26 | full frame | 9.52 | 9.00 | 3.94 |
| 117.4 | s26 | full frame | 8.84 | 8.35 | 2.73 |
| 118 | s27 | laptop screen | 6.00 | 5.94 | 4.58 |
| 120 | s27 | laptop screen | 5.99 | 5.81 | 4.56 |
| 124 | s27 | laptop screen | 7.21 | 7.50 | 6.90 |
| 128 | s27 | laptop screen | 7.69 | 7.83 | 7.49 |

(At 107–110.4 the strip region is mostly s25's owl and crack web; at 114 most of the frame is s26's flying shards.)

**Close:** composition and placement of everything; the colours of every region and the sky tone; the headline's
letterforms, extrusion and colours; ribbons and clouds (also beyond the page edges); the designer (face, hair,
jacket, laptop); the strip's slot, crop and mapping; the arrival camera.

**Known gaps:**
* **Posterisation of fine dark detail.** Detail under ~3 px is lost or blobby, most visibly on the dark gear at 1×:
  cable coils read as dark masses, knob rows and keyboard keys as smudges, the lamp as a dark blob. A finer re-trace
  of TR_SR (lighter pre-filter, 3×3 majority, smaller islands) was tried: some cables and keys come back, but it is
  noisier and scores worse (σ8 on the right half 2.75 → 2.99), so it was not used.
* **Airbrushed gradients** (cloud floors, the lamp glow) are cut into flat bands.
* **Headline at 1× zoom:** the extrusion is one orange and one magenta band with chunky ink between (the source has
  thinner stacked stripes and keylines); fine at viewing size.
* **The designer's face lines** are still a touch heavier than the source's (e.g. under the left eye); his left
  brow merges with the hair.
* **Stars** are regular sparkles at measured positions; the sign's lettering is type (IoU 0.50 with the source's).
* **`headline: false` / `"illustration"`:** a few dark specks remain in the sky where the letters' outer keyline was.
* **`hippieLayer("backdrop")`** is the old hand-built approximation, not the traced page.
* **Not here by design:** the colour owl, the shards and flash (s26), the laptop and room (s27).

## Scratch (not part of the film)

* `snapshots/hipR-final/`: the final comparison — `cmp-T.jpg` (film.mp4 before | after | source, frame-exact),
  `metrics.txt`, `zoom/` (1:1 crops: seams, sign, eyes), and the measuring scripts.
* How it was verified: the project-root `tools/compare.sh` currently times out (loading every shot module takes longer
  than the snapshot tool's 180 s protocol timeout; each half of the shot list loads fine on its own), so the checks ran
  on a copy of the composition that loads only s23–s27 (a copy of `src/shots/index.js` that skips the other shots,
  everything else symlinked), and on a page-alone harness (the page / strip through `post.js`, ~6 s per render).
* The trace pipeline and specs: `tracing/hippie/trace-scripts-f2k-tools/` (to re-trace a tile: `trace.py spec-<tile>.json
  tr-<tile>.json`, then `emit.py` and splice the `TR_*` literal into `hippie.js`).
