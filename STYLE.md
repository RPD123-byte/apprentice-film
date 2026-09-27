# Building a shot — brief for every agent

The goal: rebuild the source film **as closely as possible, drawn entirely in code**. No frame, crop or pixel of the source
(or of any AI-generated image) may appear in the render. The source is used only to measure and to compare against.

- Source film: `/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4` — 2206×946, 25 fps, 140.8 s.
- Project: `/Users/computer/rootline/apprentice-film` (HyperFrames composition; `index.html` → `src/main.js`).
- Shot timing is fixed by `PLAN` in `src/shots/index.js` (cut times measured on the source). Do not change it.
- The characters (the young designer in a beanie, the white owl with headphones and a bandage) and the websites are the
  user's own originals — recreate them faithfully. The only third-party-looking thing is the retro "Pure Imagination"
  site on the laptop (24–32 s): that page is an original design in `src/lib/pureimg.js` — no third-party logos.

## Architecture

- `src/main.js` — clock → `renderAt(t)`: clears a 2206×946 2D canvas to black, calls the active shot's `draw`, then the
  global WebGL grade (`src/lib/post.js`: halation, S-curve, vignette, flicker, grain, final fade — ported from the source's own
  finish pass). **Never re-apply the grade inside a shot.** Dissolves: a shot with `xfade` fades up over the previous shot.
- `src/config.js` — `W, H, FPS, DUR`. **Import constants from here, never from `main.js`** (that deadlocks module loading).
- `src/shots/<id>.js` — one module per segment, exporting:
  ```js
  export const shot = {
    draw(ctx, local, t) { /* local = seconds since the segment's start; t = film time */ },
    xfade: 0,                       // optional: dissolve up over the previous shot for N seconds
    release() { /* optional: drop cached canvases (called once the timeline has moved on) */ },
  };
  ```
  `draw` must be a **pure function of time**: the same `t` always gives the same pixels (renders run out of order, in
  several browser workers). No `Math.random`, `Date`, `performance.now`, network, or state carried between frames.
  Lazy-build caches inside `draw` (first call), never at module top level.
- Engine (`src/lib/`, shared — **read-only unless you own it**, see Ownership):
  - `rng.js` — `rng(seed)`, `hash`, `noise1/noise2`, `clamp, lerp, smooth, easeInOut, easeOut, easeIn, span(t,a,b)`.
  - `engrave.js` — the scratchboard look. `new Plate(W, H, scale)`; `P.fill(pathFn, value, angle, {spacing, style})` paints a
    grey **value** (0 black … 1 white; number or `g => gradient`) and a **stroke direction** (radians) into two maps;
    `P.light(pathFn, value, op, alpha)` repaints value only (shadows/glows); `P.o` is a transparent 2D overlay for contours and
    crisp details drawn on top; `P.engrave({spacing, seed, contrast})` cuts white lines whose width follows the value and
    returns a canvas. Styles: 0 lines, 1 cross-hatch, 2 flat tone (no lines — use for crisp small things), 3 knit ticks.
    Animated layers: keep one Plate, `P.reset()` each frame, and `P.engrave(opts, outCanvas)` to reuse the output canvas.
  - `ink.js` — `taper(ctx, pts, widthFn, color)` variable-width strokes, `hatch`, `wobble`, `INK` (#f2f0ea).
  - `paths.js` — `smoothPath`, `sampleCurve`, `inkCurve`, `fillShape`, `hatchShape`, `radialHatch`, `cached`, `blit`, `bbox`.
  - `cam3d.js` — tiny perspective camera, `drawQuad`, `boxFaces`, `drawBoxes` (stroke-rendered 3D boxes; good for rooms and
    corridors seen with a moving camera).
  - `sites.js`, `sokoIll.js` (sōko page), `hippie.js` (colour site), `pureimg.js` + `notecard.js` (Pure Imagination page and
    the feedback card), `owlInk.js` (B&W owl kit), `owlColor.js` (colour owl) — see `docs/*.md` for each.
- Existing shots to learn from: `s01_birdseye.js` (engraved plate + measured push-in + screen carousel mapped onto a quad),
  `s40_endcard.js` (colour graphics), `s12.js` (owl plate).

## The look (black-and-white section, 0–110 s)

Hand-inked horror-manga, **white line on deep black**: large areas of pure black; light concentrated on the subject;
tone built from line width (engraving) and hatching, never smooth grey fills; line weight swells and tapers; the drawing holds
still like printed ink (static things must not boil — seed everything). Paint a *value study* that matches the source's
light (compare blurred), give each surface a stroke direction that follows its form, and add contours on `P.o`
(white lines on dark objects, dark lines on lit objects). Characters are brighter and softer than the room: the owl is a
glowing, rounded, nearly-white bird with fine dark accents — not a grey cut-out. The colour section (110–140 s) is warm,
illustrated, with ink outlines.

## Measure, don't guess

- `tools/grid.py T out.jpg [x0 y0 x1 y1]` — source frame with a labelled coordinate grid (crop to zoom).
- `tools/strip.py T0 T1 STEP out.jpg [x0 y0 x1 y1] [--cols N] [--w PX]` — tiles of the source over time (timing, motion).
- `tools/camtrack.py T0 T1 STEP [x0 y0 x1 y1]` — the source camera move as scale/rotation/translation vs T0 (ORB+RANSAC).
  Reproduce moves with these numbers (zoom fixed point = tx/(1-s), ty/(1-s)). Give a region to ignore moving characters.
- `tools/refframe.sh T out.png` — one full-resolution source frame.
- Colours: sample source pixels with Python/cv2.
- `Read` images to look at them. Source prompts describing each shot (context only, not ground truth) are in
  `/Users/computer/rapport-videos/videogen/clips/p_*.txt` and `clips/s11|s12|s13/p_*.txt`.

## Compare, iterate

- `tools/compare.sh 12.0,13.5,15.0 snapshots/<id>` — renders those times and writes `pair-*.jpg` (**render | source**).
  Always use your own `snapshots/<id>...` directory (other agents render at the same time).
- `tools/sidebyside.sh START END FPS snapshots/<id>-motion` — motion check: pairs at FPS packed into `sheet.jpg` + mp4.
- Iterate until the pairs match: same framing, same timing of every action and camera move, same light and tone,
  same shapes. Check the first and last 0.1 s of the segment too (cuts must land on the same frames as the source).
- Speed: target ≤ 300 ms per frame. Engrave static plates once; animate by transforming cached canvases; re-engrave only
  layers that genuinely change shape, using a reused Plate + output canvas. Free Plates you no longer need.

## Ownership (many agents work at once)

- Write **only** your own files: `src/shots/<id>.js`, optional helpers in `src/shots/<id>/`, your `fidelity/<id>.md`,
  and scratch output under `snapshots/<id>*`. Foundation owners additionally own the lib files named in their brief.
- Never edit `src/main.js`, `src/shots/index.js`, `src/config.js`, `src/lib/post.js`, `index.html`, other agents' shots,
  or shared libs you don't own. Need a variant of a helper? Copy it into your own file.
- Don't run a full render (`npm run render`), don't touch git, don't start servers.

## Fidelity log (be honest)

Write `fidelity/<id>.md`: first line a table row `| <id> | start–end | what the shot is | close/approx/simplified/cut | notes |`,
then a short list of the known gaps. **close** = framing, timing, motion and look match closely · **approx** = same shot and
staging, drawing visibly simplified · **simplified** = reduced staging/detail · **cut** = not built. Never overstate.
