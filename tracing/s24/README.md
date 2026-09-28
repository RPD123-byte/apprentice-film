# s24 — 97.08–100.48 s: Flurry of cuts, white flash, speed lines: the owl with scissors

Status **approx**, method **mixed** (see `docs/FIDELITY.md` and `docs/fidelity/s24.md`). The render code is `src/shots/s24.js` and `src/shots/s24/`.

## How the data in `src/shots/s24/` was made

Scripts whose code writes into `src/shots/s24/` (found from the output paths in their source; `{…}` = a name filled in at run time):

| script (in `tracing/`) | writes |
|---|---|
| [`s24/snapshots-s24d-h/tools/emit_lines.py`](snapshots-s24d-h/tools/emit_lines.py) | `src/shots/s24/d/lineData.js` |
| [`s24/snapshots-s24d-h/tools/linefill.py`](snapshots-s24d-h/tools/linefill.py) | `src/shots/s24/d/lineData.js`, `src/shots/s24/d/lineFill.js` |

Method notes written next to the trace code: [`src-s24/trace/README.md`](src-s24/trace/README.md).

## Index of folders (16)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `src-s24/` — trace / measurement scripts that lived next to the shot data in src/ (not loaded by the render), 34 files
Measurement scripts for s24 (not loaded by the film).

- `trace/track_lines.py` — Robust refinement of detected bars on the (pre-grade) source frame: perpendicular profiles every STEP px along each bar -> per-sample centroid, ink mass and peak; outlie…
- `vec.js` — Vector data decoders + painters for s24's measured drawings (see trace/README.md).
- `trace/tone.py` — Tone trace: a drawing (pre-grade luminance field, 0..255) inside a mask -> stacked iso-value contours.
- `trace/emit_F.py`

### `trace-scripts-s24-fix1-x/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 4 files
silhouette of the bright owl in source frame k (and optionally a render), IoU, contour polygon (approx) printed

- `sil.py` — silhouette of the bright owl in source frame k (and optionally a render), IoU, contour polygon (approx) printed
- `ev.py` — usage: ev.py OUTDIR k1,k2,...
- `lstat.py` — along-line run lengths above 50
- `g.py` — usage: g.py K out.jpg [x0 y0 x1 y1] [--step S] [--z Z] [--r render.png] gridded source frame k (optionally render stacked above)

### `trace-scripts-s24-harness/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 1 file
Copy of the composition’s index.html (+ hyperframes.json/meta.json) used to render this shot on its own; at the time `src/` and `assets/` were symlinked next to it, so the shot code it loaded is not duplicated here.

- `index.html` — The Apprentice — drawn in code

### `trace-scripts-s24-old-v1/` — copy of the shot build before a pass, 4 files
The owls of s24. Head, body, tail, feet and headphones come from the owl kit (src/lib/owlInk.js) with wings switched off; the wings are painted feather by feather from m…

- `owls.js` — The owls of s24. Head, body, tail, feet and headphones come from the owl kit (src/lib/owlInk.js) with wings switched off; the wings are painted feather by feather from m…
- `wing.js` — Spread wings drawn feather by feather in frame px, from measured feather tips (the kit's spread wing is a simple paddle fan; the s24 close-ups show every primary).
- `shears.js` — Scissors for s24 (frame px, Canvas2D): long silver dressmaker's shears as the source draws them in the flurry — near-white blades with a thin dark keyline and a dark bev…
- `lines.js` — Speed lines for s24 (frame px): long soft streaks running down-right, tapering at both ends.

### `trace-scripts-s24-rev1-x/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 3 files
sheet.py out.jpg dir1 [dir2 ...] [--k k0 k1] [--w 700] : pairs render\|source (true 25fps frame, via floor-30 rule)

- `sheet.py` — sheet.py out.jpg dir1 [dir2 ...] [--k k0 k1] [--w 700] : pairs render\|source (true 25fps frame, via floor-30 rule)
- `gcrop.py` — gcrop.py render.png srcidx out.jpg x0 y0 x1 y1 [step] [--w W] : side by side (render \| source) crop with grid
- `vs.py` — usage: vs.py render.png srcidx out.jpg [x0 y0 x1 y1] [--w W] (stack render over source, crop)

### `trace-scripts-s24-study/` — measurement / study, 9 files
track a region (ROI at ref frame) through the extracted frames with ORB+RANSAC similarity

- `track.py` — track a region (ROI at ref frame) through the extracted frames with ORB+RANSAC similarity
- `shards.py` — remove owl regions
- `shards2.py` — arc polyline (frame px) - rough, from the mask
- `scsheet.py`

### `trace-scripts-s24-tools/` — tools, 6 files
Per-frame draw timing for s24 in headless Chrome (no server: requests to http://s24.local/ are answered from disk by request interception).

- `timing.mjs` — Per-frame draw timing for s24 in headless Chrome (no server: requests to http://s24.local/ are answered from disk by request interception).
- `bench.mjs`
- `hpair.py`
- `metric.py` — mean \|render - source\| (luminance) after Gaussian blur, at 1/4 size (σ in 1/4-size px) and at full size σ1

### `prev-builds-s24-prev/` — an earlier build of the shot that a later pass replaced (kept for reference), 2 files
s24 (97.08–100.48): the flurry.

- `s24.traced.js` — s24 (97.08–100.48): the flurry.

### `snapshots-end-s24-tfix-final/` — the shot build after a pass (+ the scripts used in it), 14 files
s24 targeted fix (ending critic: the big owl on speed lines at 98.52 and the dive at 99.52 were flat white shapes with

- `tools/inkcov.py` — inkcov.py RDIR k name:x0,y0,x1,y1 ...
- `tools/shoot2.mjs` — Fast local renderer for the s24 harness (no server): headless Chrome over a pipe, file:// page.
- `tools/beats.py` — beats.py DIR_A DIR_B [k0 k1] -> per-beat mean abs diff vs source (sigma 1 / 4 / 12) for two render dirs
- `tools/edge.py` — edge.py RDIR k x0 y0 x1 y1 scale out.jpg -> source (grey) with the render's dark ink lines in red, source ink in cyan

### `snapshots-s24d-h/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 27 files
s24 (drawn pass) measuring scripts

**Writes into:** `src/shots/s24/d/lineData.js`, `src/shots/s24/d/lineFill.js`

- `tools/emit_lines.py`
- `tools/linefill.py` — Synthetic filler bars for the speed-line sets A, B, C: drop the stub clusters / fat capsules left where the F owl was masked out when the sets were measured, then add se…
- `tools/sil2.py` — measured silhouettes + notches (concave corners between feathers) for a plate; writes meas/<name>.json + .jpg usage: sil2.py plate thr eps name x0 y0 x1 y1 [minArea] [K]
- `tools/emit_sil.py` — write measured silhouettes (simplified outline polygons + notch points) as a JS module (integer coords)

### `scratch-build/` — loose scripts from an agent scratchpad, 6 files
backgrounds: render frames from snapshots/s21-rev1-a at 70.0 (owl low-left) and 74.4 (owl top)

- `mask.py` — backgrounds: render frames from snapshots/s21-rev1-a at 70.0 (owl low-left) and 74.4 (owl top)
- `holes.py` — fill holes
- `geo.mjs`
- `pairs.py` — usage: pairs.py dir out.jpg [x0 y0 x1 y1] [--w W] -> for each frame-*.png/ref-*.png pair: crop, stack render above source

### `scratch-build-s24/` — scripts, 10 files
measured silhouette outline(s) of the bright figure on a plate, simplified to a polygon (coordinates only) usage: sil.py plate thr eps out x0 y0 x1 y1 [minArea] [open]

- `sil.py` — measured silhouette outline(s) of the bright figure on a plate, simplified to a polygon (coordinates only) usage: sil.py plate thr eps out x0 y0 x1 y1 [minArea] [open]
- `lstat.py` — local max in y
- `lprof.py` — take contiguous valid segment
- `lrun.py` — both ends must be real ends: next pixel valid and not excluded

### `scratch-build-s24fix1/` — work folder, 4 files
sil.py file.js -> dict name -> {'pts':[...], 'notch':[...]}

- `sil.py` — sil.py file.js -> dict name -> {'pts':[...], 'notch':[...]}
- `ovl.py` — ovl.py k silfile NAME[,NAME] dx dy x0 y0 x1 y1 scale out.jpg
- `cmp.py` — pair renders kNN.png with source frames; print MAE; write pair images (render \| source) and a sheet
- `crop.py` — crop.py dir k x0 y0 x1 y1 out.jpg [scale] [--v] : render \| source crop side by side (or stacked with --v); grid every 50px

### `scratch-build-s24p2/` — work folder, 15 files
Speed-line trace v2: components in the frame rotated to the median line angle; each component is fitted as one straight bar (PCA of its bright pixels: endpoints, ink-mas…

- `work/dev/lines2.py` — Speed-line trace v2: components in the frame rotated to the median line angle; each component is fitted as one straight bar (PCA of its bright pixels: endpoints, ink-mas…
- `work/dev/strokes.py` — Fine dark ink strokes the tone levels miss: residual of (tone raster, softened like the film) minus the plate, Hessian ridge measure on the plate, hysteresis threshold, …
- `work/dev/prev_strokes.py`
- `work/dev/testlines2.py`

### `scratch-build-s24rev/` — comparison / review evidence scripts, 7 files
best matching source frame (timing check) among k-3..k+3

- `metrics.py` — best matching source frame (timing check) among k-3..k+3
- `run.sh`
- `bb.mjs`
- `pairs.py`

### `scratch-ending/` — loose scripts from an agent scratchpad, 2 files
s24 speed lines, fix pass 1: repairs to the measured sets A, B, C (lineData.js).

- `lineFill.full.js` — s24 speed lines, fix pass 1: repairs to the measured sets A, B, C (lineData.js).
- `variant.sh` — variant.sh SMEAR STREAKS KS OUT
