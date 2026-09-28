# sōko — the designer's own site ("MIXING DOWN, LATE AT NIGHT.")

Owner: foundation F1. Files: `src/lib/sites.js` (UI, page layers, framed screen), `src/lib/sokoIll.js` (the hero
illustration), `tracing/soko/tools-dev-pages/soko-test.html` (scratch harness; it imports `../src/…`, so copy it into
a top-level folder such as `tools/` to use it). Everything is drawn in code: paths, strokes, per-pixel carved
lines, painted value studies and exact JS gaussian blurs. No image is loaded and no source pixel is used.

> **Pass 3 (this revision).**
> - **Illustration:** redrawn from scratch as 32 named object layers. There is now a layer API: `SOKO_LAYERS`,
>   `SOKO_BOXES`, and `only` / `except` / `background` on `sokoIllCanvas`. On pages the same options are called
>   `illOnly` / `illExcept`.
> - **Screen glow:** now matches the source's finish pass exactly. It uses an exact gaussian with a 4σ radius and
>   BORDER_REFLECT_101. The old version was 10–40 % too weak toward the frame edges.
> - **Counter panel and nav knobs:** refitted to their measured edges and profiles.
> - **Unchanged:** every coordinate constant (`FRAMED`, `HEADER`, `HEADER_FRAMED`, `SOKO_SOFT`, headline and counter
>   metrics). Page and eye positions also stay compatible with s17's head-turn patch.

## Where it appears

| Film time (s) | Shot | What | How |
|---|---|---|---|
| 0–6.04 | s01 | Tiny on the laptop, swiped between other sites | `sokoPageCanvas({ gaze: "down" })` mapped onto the screen, or `drawSoko(g, w, h)` |
| 23.12–26.72, 29.04–30.56 | s05, s07 | On the laptop over his shoulder | Same as s01 |
| 47.84–53.24 | s17 | Full frame; the owl flies inside the illustration (the owl is not F1's) | `sokoPageCanvas({ gaze: "owl", scale })` at identity after the pull-back. s17's own `s17/page.js` covers the mug and patches the head turn. |
| 53.24–57.32 | s18 | Close on the synth | `sokoIllCanvas({ only: ["uprightSynth", …], scale })` or the full page under your camera |
| 69.44–110.5 | s21–s25 | The page shrunk onto a lit screen, dark room, light spilling into the margins | `drawFramedPage(ctx, pageCanvas, { over })` |
| 74.5–84 | s22 | The owl cuts round the header strip; it comes loose | `sokoPageCanvas({ header: false })` under `sokoHeaderCanvas()` at `HEADER` |
| ~84–88 | s23 | Strip carried off; the hole shows a torn white rim; the colour banner (hippie.js, F2) is slapped into the same rectangle | `drawHeaderHole`, banner into `HEADER` |

## Coordinates

**Page coordinates.** The full-frame page at 48.8–53.2 s is 2206 × 946 (`PAGE_W`, `PAGE_H`). It is identical to the
frame once s17's pull-back ends. Everything was measured on an owl-free plate of the source: the median of 48.6–50.4 s,
with the owl's area taken from 53.12–53.2 s. The film's S-curve, vignette, flicker and halation were undone for tone
(pre-grade values).

**Framed** (69.44–~112 s): `frame = FRAMED.{x,y} + FRAMED.{sx,sy} · page`.
- **The fit:** `FRAMED = { x: 162.36, y: 132.85, sx: 0.842616, sy: 0.847317 }`, from phase correlation of 246
  patches (pass 2). Pass 3 re-checked it by phase correlation of the plate against the framed frames at
  71 / 72 / 76 / 86.4 s:

  | Part | x offset (px) | y offset (px) |
  |---|---|---|
  | Laptop and legs | +2.0–2.5 | ±0.1 |
  | Torso | +1.5 | +0.4 |
  | Face | +2.0 | +0.9 |
  | Right speaker | +0.8 | −0.3 |
  | Synth | −0.5 | +0.1 |

  So the designer does not move between the full-frame and framed shots. The offsets are the source's slight barrel
  shape in x. `FRAMED.quad = { a: 160.0838, b: 0.8487982, c: -2.9e-6 }` is the exact x mapping
  (`fx = a + b·px + c·px²`), used by `toFramedExact()` and `drawFramedPage(…, { exact: true })`.
- **Use the linear mapping everywhere else.** Keep `exact: false`, the default, whenever you composite page-space
  layers (the header strip, the banner) over the page. That keeps every layer the shots draw registered with the page.
- **The page is still:** it does not move over 70–105 s.
- **`FRAMED.screen`** = `{ x0: 144, y0: 128.5, x1: 2023, y1: 946 }` is the lit screen's thin border, open at the
  bottom.
- **`FRAMED.glowRect`** = `{ x0: 137, y0: 121.5, x1: 2030, y1: 946 }` is the rectangle the source's finish pass
  treated as "inside" when it spilled the light.

**HEADER** = `{ x: 36.96, y: 62.14, w: 2114.23, h: 207.12 }` in page coordinates. In frame coordinates it is
`HEADER_FRAMED` = x 193.5–1975.0, y 185.5–361.0. Brightness peaks of the outline, the hole's rim and the banner's
border, measured in frame coordinates:

| t (s) | Edge measured | top | bottom | left | right |
|---|---|---|---|---|---|
| 81.0 | owl's outline | 185 | 363 | 195 | 1979 |
| 82.4 | owl's outline | 187 | 363 | 193 | 1977 |
| 84.0 | owl's outline | 187 | 361 | 193 | 1973 |
| 86.4 | hole's rim | 186 | 361 | 193 | 1974 |
| 88.4 | banner's border | 183 | 359 | 194 | 1975 |
| 90.0 | banner's border | 186 | 361 | 193 | 1974 |

The owl's cut line wobbles a few px outside the rectangle at 80–83 s.

The strip contains the headline, the counter and the yellow key, the top of the DO NOT KNOCK plate, the beanie and the
top of his head (down to just above his brows), and the tops of the carton stacks and plants. The rail (y 0–50) stays
on the page.

## API — `src/lib/sites.js`

```js
import { PAGE_W, PAGE_H, SOKO_BG, SOKO_SOFT, SOKO_LAYERS, SOKO_BOXES, HEADER, HEADER_FRAMED, FRAMED, toFramed,
         fromFramed, toFramedExact, framedTransform, sokoPageCanvas, sokoHeaderCanvas, drawSokoPage, drawSokoHeader,
         drawSokoRail, drawSokoHeadline, drawSokoCounter, drawHeaderHole, headerTornPath, headerTornPoints,
         drawFramedPage, drawPageFramedExact, addScreenGlow, releaseSoko, drawSoko, drawLetters, drawMachines,
         drawIssue, pageCanvas, roundRect } from "../lib/sites.js";
```

### Page layers

These work in page coordinates; `ctx` may carry any transform.

**`sokoPageCanvas(opts)`** returns a cached canvas, `2206·scale × 946·scale`, holding the whole page. Options and
defaults:

| Option | Default | Meaning |
|---|---|---|
| `header` | `true` | `false`: the strip is gone and `drawHeaderHole` draws a near-black hole with a torn white rim |
| `hole` | `"torn"` | `"plain"`: the hole has no rim |
| `rail` | `true` | `false` drops the top rail |
| `ui` | `true` | `false` drops the headline, the counter and the key |
| `ill` | `true` | `false` drops the illustration |
| `illOnly` / `illExcept` | `null` | Arrays of `SOKO_LAYERS` names; paint just these, or all but these |
| `gaze` | `"owl"` | `"owl"`: his irises hard to our left, at the owl (47.84–53.24). `"down"`: lids lowered, irises centred low. Use `"down"` from 69.44 s and on the laptop screens. |
| `counter` | `"000.0"` | The LCD text |
| `scale` | `1` | Use 1.5 or 2 if you push in on the page |
| `soft` | `SOKO_SOFT` (0.65) | Gaussian σ in page px, applied once to the finished page. It matches the source's softness. Pass `0` for a crisp page. |

Build cost is in headless Chromium, once per option set:

| Scale | First build | Each further variant |
|---|---|---|
| 1 | ~0.7 s | ~0.1 s |
| 2 | ~1.8 s | ~0.5 s |

The other page-layer functions:
- **`drawSokoPage(ctx, sameOpts)`:** the same page, drawn uncached and unsoftened.
- **`sokoHeaderCanvas({ gaze, counter, scale, soft = SOKO_SOFT })`:** a cached canvas, `HEADER.w·scale ×
  HEADER.h·scale`, holding everything inside the strip. That is the illustration crop plus the headline, counter and
  key, softened like the page.
  - **Putting it back:** draw it with `ctx.drawImage(c, HEADER.x, HEADER.y, HEADER.w, HEADER.h)` in page
    coordinates, or at `HEADER_FRAMED` in frame coordinates.
  - **Moving it:** you can also transform it freely while it is peeled, bent or carried.
  - **Its back:** plain paper. The source shows it pale grey-white, about #dcdcd6, at 81.6–84 s. Draw that in the
    shot.
- **`drawSokoHeader(ctx, { gaze, counter, ill, scale, illOnly, illExcept })`:** the same content, drawn clipped to
  `HEADER` in page coordinates, unsoftened.
- **UI pieces:** `drawSokoRail(ctx)`, `drawSokoHeadline(ctx, { color })` and `drawSokoCounter(ctx, { counter })`.
- **The torn hole:**
  - `drawHeaderHole(ctx, { seed = 7, rim = true, fill })` draws it.
  - `headerTornPath(ctx, { seed, amp = 3.5, inset })` and `headerTornPoints(opts)` give its outline: a jagged closed
    polyline round `HEADER`, segments ~24 px, ±3.5 px. The white rim is 4.5 px.
  - Use the path as a clip for partial cuts, for example a growing sub-rectangle.
- **`releaseSoko()`:** frees every cached sōko canvas: pages, strips and illustrations. Call it from your `release()`.

### Illustration layers

These are re-exported from `sokoIll.js`.

- **`SOKO_LAYERS`** lists the 32 object layers in paint order, back to front:
  `floor, leftBack, guitarCase, leftMid, knobModule, keyboardLeft, flightStand, lowerCartons, recordsAmp, speakerLeft,
  crateBooks, pedalboard, wallLight, underDesk, trestleBack, trousers, boots, trestleFront, torso, designerHead,
  headphones, laptop, deskPlank, deskItems, lamp, deskCables, doNotKnock, rightBack, rightMid, uprightSynth,
  speakerRight, rightLow`.
- **`SOKO_BOXES[name]`** is `[x0, y0, x1, y1]` in page px: each layer's painted extent. Layers overlap and occlude
  each other in list order. For example, `designerHead` [982, 160, 1158, 430] and `uprightSynth`
  [1614, 442, 1800, 810].
- **What the layers contain:**
  - `designerHead` is the hair, ears, neck, face, eyes, locks and beanie.
  - `torso` is the shirt and hands. `headphones` are the cups round his neck.
  - `deskItems` is the mug with its steam, the books, the pencil cup and the receiver with the books on it.
  - `rightBack` is the carton towers, the headphones and cables on top, and the right plant.
  - `rightLow` is the flight case, the big cartons, the standing book, the magazines, the backpack, the floor gear
    and the cables.
  - `leftMid` is the gear boxes, the tray, the cartons under the plant, and the plant and vine.
- **How to use them:**
  - Paint a part alone with `sokoIllCanvas({ only: [name], background: false })`, which gives a transparent ground.
  - Crop it with `SOKO_BOXES`, for example for s18's synth or s25's shards.
  - Paint the page without a part with `sokoPageCanvas({ illExcept: [name] })`.

### Framed screen

These work in frame coordinates, 2206 × 946.

**`drawFramedPage(ctx, pageCanvas, { glow = 1, border = true, over = null, exact = false })`**
- **What it draws:**
  - It fills the frame black and draws the page at `FRAMED` inside the screen. The page can be any page-coordinate
    canvas, such as `sokoPageCanvas(...)`.
  - It adds the screen's thin border line and the left rivet.
  - It adds the **screen light** exactly as the source's finish pass (finish2.py) did. The screen content is shrunk 8×
    (`floor(W/8) × floor(H/8)`) and blurred as 0.6·G(σ7) + 0.4·G(σ26), both exact gaussians with a 4σ radius and
    reflect-101 borders like OpenCV's. It is then multiplied by 4.5, capped at 120/255 and added to the margins through
    a σ10 soft mask of `glowRect`.
- **The glow is computed from what is on the screen at that moment.** So:
  - Draw anything that should light the room **in `over`**: the owl inside the page, the colour banner, flashes.
    `over(ctx)` runs in frame coordinates, **clipped to the screen rectangle**, before the glow is taken. Use
    `framedTransform(ctx)` inside it to draw in page coordinates.
  - Draw things **outside** the screen, such as the owl standing on the frame's top edge at 72–76 s, **after** the
    call. In the source they do not add to the glow.
- **Calling it:** use an identity transform (it resets the transform anyway). It costs ~60–115 ms per frame under the
  headless software renderer: two full-frame draws plus the CPU glow on a 275 × 118 image. The page itself is cached.
  `exact: true` draws the page with `FRAMED.quad`.
- **Checked against the formula:** our JS glow against the finish2 formula applied in numpy to the *same* pre-grade
  frame, mean glow added (0–255):

  | Region | Page only: JS / finish2 | Page with F2's banner: JS / finish2 |
  |---|---|---|
  | Top band | 31.7 / 32.4 | 72.7 / 75.2 |
  | Left margin | 39.9 / 41.2 | 46.5 / 48.2 |
  | Right margin | 24.0 / 24.4 | 35.8 / 36.3 |
  | Top-left corner | 29.3 / 29.6 | 35.9 / 36.9 |

  Pass 2 was 26.8 / 32.4 on the top band and 20.6 / 29.6 at the corner.
- **Checked against the source,** graded, blurred σ6, 0–255:

  | Time | Region | Ours | Source | Note |
  |---|---|---|---|---|
  | 72 s | Top band | 20.2 | 18.9 | |
  | 72 s | Left margin | 25.2 | 27.8 | The source's owl stands at the lower left and adds light there. Draw it in `over`. |
  | 72 s | Right margin | 14.5 | 12.7 | Our page's right third is a little brighter than the source's. |
  | 90 s | Top band | 53.1 | 61.1 | The source's owl, hovering bright at the top left, adds the rest; our test had no owl. |

The other framed-screen functions:
- **`drawPageFramedExact(ctx, canvas, [px0, py0, px1, py1])`:** draws a page-coordinate canvas, or part of one, at
  its exact framed position (8-px strips on `FRAMED.quad`).
- **`addScreenGlow(ctx, gain = 1)`:** only the glow pass, on whatever `ctx.canvas` holds, in frame coordinates.
- **Coordinate helpers:** `toFramed(px, py)`, `fromFramed(fx, fy)`, `toFramedExact(px, py)`, `framedTransform(ctx)`,
  `HEADER_FRAMED`.

### Other pages

These are the laptop carousel pages for s01, s04 and s05.
- **`drawSoko(ctx, w, h, { ill, counter, owlInPage, header })`:** the sōko page stretched to any `w × h`. The
  illustration defaults to `sokoIllSmall`; pass `ill: null` for none.
- **Other sites:** `drawLetters`, `drawMachines` and `drawIssue`. s01's owner has its own versions in
  `src/shots/s01/pages.js`.
- **`pageCanvas(name, w, h, draw)`:** a cached canvas for a page.

## API — `src/lib/sokoIll.js`

- **`sokoIllCanvas({ gaze = "owl", scale = 1, only = null, except = null, background = true })`:** returns a cached
  canvas, `2206·scale × 946·scale`, in page coordinates.
  - It is crisp: the page softening happens in `sokoPageCanvas`.
  - It is CPU-backed and deterministic: builds are bit-identical in either build order, checked.
- **`paintSokoIll(g, { gaze, only, except, background })`:** paints the illustration, or a subset of its layers, into
  any 2D context in page coordinates, uncached.
- **`SOKO_LAYERS`, `SOKO_BOXES`:** as above.
- **`sokoIllSmall(ctx, w, h)`:** the real illustration (gaze "down") downscaled to `w × h` with high-quality smoothing,
  for the laptop pages.
- **`releaseSokoIll()`:** drops the cached canvases; `releaseSoko()` calls it.
- **`gaussBlurRGBA(data, w, h, sigma)`, `blurCanvas(canvas, sigma)`:** an exact, deterministic gaussian blur. Use
  these, not `ctx.filter = "blur()"`: on CPU-backed canvases Chrome skips blurs below ~0.8 px and quantises larger
  ones. s17, s24 and others import them.

### Drawing engine

These are internal to sokoIll.js; copy them if you need them.
- **`carve()`:** scratchboard lines evaluated per pixel over a quad or a direction.
  - Line width and brightness follow a value, and the mean brightness equals the value.
  - Lines are unevenly spaced, wander, swell, break in the mid-tones and streak.
- **`clothPaint()`:** long thin strokes along a direction field over a painted value study.
- **`licPaint()`:** a line-integral-convolution texture along a field, used on the trousers.
- **`woodPaint()`:** wood grain.
- **`blurDraw()`:** an exact gaussian; blurs above 5 px are computed at reduced resolution.
- **Small parts:** `leaf()`, `knob()`, `cable()`, `woofer()`, `book()`.

### Object positions

In page coordinates; useful for the owl's path in s17 and for s18 and s25.

**The designer:**
- **Beanie:** x 991–1148, y 160–285; the cuff fold at y ~206–226.
- **Face:** x 1018–1124, y 244–378. The chin is at (1072, 378).
- **Eyes:** the openings are x 1022–1053 and 1084–1117, y 280–290.
  - **Irises with `gaze: "owl"`:** centred at (1031, 285) and (1094, 285), r 6.
  - **Irises with `gaze: "down"`:** centred at (1037.5, 287) and (1101, 287), with the lids 1.6 px lower.
  - s17's head-turn patch uses these outlines.
- **Brows:** y ~265–269.
- **Nose tip:** (1072, 318).
- **Mouth:** the line runs x 1051–1094 at y 347–349.
- **Headphones round his neck:** the left cup's shell is centred at (1024, 407) and its cushion at (1041, 404); the
  right cup spans x 1086–1140, y 356–428.
- **Shirt:** x 914–1244, y 352–523. His left hand is at x 1136–1184, y 503–521.
- **Laptop lid:** x 914–1112, y 448–521, with the apple dot at (1010, 491).

**The desk and what stands on it:**
- **Desk plank:** the top edge is at y 523, x 767–1512; the front runs y 523–543.
- **Trousers:** x 925–1290, y 550–800. The dark lap is x 1000–1178, y 550–650.
- **Boots:** x 900–1250, y 768–884.
- **Mug:** x 817–871, y 471–521; the steam rises to y ~359.
- **Pencil cup:** x 1294–1330, y 452–502.
- **Receiver:** x 1355–1486, y 458–521, with books on it at y 420–458.
- **Lamp:** the shade's mouth is centred at (1361.5, 355), the head at (1408, 294), the elbow knob at (1494, 394). Its
  light pool on the wall is centred at (1334, 380).

**The gear:**
- **Left speaker:** x 522–698, y 506–705; the woofer is centred at (574, 613), r 44. Books are on top at y 443–508.
- **Right speaker:** x 1491–1612, y 551–845; the woofer is centred at (1551, 687), r 48.
- **Crate:** x 629–766, y 688–809.
- **Left keyboard:** x 166–430, y 548–624. The key tops run y 567–585 and the fronts y 585–598.
- **Knob module:** x 380–507, y 472–561.
- **Flight-case stand:** the rail runs y 622–648; the lit leg is x 312–343.
- **Records box:** x 369–439, y 707–845.
- **Amp:** x 434–587, y 717–847.
- **Upright synth:** a quad (1664, 457), (1757, 444), (1741, 752), (1641, 752); its keys fill the right half.
- **Flight case (right):** x 1792–1970, y 510–763.
- **Backpack:** x 2016–2183, y 626–866.
- **Magazines:** x 1905–2085, y 757–855.

**The rest of the room:**
- **DO NOT KNOCK plate:** a quad (603, 186), (818, 164), (826, 271), (611, 293).
- **Left plant pot:** x 432–486, y 366–397.
- **Right plant pot:** x 2082–2168, y 282–330.
- **Guitar case:** x 4–143, y 383–660.
- **Floor:** from y ≈ 864.

### UI measurements

These are measured to the source's glyph and panel edges. Colours are pre-grade estimates, with the source's S-curve
and vignette undone.
- **Headline:** Archivo 900 at `font-stretch: expanded` (125 %), 79 px, letter-spacing −1.75 px, x 64, baselines
  148 / 222. The glyph tops are at y 94 / 168; the mean edge error is under 1 px.
- **Rail:**
  - The mark is a disc at (31, 26), r 17, plus a bar at (46, 7.5), 18.5 × 37.5.
  - "sōko / objects" is Geist 300, 17.75 px, at x 77.
  - The nav knobs sit at x 1275 / 1550 / 1785 / 2013 (y 25.5). Pass 3 refitted them to measured profiles: a crisp
    white centre r 6.5 (~0.83 pre-grade), a dark grey dish out to r ~12, and a lit rim arc at r 14.5 along the bottom.
  - The labels are Geist 400, 16.5 px, at x 1302 / 1577 / 1812 / 2041. The Geist Mono 9.3 px sub-labels were
    brightened to the measured mean.
- **Counter:**
  - The LCD panel is x 1901.5–2091, y 92–164, #1b1c14, with no border line. Its edges were measured at half-maximum in
    pass 3; they had been 1.5 px left and 2 px high.
  - "000.0" is Geist Mono 49.25 px, squashed to 95 % height about y 110, letter-spacing 1.75 px, at x 1919, baseline
    147, #efebd6.
- **Yellow key:** (1904, 174.5), 47 × 45, r 5.5, #f5da0c.

## s17

`src/shots/s17.js` and `src/shots/s17/*` belong to the s17 shot agent (owl, camera, compositing). F1 does not edit
them. The brief proposed a provisional page-only s17 as F1's test bed, but s17 already exists as a finished shot, so F1
tested on its own harness instead (see Testing).

s17 uses F1's page (`sokoPageCanvas({ gaze: "owl", scale })`) with its own mug and steam, and its head-turn patch
(`s17/page.js`: `HEAD_BOX` [966, 140, 1172, 400] and the F1 eye outlines). Both still register with the pass-3
drawing: the eye openings and irises are within ~1 px of pass 2.

The shot opens ~1.95× in on the page and pulls back to 1:1. s17's own ORB track is authoritative: fixed point
(865, 341) page px, 1.953 at 47.84 → 1.000 from 48.56.

## Testing

`tools/soko-test.html?mode=ill|page|boxes|s17|framed|small` (the page is kept in `tracing/soko/tools-dev-pages/`; copy it back
to `tools/` first). The parameters are listed in the file.

It uses ES modules, so serve the project root, or bundle it: F1's headless runs bundled it with esbuild into an IIFE
or ES module and opened it on file:// in the Playwright chromium-headless-shell with `--allow-file-access-from-files`.
That needs no server; the scratch driver is `snapshots/f1-harness/`, whose `run.py`, `cmp.py`, `framed.py` and
`glowcheck.py` are not part of the film.

The measuring scripts, also in `snapshots/f1-harness/`:

| Script | What it does |
|---|---|
| `plate.py` | Builds the owl-free plate |
| `gcrop.py` | Ruler crops |
| `meas.py`, `measr.py`, `measrm.py` | Pre-grade cell means, ours against the source |
| `contour.py` | Iso-contour outlines of the plate, used to read off the face, beanie, shirt and boot outlines as simplified coordinates |
| `lvl.py` | Level maps |
| `errmap.py`, `worst.py` | Graded σ6 error grids |
| `texmap.py` | Fine-detail energy ratio |
| `boxes.py` | `SOKO_BOXES` |
| `det.py` | Determinism check |
| `timing2.py` | Page build times |

## Fidelity

All numbers are graded, blurred σ6, mean absolute error against the owl-free source plate, 0–255, full page.

### Page against the plate

| Measure | Pass 2 | Pass 3 |
|---|---|---|
| Whole page | 11.43 | 9.55 |
| Designer box (x 900–1300, y 150–900) | 14.69 | 13.34 |

At 100-px cells the low-frequency tone is within ±10 almost everywhere, and within ±15–20 in a few cells.

### Film frames through `tools/compare.sh`

These include the other shots' owl, mug and banner.

| Time (s) | Error |
|---|---|
| 50 | 9.82 |
| 52.9 | 9.47 |
| 72 | 8.52 |
| 81 | 8.19 |
| 90 | 11.10 |
| 105 | 11.58 |

s17's fidelity log reports 11.3–11.95 at 49–52.6 with the pass-2 page.

### By area

- **UI:** close. The headline, rail, counter, key and sign positions and sizes match the source to about 1 px at full
  frame. Colours are matched pre-grade.
- **Framed screen:** close.
  - The rectangle, border, rivet, hole and banner rectangle are measured.
  - The glow algorithm now reproduces the source's finish pass to about 2–3 % on identical content.
  - The margins at 72 s are within about 1–3/255 of the source, apart from the owl's own light.
- **Illustration:** approx. It is closer than pass 2, but still visibly simpler than the source's dense painterly
  scratchboard.
  - **What matches:** every object is where the source has it, from 3–8× ruler crops and value tables of the plate. The
    32 layers are measured object by object, including the carton faces' light, the woofers' lit cones and dark caps,
    the leaning upright synth, the flight case frame with its clamps and latch, the backpack's straps, the headphones
    and coiled cable on the tower, the hanging cable loops, the pencil cup, the wooden receiver and the lamp's
    crumpled light pool.
  - **What is still simpler:**
    - Carton stripes are more regular.
    - The cable clutter under the desk and round the synth is sparser.
    - The records box and amp are simpler.
    - The floor gear is blockier.
    - Leaves are cleaner and more cartoon-like than the source's.
- **The designer:** approx. What matches:
  - Pose and proportions.
  - The face outline and the value structure (within ~0.05 pre-grade at σ1.5 over most of the face).
  - The heavy tired eyes, with dark bags and the hard sideways look (irises measured). The down gaze is drawn too.
  - Clumpy black hair locks: the big central lock over the left eye's inner corner, and the side locks.
  - The ribbed beanie with its cuff fold.
  - The headphone cups: the shell and the dark ribbed cushion torus, lit from below.
  - The shirt's collar seams, lapels and the t-shirt neckline.
  - Trousers painted as lit fold planes with strokes in the measured directions: down-right on his right leg,
    down-left on his left, horizontal on the cuffs.
  - Chunky boots with lugged soles and white laces.
- **The designer:** what is still simpler.
  - The face is smoother and more "cartoon" than the source's pencil-modelled face: less cheekbone and jaw modelling,
    and a simpler nose and lips.
  - The hair has fewer glossy strands.
  - The shirt folds are fewer and softer.
  - The trousers' strokes are more uniform than the source's brushy planes.
  - The boots are cleaner.
- **`sokoIllSmall`:** the real illustration (gaze "down"), downscaled. The source's laptop screens read softer; s01
  and s05 apply their own softening.
