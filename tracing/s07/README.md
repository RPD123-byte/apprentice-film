# s07 — 29.04–30.56 s: Over the shoulder again on Pure Imagination

Status **close (method caveat below; not signed off)**, method **traced** (see `docs/FIDELITY.md` and `docs/fidelity/s07.md`). The render code is `src/shots/s07.js` and `src/shots/s07/`.

## How the data in `src/shots/s07/` was made

The data files the render loads name the script that generated them in their header comment. Those scripts, at their new paths:

| producer script (in `tracing/`) | runtime files it produced |
|---|---|
| [`s07/src-s07/trace/prep.py`](src-s07/trace/prep.py) | `src/shots/s07/data/gains.js`, `src/shots/s07/data/plate.js` |
| [`s07/src-s07/tools/glyphs.py`](src-s07/tools/glyphs.py) | `src/shots/s07/imagGlyphs.js` |
| [`s07/src-s07/tools/handlines.py`](src-s07/tools/handlines.py) | `src/shots/s07/data/handlines.js` |
| [`s07/src-s07/trace/hands.py`](src-s07/trace/hands.py) | `src/shots/s07/data/hands.js` |
| [`s07/src-s07/trace/plate.py`](src-s07/trace/plate.py) | `src/shots/s07/data/plate.js` |
| [`s07/src-s07/trace/tojs.py`](src-s07/trace/tojs.py) | `src/shots/s07/data/hands.js` |

Scripts whose code writes into `src/shots/s07/` (found from the output paths in their source; `{…}` = a name filled in at run time):

| script (in `tracing/`) | writes |
|---|---|
| [`s07/src-s07/trace/build.sh`](src-s07/trace/build.sh) | `src/shots/s07/data` |

## Index of folders (13)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `src-s07/` — trace / measurement scripts that lived next to the shot data in src/ (not loaded by the render), 26 files
WORK/plate.json -> src/shots/s07/data/plate.js ; WORK/hands.json + hands_flow.npy -> src/shots/s07/data/hands.js

**Produced runtime data:** `src/shots/s07/imagGlyphs.js`, `src/shots/s07/data/gains.js`, `src/shots/s07/data/handlines.js`, `src/shots/s07/data/hands.js`, `src/shots/s07/data/plate.js`

- `trace/tojs.py` — WORK/plate.json -> src/shots/s07/data/plate.js ; WORK/hands.json + hands_flow.npy -> src/shots/s07/data/hands.js
- `tools/handlines.py` — handlines.py (s07 fix pass 1; not loaded by the film): the finger / hand outline edges of the hands on source frame 740 (BASE): pixels where a wide light area (skin) mee…
- `tools/glyphs.py` — Build src/shots/s07/imagGlyphs.js: outlines of the letters of "Imagination" from the OFL font Fraunces (assets/fonts/Fraunces-Variable.ttf) at fixed variation instances,…
- `trace/plate.py` — s07 static plate tracer (not loaded by the film): WORK/T.npy (prep.py) -> WORK/plate.json + WORK/plate_py.png.

### `trace-scripts-s07-dev/` — work folder, 1 file

- `perf.built.html`

### `trace-scripts-s07-fix1-dev/` — work folder, 3 files
crop compare: cc.py DIR x0 y0 x1 y1 scale out [idx] -> render \| ref side by side (or stacked if wide)

- `motion.py`
- `cc.py` — crop compare: cc.py DIR x0 y0 x1 y1 scale out [idx] -> render \| ref side by side (or stacked if wide)
- `reg.py`

### `trace-scripts-s07-fix1r-dev/` — work folder, 13 files
skin/hands: large bright blobs (open)

- `keyseg.py` — skin/hands: large bright blobs (open)
- `keyquad.py`
- `ht.html`
- `h.html`

### `trace-scripts-s07-p2-dev/` — work folder, 29 files
broad strokes: ridges at sigma 4 of the stroke-free image against the zone base

- `tr/proto3.py`
- `tr/proto2.py` — broad strokes: ridges at sigma 4 of the stroke-free image against the zone base
- `tr/proto4.py`
- `tr/proto5.py`

### `trace-scripts-s07-rev2-crops/` — measurement / study, 2 files
per-frame blurred MAE

- `motion.py` — per-frame blurred MAE
- `crop.py` — usage: crop.py render.png ref.png x0 y0 x1 y1 out.jpg [scale]

### `trace-scripts-s07-tools/` — tools, 7 files
Compare a render frame with the ref: blurred MAE, per-cell mean table, and an error heatmap image.

- `cmp.py` — Compare a render frame with the ref: blurred MAE, per-cell mean table, and an error heatmap image.
- `onion.py` — onion overlay: render edges (red) over source (grey) for a region, for alignment checks.
- `crops.py` — side-by-side (render \| ref) crops of named regions for close inspection.
- `gcrop.py` — grid crop of the source (or any image) : gcrop.py T\|img.png x0 y0 x1 y1 scale out [step]

### `snapshots-s07-bt/` — scripts, 24 files
fit curved petals (s07 page fan) to the hue classes of the rectified source mean (page units)

- `fanfit.py` — fit curved petals (s07 page fan) to the hue classes of the rectified source mean (page units)
- `imfit.py` — fit the arched "Imagination" layout (s07 page.js imaginationG) to the source's cream letter mask (page units)
- `m.html`
- `multi.mjs` — multi.mjs OUTDIR n0,n1,...

### `snapshots-s07-fix1-t/` — tools, 18 files
s07 keyboard: the key caps redrawn crisp over the static plate (fix pass 3).

- `bak/keys.js` — s07 keyboard: the key caps redrawn crisp over the static plate (fix pass 3).
- `bak/page.js` — s07's own copy of the laptop-view "Pure Imagination" page (from src/lib/pureimg.js, F3), re-measured for the laptop view of s07 on the rectified source screen (page unit…
- `bak/screen.js` — s07 laptop screen: the Pure Imagination page (src/lib/pureimg.js) warped onto the laptop's screen quad, with the selection and the note card, and the text typed into the…
- `bak/faces.js` — s07 plate surfaces re-rendered as line and grain (fix pass 3).

### `snapshots-s07-fix2-cmp/` — comparison / review evidence scripts, 19 files
s07's own copy of the laptop-view "Pure Imagination" page (from src/lib/pureimg.js, F3), re-measured for the laptop view of s07 on the rectified source screen (page unit…

- `tools/bak/page.js` — s07's own copy of the laptop-view "Pure Imagination" page (from src/lib/pureimg.js, F3), re-measured for the laptop view of s07 on the rectified source screen (page unit…
- `tools/bak/screen.js` — s07 laptop screen: the Pure Imagination page (src/lib/pureimg.js) warped onto the laptop's screen quad, with the selection and the note card, and the text typed into the…
- `tools/bak/faces.js` — s07 plate surfaces re-rendered as line and grain (fix pass 3).
- `tools/bak/handswarp.js` — s07 hands: the traced base frame (data/hands.js) warped per source frame by the measured backward flow (out(p) = base(p + flow_f(p)), flow bilinear on the GRID lattice, …

### `snapshots-s07-rev1-h/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 1 file
film.mjs OUTDIR t0,t1,... : load the real index.html (router + grade), call __film.renderAt(t) in order, time it, save the #film canvas

- `film.mjs` — film.mjs OUTDIR t0,t1,... : load the real index.html (router + grade), call __film.renderAt(t) in order, time it, save the #film canvas

### `snapshots-s07-rev2-cmp/` — comparison / review evidence scripts, 2 files
crop.py k x0 y0 x1 y1 scale out [run] -> render (top) \| source (bottom) crop, upscaled

- `review/crop.py` — crop.py k x0 y0 x1 y1 scale out [run] -> render (top) \| source (bottom) crop, upscaled
- `review/ev.py`

### `scratch-build/` — loose scripts from an agent scratchpad, 1 file

- `ids.mjs`
