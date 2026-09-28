# hippie.js — the colour site ("Mixing down, late at night.")

Owner: foundation F2. File: `src/lib/hippie.js`. Fonts: Fraunces Soft Black (headline — it fits the source's
lettering better than Shrikhand: glyph IoU 0.84 vs 0.83, headline ΔE 5.2 vs 5.6), Poppins (nav), Archivo condensed
(the sign); all declared in `index.html` and preloaded by `main.js`. Nothing is loaded at runtime and no image, frame, crop or pixel of the source is
embedded: the page is drawn with canvas paths, gradients and type.

> **This is a rebuild (F2 re-run).** The previous `hippie.js` was a vector *trace* of the source frame (k-means
> colour regions contoured at ~0.7 px, per-region median colours, skeletonised ink, a sampled sky grid; ~920 KB of
> trace data). That embeds the source image in vector form, which the brief forbids ("never load or embed any
> frame/crop/pixel of the source"). It was replaced by a drawn page with the **same API**. The previous file is kept
> verbatim at `snapshots/f2r-prev/hippie.traced.js` (and its doc at `snapshots/f2r-prev/hippie.traced.md`) in case the
> user wants it back; nothing was deleted. Numerically the drawn page is further from the source than the trace was
> (see Fidelity).

## How the page is made

Everything is authored drawing code; the source frame (117.4 s, the owl's corner from 115.6 s) was used only to
**measure** — positions, sizes, band edges, corners and inks — with the scripts in `snapshots/f2r-tools/`.

| element | how it is drawn | how it was measured |
|---|---|---|
| sky | flat `#242331` | pre-grade samples of the open sky (±3 levels) |
| headline | Fraunces Soft Black, **one glyph at a time** (pen position, size, rotation, x-stretch, skew per glyph), cream / golden "late", keylined, over a stacked extrusion (copies scaled about a far point: orange, then magenta → purple) | each glyph's transform fitted to the source's letter faces (IoU 0.84 mean); extrusion depth, split and far point tuned by blurred ΔE |
| ribbons | per-band polygons between measured edges, inked on their long edges | band edges read on cross-sections every 12 px along a hand-placed spine (left ribbon), or on rows every 10 px (right ribbon); lightly smoothed |
| low rainbows | band stacks between boundary curves | band boundaries on vertical scans every 20–35 px |
| clouds | layered unions of circles (lobes): outlined silhouette, then gradient / airbrushed inner bands clipped to it | circles fitted to the source's cloud colour regions (largest-inscribed-circle greedy fit), gradient stops sampled on vertical profiles |
| boxes, flat panels | quads from measured corners, sampled ink, tape squares | face corners from flat-region outlines at 1–2 % of their perimeter, hidden corners completed by hand |
| leaves | parametric hearts / blades (centre, length, width, tip angle, two-tone) | placed one by one from 3x grids |
| designer, laptop, desk, mug | Catmull-Rom outlines, tapered ink strokes, a few shade shapes; knit beanie, hand-drawn eyes | outlines read off 2.4–6x grids |
| gear (speakers, synths, drum machine, keyboard, flight cases, lamp, books, backpack, devices, cables, headphones) | rectangles, circles, splines | corners and centres from grids |
| stars | 4-point sparkles and dots | positions, sizes and inks detected on the sky |
| sign | cream board + Archivo condensed lettering | corners, screws, nail, wires from a 4x grid |
| nav | Poppins pills and brand mark | pill outlines, label size and levels measured |
| print finish | every cached page/layer gets a 0.6 px gaussian and a fixed seeded multiplicative grain (2.4 %) | texture σ compared on flat inks |

The artwork beyond the page edges (colour x −440…2 and 2204…2620, only seen in the header strip) has its own clouds
and stars, fitted on the strip itself (median of the 88.8–92 s frames mapped back into colour-page coordinates).

## Where it appears in the film

| time (s) | what | how to draw it |
|---|---|---|
| 84.0–88.5 | the owl carries the colour strip in and slaps it over the B&W header | `hippieBannerCanvas()` under your own transform |
| 88.5–112.7 | the strip sits in the B&W page's header slot | `ctx.drawImage(hippieBannerCanvas(), HEADER.x, HEADER.y, HEADER.w, HEADER.h)` in page coords (sites.js `HEADER`) |
| 111.6–112.7 | the colour page through the blast hole | `hippiePageCanvas()` |
| 112.7–114.9 | the colour page arrives and settles to full frame | `hippiePageCanvas()` under `pageArrival(t)` |
| 114.9–117.52 | the full colour page, camera locked | `hippiePageCanvas()` at identity (+ the colour owl, not drawn here) |
| 117.52–136 | small on the laptop in the morning room | `hippiePageCanvas()` or `hippiePageSmall(w)` mapped onto the screen |

## Coordinates

* **Colour page** = 2206 × 946, identical to the source frame from 114.9 s on (page→frame is identity from 114.9 to
  117.52 s; re-checked with SIFT: s = 1.0000, t = 0.0 at 115.5 and 117.0 s).
* **B&W page** = the sōko page of `sites.js`; on the framed screen `frame = FRAMED.{x,y} + FRAMED.{sx,sy} · page`.

## API (`src/lib/hippie.js`) — unchanged from the previous version

```js
import { hippiePageCanvas, hippieLayer, hippiePageSmall, hippieBannerCanvas, drawHippieBanner, BANNER, BANNER_MAP,
         pageArrival, PAGE_ARRIVAL, OWL_PERCH, drawHippieWorld, releaseHippie, HC, NAV, sparkle,
         PAGE_W, PAGE_H, WORLD_X0, WORLD_X1 } from "../lib/hippie.js";
```

* `hippiePageCanvas({ headline = true, nav = true, scale = 1 })` → cached canvas `2206·scale × 946·scale`, the whole
  page (print finish applied). `scale: 2` re-draws the vectors sharply for push-ins.
* `hippieLayer(name, scale = 1)` → cached 2206 × 946 canvas in page coordinates:
  * `"illustration"`: the page without headline and nav (opaque).
  * `"backdrop"`: sky, low rainbows, floor, clouds, ribbons, stars (opaque) — what is behind the gear.
  * `"scene"`: boxes, gear, plants, sign, daisy, cables, designer, desk, mug (transparent).
  * `"designer"`: the designer, his laptop and the desk (transparent).
  * `"headline"`: the lettering with its extrusion (transparent).
  * `"nav"`: the brand mark and the four pills (transparent).
* `hippiePageSmall(w, { headline, nav })` → the page pre-shrunk in halving steps to width `w` (height `w·946/2206`).
* `BANNER` = sites.js `HEADER` (`{ x: 36.96, y: 62.14, w: 2114.23, h: 207.12 }`), the strip's slot on the B&W page
  (frame x 193.5–1975, y 185.5–361 on the framed screen). `drawHippieBanner(ctx, alpha = 1)` blits the strip there.
* `BANNER_MAP = { sx: 0.6986, sy: 0.6879, tx: 335.2, ty: 11.3 }`: the strip's artwork is the colour page,
  `B&W page = S · colour + T`. Re-measured in this pass (SIFT, colour page ↔ strip, 150–370 inliers, residual
  0.4–0.66 px) at 88.8, 89, 90, 91, 92, 93, 95, 96, 97, 101 s: colour → frame `x' = 0.5887 x + 444.8 (±2)`,
  `y' = 0.5829 y + 142.4 (±0.7)`, mapped back through `FRAMED`. The strip shows colour x −428…2599, y 73…375.
* `hippieBannerCanvas()` → the strip, `BANNER.w × BANNER.h` at 2× (cached). A plain rectangle; grip, bend, shadow and
  torn edges belong to the shot.
* `pageArrival(t)` → `{ s, tx, ty }`, page→frame similarity as the page arrives in s26 (`PAGE_ARRIVAL`, film time):
  s 0.822 at 112.7 → 0.939 at 113.6 → 0.995 at 114.5 → 1 at 114.9 s. Re-checked in this pass (SIFT on the lower 60 %
  of the page, 97–2040 inliers): within 0.002 in s and 1.5 px in t at every tabulated time.
* `OWL_PERCH = { x: 2022, y: 236 }`: the lid of the top gold box between the colour owl's feet (117.04–117.52 s).
  The colour owl is not drawn here.
* `drawHippieWorld(ctx, { headline, nav, scene })` paints the artwork directly (uncached, no print finish).
  `releaseHippie()` drops every cache.
* `HC` palette, `NAV` (pill labels and measured x-ranges), `sparkle(ctx, x, y, R, col, thin)` (the page's 4-point star).

Deterministic: no randomness at draw time (the grain tile is seeded). The first `hippiePageCanvas()` is one vector
paint plus the finish pass (a separable JS gaussian and the grain multiply over 2.1 Mpx), then cached;
`hippieBannerCanvas()` is a second paint at the strip's scale. `hippie.js` is ~100 KB.

## Fidelity (honest)

Measured as mean CIE76 ΔE on Gaussian-blurred frames, render against source, both through the film's grade, with the
page alone in the scratch harness `snapshots/f2r-harness/` (owl corner filled from 115.6 s in the reference).

* **Colour page at 117.4 s** (owl corner x 1920–2206, y 40–260 excluded): ΔE **8.5 (σ 8)**, 11.7 (σ 2), 6.4 (σ 20);
  median 5.5, 95th percentile 26.6 at σ 8. Where the error sits: gear detail (drum machine, cables, devices, the
  backpack), the designer's jacket texture and hair, and the 6-px column at the right page edge.
* **Headline region alone** (x 640–1520, y 0–380): ΔE 4.6 (σ 8).
* **Header strip at 92 s** (framed slot, strip only): ΔE 6.4 (σ 8), 9.0 (σ 2). At 95 s and later the source strip is
  under the owl's aura / other shots, so it cannot be compared there.
* For reference: the previous *traced* page scored 3.2 (σ 8) on the same test, the earlier hand-built attempt 11.9.
  The drawn page is visibly further from the source than the trace; that is the cost of not embedding the frame.
* Deterministic: two separate renders of 117.4 s are bit-identical. The page, all layers, the small page and the
  strip together build in well under a second (lost in the ~6.5 s snapshot start-up).
* Film integration checked with `tools/compare.sh` at 88.8, 112.8, 113.6, 114.5, 116.5, 117.4, 118.2, 121, 126 s:
  s23–s27 draw the new page/strip through the unchanged API.
* **`hippieLayer("backdrop")`** is only complete where the source shows the backdrop: clouds and ribbon pieces were
  fitted to their visible parts, so behind the gear it has gaps (sky shows through).

**Close:** composition and placement of every element; headline letterforms, colours and extrusion; ribbons' paths
and band order; box stacks and their inks; the nav; the strip's slot, crop and mapping; the arrival camera.

**Known gaps:**
* **The designer** is a simpler cartoon than the source's detailed anime drawing: face shading, hair locks, fist and
  jacket folds are simplified; expression and pose match.
* **Gear detail**: knobs, jacks, keys, the dense cable bundles and the flight-case hardware are simplified; several
  small devices are generic boxes.
* **Airbrushed gradients** (cloud floors, the low rainbow's soft blends, the lamp glow) are flatter than the source.
* **Leaves** are parametric hearts, not the source's individual leaf shapes.
* **Stars** are regular 4-point sparkles.
* **Not here by design:** the colour owl, the shards and flash (s26), the laptop and room (s27).

## Test bed and scratch

* `src/shots/s26.js` was **not** replaced with a provisional test bed: it had already been completed by the s26
  builder (it shows the colour page from local ≈ 2.2 s, via `pageArrival` / `hippiePageCanvas`), so overwriting it
  would have destroyed that work. Compare the page in the film with `tools/compare.sh 113.5,114.5,116.5,117.4 …`.
* Scratch harness (not part of the film): `snapshots/f2r-harness/` — the page alone through the film's grade
  (t 112.7–117.52: page under `pageArrival`; 84–112.7: the strip in the framed slot; ≥ 117.52: `hippiePageSmall(755)`;
  6/7/8/9 s: the `backdrop` / `scene` / `illustration` / `designer` layers; < 6 s: a layer contact sheet).
  `snapshots/f2r-tools/render.sh T outdir` renders it; `cmp.py` gives blurred ΔE and crops.
* Measuring scripts: `snapshots/f2r-tools/` (grade/ungrade, class maps, ribbon cross-section scans `nstrips.py` /
  `strips.py` / `rib2.py`, cloud circle fits `cloudfit.py`, face corners `facefit.py`, glyph fits in
  `snapshots/f2r-fit/fit_hl.py`, strip and arrival mapping `bannermap.py` / `arrival.py`). The generated data blocks
  live in `snapshots/f2r-fit/*.frag.js` and are spliced into `hippie.js` between `// @@NAME` markers by `splice.py`.
