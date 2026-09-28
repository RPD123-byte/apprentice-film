# s12 — 33.6–35.36 s: The room drops away: the owl stares on black

Status **approx**, method **traced** (see `docs/FIDELITY.md` and `docs/fidelity/s12.md`). The render code is `src/shots/s12.js` and `src/shots/s12/`.

## How the data in `src/shots/s12/` was made

The data files the render loads name the script that generated them in their header comment. Those scripts, at their new paths:

| producer script (in `tracing/`) | runtime files it produced |
|---|---|
| [`s12/src-s12/trace/trace_snap.py`](src-s12/trace/trace_snap.py) | `src/shots/s12/beak.js`, `src/shots/s12/plaster.js`, `src/shots/s12/tailx.js`, `src/shots/s12/tuft.js` |
| [`s12/src-s12/trace/trace_region.py`](src-s12/trace/trace_region.py) | `src/shots/s12/crown.js`, `src/shots/s12/flank.js` |
| [`s12/src-s12/trace/trace_shell.py`](src-s12/trace/trace_shell.py) | `src/shots/s12/shell.js`, `src/shots/s12/under.js` |
| [`s12/src-s12/trace/beak_tojs.py`](src-s12/trace/beak_tojs.py) | `src/shots/s12/beak.js` |
| [`s12/src-s12/trace/degrade.py`](src-s12/trace/degrade.py) | `src/shots/s12/tone.js` |
| [`s12/src-s12/trace/eyes_tojs.py`](src-s12/trace/eyes_tojs.py) | `src/shots/s12/eyes.js` |
| [`s12/src-s12/trace/hp_tojs.py`](src-s12/trace/hp_tojs.py) | `src/shots/s12/hp.js` |
| [`s12/src-s12/trace/shell_tojs.py`](src-s12/trace/shell_tojs.py) | `src/shots/s12/shell.js` |
| [`s12/src-s12/trace/tone_fit.py`](src-s12/trace/tone_fit.py) | `src/shots/s12/tone.js` |
| [`s12/src-s12/trace/trace_cup2.py`](src-s12/trace/trace_cup2.py) | `src/shots/s12/hpx.js` |
| [`s12/src-s12/trace/trace_cush.py`](src-s12/trace/trace_cush.py) | `src/shots/s12/cush.js` |
| [`s12/src-s12/trace/trace_eyes.py`](src-s12/trace/trace_eyes.py) | `src/shots/s12/eyes.js` |
| [`s12/src-s12/trace/trace_hp.py`](src-s12/trace/trace_hp.py) | `src/shots/s12/hp.js` |
| [`s12/src-s12/trace/trace_rings.py`](src-s12/trace/trace_rings.py) | `src/shots/s12/rings.js` |

Method notes written next to the trace code: [`src-s12/trace/README.md`](src-s12/trace/README.md).

## Index of folders (14)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `src-s12/` — trace / measurement scripts that lived next to the shot data in src/ (not loaded by the render), 34 files
Measurement scripts for the s12 hero (not loaded by the film).

**Produced runtime data:** `src/shots/s12/` (14 files: beak.js, crown.js, cush.js, …)

- `trace/trace_cup2.py` — trace_cup2.py src850.png out.js dbg.jpg (fix pass 2: the near headphone's METAL as dark ink on light metal) The review of fix pass 1 found the metal drawn as white strea…
- `trace/trace_shell.py` — trace_shell.py src850.png out.json dbg.jpg [Y0] (fix pass 3: the near headphone's lower metal shell) The review of fix pass 2 found the lower shell (below the J-hook and…
- `trace/trace_hp.py` — trace_hp.py src.png out.json dbg.png Measures the near headphone cup of the s12 hero on ONE source frame (34.0 s) and writes control points only: - "lines": evenly space…
- `trace/trace_region.py` — trace_region.py src.png t poly.json HI LO MINLEN out.json dbg.jpg [sigmas] [flowsigma] Fix pass 2: dark ink centre-lines inside ONE region of one source frame, in pre-fi…

### `trace-scripts-s12-f4b/` — scripts, 3 files
The black-and-white owl kit.

- `owlInk.orig.js` — The black-and-white owl kit.
- `hero.orig.js` — The s12 hero owl, drawn in FRAME PIXELS from measured control points (./geo.js).
- `s09.orig.js` — Owl close-up (32.60–33.60): the owl on his shoulder, the edge of his beanie, hair and cheek filling the left of frame, the dim room and a lit speaker behind on the right.

### `trace-scripts-s12-fix1-dbg/` — work folder, 3 files
The s12 hero owl, drawn in FRAME PIXELS from measured control points (./geo.js).

- `orig/hero_orig.js` — The s12 hero owl, drawn in FRAME PIXELS from measured control points (./geo.js).
- `index.html` — s12 layer debug

### `trace-scripts-s12-galproj/` — tracing / fitting, 2 files
owl gallery scratch

- `index.html` — owl gallery scratch

### `snapshots-s12-f4c-gal/` — tracing / fitting, 1 file
owl gallery scratch

- `index.html` — owl gallery scratch

### `snapshots-s12-f4c-htmltest/` — scripts, 1 file
gallery html test

- `index.html` — gallery html test

### `snapshots-s12-f4c-meas/` — measurement / study, 7 files
fit2.sh PAGE T x0 y0 x1 y1 name scale -> 2 panels (render \| source + red render outline), scaled

- `fit2.sh` — fit2.sh PAGE T x0 y0 x1 y1 name scale -> 2 panels (render \| source + red render outline), scaled
- `fit.sh` — fit.sh PAGE T x0 y0 x1 y1 name -> snapshots/s12-f4c-meas/fit-<name>.jpg (render page \| source at T)
- `gal-check.mjs` — anchors

### `snapshots-s12-fix1b-h/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 16 files
outer edge of the dark run: next point > 90 after i

- `m_plate2.py` — outer edge of the dark run: next point > 90 after i
- `m_plate.py` — per angle: scan outward from 0.7 to 1.45 of the interior ellipse radius, find the dark run after the halftone
- `run.mjs` — node run.mjs outdir t1,t2,...
- `fftmap.py`

### `snapshots-s12-fix2-final/` — the shot build after a pass (+ the scripts used in it), 9 files
s12 headless harness (fix pass 3): node run.mjs OUTDIR 34.0,35.2,35.3 [raw] renders s12 + post.js at those times

- `harness/met.py` — python met.py dir -> region metrics for r-34.0/35.2/35.3 vs src 850/880/882
- `harness/run.mjs` — node run.mjs outdir t1,t2,...
- `harness/crop.py` — python crop.py dir t x0 y0 x1 y1 scale out.jpg [grid] -> render \| source crop, zoomed, optional grid every 10 px
- `harness/unwarp.py` — measurement view: lower shell in elliptic coords about the plate (1379.5,277.5, 41.5x77): columns = angle, rows = rho

### `scratch-build/` — loose scripts from an agent scratchpad, 2 files
list of dark runs (y start,end)

- `eyeprof.py` — list of dark runs (y start,end)

### `scratch-build-fit/` — tracing / fitting, 5 files
eyes: yaw, pitch, spread, el

- `fit_feat.mjs` — eyes: yaw, pitch, spread, el
- `fit.mjs` — Fit the kit's sit3q preset to the measured s12 hero geometry (frame px at HERO_PLACE).
- `fit_body.mjs` — wing
- `fit_tuft.mjs` — compare only outside the head

### `scratch-build-fx/` — work folder, 15 files
rtrack.py spec.json out.json : faces {id: {z, f:[f0,f1], keys:{f:[[x,y]*4]}}}

- `rtrack.py` — rtrack.py spec.json out.json : faces {id: {z, f:[f0,f1], keys:{f:[[x,y]*4]}}}
- `cmp.py` — cmp.py renderdir [outprefix] -> per-frame blurred MAE + sheet (render over source)
- `rov.py` — rov.py spec.json tracked.json outprefix [f0 f1] : overlays
- `rov2.py` — rov2.py TAKE out.jpg [f0 f1] : draw the keyed quads over the source frames (gamma-lifted), 2 per row

### `scratch-build-s12fix/` — work folder, 10 files
usage: overlay.py ref.png out.jpg x0 y0 x1 y1 scale [keys...]

- `overlay.py` — usage: overlay.py ref.png out.jpg x0 y0 x1 y1 scale [keys...]
- `crop.py` — usage: crop.py render.png ref.png x0 y0 x1 y1 scale out.jpg [grid]
- `blend.py` — red = render dark, green = source dark (both dark = black-ish...
- `metrics.py` — left silhouette edge x at given rows

### `scratch-build-s12rev2/` — comparison / review evidence scripts, 2 files
usage: crop.py frame.png ref.png x0 y0 x1 y1 out.jpg [scale] [grid]

- `crop.py` — usage: crop.py frame.png ref.png x0 y0 x1 y1 out.jpg [scale] [grid]
- `stats.py`
