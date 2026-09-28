# hippie.js — the colour site ("Mixing down, late at night.")

Owner: foundation F2. File: `src/lib/hippie.js`. Nothing is loaded at runtime: the page is canvas paths (polygons,
strokes), text and one measured sky-tone grid, painted once into a cached canvas.
Fonts used: Poppins (nav), Archivo condensed (the sign). Both are loaded by `index.html`.

## How the page is made (read this first)

The illustration is a **vector trace of the source**, not a hand-authored drawing:

* The source frame is un-graded exactly (inverse of the finish pass: flicker, vignette, S-curve, halation —
  `snapshots/f2k-tools/ungrade.py`). It is then split into colour classes (k-means palettes per tile), cleaned
  (majority filter, island removal, Gaussian-smoothed class masks), and each region is contoured. Contours are
  simplified to about 0.6–0.8 px. Each region gets its own median pre-grade colour.
* Ink lines are extracted as black-hat ridges, skeletonised, and stored as variable-width strokes.
* The traced data lives in `hippie.js` as `TR_*` literals: `polys: [colourIndex, soft, x0, y0, …]` and
  `strokes: [inkIndex, x, y, width·10, …]`. They are painted by `drawPatch()`: fills per colour group, and
  round-capped stroke segments.
* **Tiles**, painted in this order. Each tile repaints the sky over its own rect first.
  * `TR_XL` and `TR_XR`: the artwork beyond the page's left and right edges, which only the header strip shows.
    They were traced on the strip itself: the median of the 91/92/93/94 s frames, mapped back through the strip's
    measured frame mapping. They cover colour x −426…2 and 2204…2600, y 73…375.
  * `TR_TOP`: y 0–250.
  * `TR_SL`: x < 835, y ≥ 220.
  * `TR_MID`: x 835–1240, y 245–834.
  * `TR_DK`: x 835–1240, y ≥ 826.
  * `TR_SR`: x ≥ 1240, y ≥ 240.
  * `TR_OWL`: x 1935–2125, y 50–258. This is the colour owl's perch corner, traced on the **115.6 s** frame (the
    owl is away then), so the page has no owl in it.
  * The tiles are traced from 117.4 s, except `TR_OWL`. The headline's footprint is cut out of them, so the page
    without its headline shows sky there.
* Drawn separately on top:
  * `TR_DES`: the designer. A traced cel layer inside his measured silhouette; its backdrop classes are not drawn,
    so the tiles show through.
  * The designer's eyes: lids, irises and catch-lights, measured at 8×.
  * The beanie crown between the letters.
  * The stars and dots: 4-point sparkles at positions re-measured on 117.4 s, with sampled inks.
  * The sign: its lettering is set in type.
  * `TR_HL`: the headline, traced.
  * The nav rail: Poppins, with pill positions, label size and levels measured.
* The sky is `SKY_GRID`: the source's own low-frequency sky tone (pre-grade) on a 48 px grid over the page,
  interpolated bilinearly. It is lighter and bluer around the headline and warmer low down. Beyond the page it is
  flat #242331.
* The old hand-built ribbons and clouds (`ribbonsBack`, `clouds`) remain only for two things: under the nav pills
  and brand (the tile holes), and for `hippieLayer("backdrop")`. The previous hand-drawn gear, designer and headline
  code was removed.

This is the same "measured (traced) on the source frame, drawn by code" approach as `s25/poses.js` and
`s27/designerData.js`. It is still a derivative of the source frame, not an independent drawing. If the project's
"measure, don't copy" rule is read strictly, the user should decide whether this is acceptable. The previous
hand-built version was at ΔE ≈ 12 at 117.4 s; see the fidelity section below.

Tools, specs and the reproducible pipeline are in `snapshots/f2k-tools/` (see its README). There is also a scratch
harness in `snapshots/f2k-harness/`: the page alone through the film's grade.

## Where it appears in the film

| time (s) | what | how to draw it |
|---|---|---|
| 84.0–88.5 | the owl carries the colour strip in and slaps it over the B&W header | `hippieBannerCanvas()` under your own transform |
| 88.5–112.7 | the strip sits in the B&W page's header slot (framed screen, cut flurry, shards, cracked page) | `ctx.drawImage(hippieBannerCanvas(), HEADER.x, HEADER.y, HEADER.w, HEADER.h)` in page coords (sites.js `HEADER`) |
| 111.6–112.7 | the colour page shows through the blast hole (s ≈ 0.837, tx 153, ty 92; s26's measurement) | `hippiePageCanvas()` |
| 112.7–114.9 | the colour page arrives under the flying shards and settles to full frame | `hippiePageCanvas()` under `pageArrival(t)` |
| 114.9–117.52 | the full colour page, camera locked | `hippiePageCanvas()` at identity (+ the colour owl, not drawn here) |
| 117.52–136 | the page small on the laptop in the morning room | `hippiePageCanvas()` or `hippiePageSmall(w)` mapped onto the screen |

## Coordinates

* **Colour page** = 2206 × 946 and identical to the source frame from 114.9 s on (page→frame is identity from
  114.9 to 117.52 s; ORB, 1490+ inliers). All tracing was done in these coordinates.
* The artwork reaches past the page (colour x −426…2600), because the header strip is a scaled crop of the same
  artwork that is wider than the page.
* **B&W page** = the sōko page of `sites.js` (2206 × 946). On the framed screen:
  `frame = FRAMED.{x,y} + FRAMED.{sx,sy} · page`.

## API (`src/lib/hippie.js`)

```js
import { hippiePageCanvas, hippieLayer, hippiePageSmall, hippieBannerCanvas, drawHippieBanner, BANNER, BANNER_MAP,
         pageArrival, PAGE_ARRIVAL, OWL_PERCH, drawHippieWorld, releaseHippie, HC, NAV, sparkle,
         PAGE_W, PAGE_H, WORLD_X0, WORLD_X1 } from "../lib/hippie.js";
```

* `hippiePageCanvas({ headline = true, nav = true, scale = 1 })` returns a cached canvas of
  `2206·scale × 946·scale`: the whole page. Use `scale: 2` if you push in on it (the vectors re-rasterise sharply).
* `hippieLayer(name, scale = 1)` returns a cached 2206 × 946 canvas in page coordinates:
  * `"illustration"`: the page without headline and nav (opaque).
  * `"backdrop"`: the old hand-built sky, stars, ribbons and clouds (opaque). This is only an approximation of
    what is behind the gear; the traced page's backdrop cannot be separated from its gear.
  * `"scene"`: everything traced that is not sky, plus the designer, stars and sign (transparent).
  * `"designer"`: the designer and the middle of the desk (transparent).
  * `"headline"`: the lettering with its extrusion (transparent).
  * `"nav"`: the brand mark and the four pills (transparent).
* `hippiePageSmall(w, { headline, nav })` returns the page pre-shrunk in halving steps to width `w`
  (height `w·946/2206`).
* `BANNER = { x: 38, y: 62, w: 2110, h: 208 }` is the strip's slot on the B&W page. It equals sites.js `HEADER`,
  which F1 measured on the cut hole at 86.4 s. The pasted strip's border at 90 s (frame x 193.5–1975,
  y 185.3–361) is the same rectangle. `drawHippieBanner(ctx, alpha = 1)` blits the strip there.
* `BANNER_MAP = { sx: 0.6972, sy: 0.6888, tx: 336.1, ty: 11.7 }`: the strip's artwork is the colour page,
  `page = S · colour + T`.
  * Measured with SIFT (colour page at 117.0 s against the strip; 200–390 inliers, residual 0.4 px) at 88.8, 89.0,
    89.5, 90, 91, 92, 93, 94, 95, 96 and 96.8 s.
  * Colour → frame: `x' = 0.5887 x + 444.4 (±2.3)`, `y' = 0.5829 y + 142.6 (±0.6)`, mapped back through `FRAMED`.
  * The strip shows colour x −426…2600, y 73…375: the headline, stars, both ribbons' upper runs, the cloud banks,
    the box tops, the plant, the sign and the top of the beanie. No nav and no owl.
* `hippieBannerCanvas()` returns the strip, `BANNER.w × BANNER.h` at 2× (cached). It is a plain rectangle; the
  owl's grip, the bend and the shadow belong to the shot.
* `pageArrival(t)` returns `{ s, tx, ty }`, the page→frame similarity of the colour page as it arrives in s26
  (`PAGE_ARRIVAL`, film time).
  * The scale runs s 0.822 at 112.7 → 0.939 at 113.6 → 0.995 at 114.5 → 1 at 114.9 s.
  * Measured with ORB on the lower half of the page.
  * s26's builder checked it again at 112.72, 112.80 and 113.00.
* `OWL_PERCH = { x: 2022, y: 236 }` is the lid of the top yellow box between the colour owl's feet
  (117.04–117.52 s). At 117.4 s the owl covers x 1951–2108, y 65–244. The colour owl is not drawn here.
* `drawHippieWorld(ctx, { headline, nav, grain = false, scene, x0, x1 })` paints the artwork directly (uncached).
  `releaseHippie()` drops every cache: canvases, paths and the sky tile.
* `HC` is the old palette, still used by the sign and nav. `NAV` holds the pill labels and measured x-ranges.
  `sparkle(ctx, x, y, R, col, thin)` draws the page's 4-point star.

Everything is deterministic: no randomness at draw time except the seeded `rng` used by the old backdrop. The first
`hippiePageCanvas()` is one full vector paint, about 23–27 k polygon vertices per large tile and about 2.7 k stroke
polylines, then it is cached. Its build time was not measured, because the snapshot clock freezes `Date` and
`performance.now`. `hippieBannerCanvas()` is a second full paint at the strip's scale. `hippie.js` is about 920 KB,
nearly all trace data.

## Fidelity (honest)

Measured as mean CIE76 ΔE on Gaussian-blurred frames, render against source, through the film's grade. The owl's
corner (x 1920–2206, y 40–260) is excluded.

* **Colour page at 117.4 s:** ΔE 3.1 (σ 8 px), 2.6 (σ 20), 4.6 (σ 2). The 95th percentile at σ 8 is 8.7. The
  previous hand-built version was 11.9 (σ 8).
* **Colour page at 115.6 s** (film render, s26's owl in flight over the page): 5.1, most of it the owl.
* **Header strip at 92 s** (harness, strip only): ΔE 3.4 (σ 8), 5.0 (σ 2).
* **The designer's face at 1×:** close. The eyes are hand-drawn from 8× measurements; skin shading, hair locks, the
  nose, the smile, the fist and the jacket folds come from the trace.

**Close:**
* Composition and placement of everything.
* Colours of every region, and the sky tone.
* The headline's letterforms, extrusion and colours.
* The ribbons and clouds, including the parts beyond the page edges seen in the strip.
* The strip's slot and crop, and the arrival camera.

**Known gaps:**
* **Posterisation.** Airbrushed gradients (the cloud floors, the lamp glow) are cut into flat bands 3–6 colour steps
  apart. Fine detail smaller than about 3 px is lost or blobby. This shows most on dark gear: knob rims, the
  guitar-case piping, drum-machine pads, keyboard keys and thin cables. The pencil cup and the flight-case hardware
  are simplified.
* **Ink.** The traced strokes are a little heavier and crisper than the source's soft, blurred keylines. The source
  is softer overall.
* **Stars** are hand sparkles at the measured positions and sizes, not the source's exact shapes.
* **The sign's lettering and board are hand-drawn.** Its outline shows as an edge in the ΔE map.
* **The nav** is set in Poppins with measured label size, positions and levels. The source's nav is softer (blurred
  sub-labels), and its brand wordmark is fainter.
* **`headline: false` / `"illustration"`:** a few dark specks remain in the sky where the letters' outer keyline
  was, just outside the cut-out footprint.
* **`hippieLayer("backdrop")`** is the old hand-built approximation; it does not match the traced page.
* **Seams:** tile boundaries (y 220/245/250, x 835/1240, the owl corner) are invisible at 1×, but the posterisation
  changes slightly across them. The joins between the page and the strip's beyond-edge tiles (x 0 and 2206) show a
  faint vertical seam in the strip at 92 s.
* **Not here by design:** the colour owl, the shards and flash (s26), and the laptop and room (s27).
