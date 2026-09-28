# s05 — 23.12–26.72 s: Over the shoulder: typing; the laptop goes from his site to Pure Imagination

Status **approx**, method **drawn** (see `docs/FIDELITY.md` and `docs/fidelity/s05.md`). The render code is `src/shots/s05.js` and `src/shots/s05/`.

## How the data in `src/shots/s05/` was made

The data files the render loads name the script that generated them in their header comment. Those scripts, at their new paths:

| producer script (in `tracing/`) | runtime files it produced |
|---|---|
| [`s05/snapshots-s05-fix1d-study/fitfield.py`](snapshots-s05-fix1d-study/fitfield.py) | `src/shots/s05/drawn/` (8 files: deskvals.js, deskvalsP.js, figvals.js, …) |
| [`s05/snapshots-s05-fix1d-study/fitfaces.py`](snapshots-s05-fix1d-study/fitfaces.py) | `src/shots/s05/drawn/roomvals.js` |
| [`s05/snapshots-s05-fix2-study/tonefit.py`](snapshots-s05-fix2-study/tonefit.py) | `src/shots/s05/drawn/tonegrid.js` |
| [`s05/src-s05/trace/export_settle.py`](src-s05/trace/export_settle.py) | `src/shots/s05/data/settle.js` |
| [`s05/src-s05/trace/settle_fit.py`](src-s05/trace/settle_fit.py) | `src/shots/s05/data/settle.js` |
| [`s05/trace-scripts-s05-study/overlay.py`](trace-scripts-s05-study/overlay.py) | `src/shots/s05/trace.js` |

Scripts whose code writes into `src/shots/s05/` (found from the output paths in their source; `{…}` = a name filled in at run time):

| script (in `tracing/`) | writes |
|---|---|
| [`s05/trace-scripts-s05-fix1n-study/export_vis.py`](trace-scripts-s05-fix1n-study/export_vis.py) | `src/shots/s05/data/vis.js` |

Method notes written next to the trace code: [`src-s05/legacy/README.md`](src-s05/legacy/README.md), [`src-s05/trace/README.md`](src-s05/trace/README.md).

## Index of folders (21)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `src-s05/` — trace / measurement scripts that lived next to the shot data in src/ (not loaded by the render), 46 files
The first s05 drawing (procedural plates painted from traced geometry, fix pass 1).

**Produced runtime data:** `src/shots/s05/data/settle.js`

- `trace/settle_fit.py` — Camera-settle motion fields (23.12-23.52), measurement only -> ../data/settle.js For each settle frame and each layer: the layer's similarity model (SETTLE in ../../s05.…
- `trace/export_settle.py` — ../data/settle.js from CACHE/settle_fields.json (settle_fit.py): per layer a grid of displacement vectors per settle frame
- `trace/build.py` — s05 ink build (measurement pipeline; its output is ../data/*.js, drawn by ../ink.js).
- `trace/strokefit.py` — Stroke rasterisation (anti-aliased coverage, like a canvas fill) + the joint value-study / stroke-value fit.

### `trace-scripts-s05-dev/` — work folder, 2 files
Dev harness (scratch): render a project-relative test page in headless Chrome (files served by request interception, no server) and screenshot the #c canvas.

- `dev.mjs` — Dev harness (scratch): render a project-relative test page in headless Chrome (files served by request interception, no server) and screenshot the #c canvas.
- `time.built.html`

### `trace-scripts-s05-fix1-dev/` — work folder, 1 file

- `bnd.built.html`

### `trace-scripts-s05-fix1-study/` — measurement / study, 9 files
lines.py img x0 y0 x1 y1 thr minlen out.jpg [mask-poly-json]: skeletonise dark ink lines inside a region and print them as simplified polylines (a tracing aid: coordinat…

- `lines.py` — lines.py img x0 y0 x1 y1 thr minlen out.jpg [mask-poly-json]: skeletonise dark ink lines inside a region and print them as simplified polylines (a tracing aid: coordinat…
- `reg.py` — reg.py frame.png ref.png -> region mean luminance render/source for the reviewer's regions
- `edgeov.py` — edgeov.py render.png src.png x0 y0 x1 y1 scale out.jpg : source edges red, render edges green, over the source (dim)
- `t.py` — t.py img x0 y0 x1 y1 scale out [step]: crop with edge ticks every step px (default 10, labels every 50)

### `trace-scripts-s05-fix1n-proj/` — tracing / fitting, 2 files

- `index.html` — s05 scratch

### `trace-scripts-s05-fix1n-study/` — measurement / study, 14 files
export_vis.py: the traced-visible masks (the part of a layer the tracer saw) of some layers, inside sub-boxes, as rings (same packing as trace/export.py) -> src/shots/s0…

**Writes into:** `src/shots/s05/data/vis.js`

- `export_vis.py` — export_vis.py: the traced-visible masks (the part of a layer the tracer saw) of some layers, inside sub-boxes, as rings (same packing as trace/export.py) -> src/shots/s0…
- `pairs.py` — pairs.py OUTDIR [u] : pair frames rendered by rend.sh with the source frame k; print blurred MAE; write pair-k.jpg
- `errmap.py` — errmap.py OUTDIR k [cell] [u] : sigma-2 abs error (graded levels) per cell; prints the grid and the top cells; writes err-k.jpg
- `shiftmap.py` — shiftmap.py OUTDIR k [T] : phase-correlation shift (render vs source) per tile for exact frame k from rend.sh output

### `trace-scripts-s05-p2-proj/` — tracing / fitting, 3 files

- `inktest.js`
- `index.html` — s05 scratch

### `trace-scripts-s05-p2-proj2/` — tracing / fitting, 2 files

- `index.html`

### `trace-scripts-s05-p2-proj3/` — tracing / fitting, 2 files
The Apprentice — drawn in code

- `index.html` — The Apprentice — drawn in code

### `trace-scripts-s05-p2-study/` — measurement / study, 32 files
p' = C + d + R S (p - C)

- `scrfit2.py`
- `layerseg.py` — p' = C + d + R S (p - C)
- `lightfit.py` — s = r*(g0 + A*w): least squares for g0, A
- `flowtest.py` — flow from frame -> static? we want for each settled pixel p where it is in frame k: flow(S -> F)

### `trace-scripts-s05-rev1-proj/` — comparison / review evidence scripts, 1 file
The Apprentice — drawn in code

- `index.html` — The Apprentice — drawn in code

### `trace-scripts-s05-study/` — measurement / study, 16 files
overlay traced shapes from src/shots/s05/trace.js on the source frame (measuring aid only) usage: overlay.py T x0 y0 x1 y1 Z out.jpg [NAME ...] (no names = all)

**Produced runtime data:** `src/shots/s05/trace.js`

- `overlay.py` — overlay traced shapes from src/shots/s05/trace.js on the source frame (measuring aid only) usage: overlay.py T x0 y0 x1 y1 Z out.jpg [NAME ...] (no names = all)
- `track3.py`
- `track2.py`
- `track.py`

### `prev-builds-s05-fix1d-prev/` — an earlier build of the shot that a later pass replaced (kept for reference), 4 files
s05's copy of the laptop-view "Pure Imagination" page.

- `pure.js` — s05's copy of the laptop-view "Pure Imagination" page.
- `s05.js` — s05 (23.12–26.72): over his shoulder.
- `screen.js` — s05 laptop screen, frame by frame from the rectified source screen (snapshots/s05-study/rect*.jpg, luminance per frame in page columns): –23.68 his own site (sōko, "MIXI…

### `snapshots-s05-fix1d-proj/` — tracing / fitting, 4 files
shot-only scratch driver for s05 (fix1d): scratch time P -> source frame k = 578 + round(P*30), graded, for P < 10; P >= 10: the same frame (P-10) drawn UNGRADED (the sh…

- `scratch.js` — shot-only scratch driver for s05 (fix1d): scratch time P -> source frame k = 578 + round(P*30), graded, for P < 10; P >= 10: the same frame (P-10) drawn UNGRADED (the sh…
- `index.html` — The Apprentice — drawn in code
- `sel.js`

### `snapshots-s05-fix1d-study/` — measurement / study, 28 files
fitfield.py REGIONS.json OUT.js NAME [REF]: for each region {name: {"poly": [[x,y]...], "S": spacing px (>= 40)}} fit a coarse value grid (bilinear, spacing S, Laplacian…

**Produced runtime data:** `src/shots/s05/drawn/` (9 files: deskvals.js, deskvalsP.js, figvals.js, …)

- `fitfield.py` — fitfield.py REGIONS.json OUT.js NAME [REF]: for each region {name: {"poly": [[x,y]...], "S": spacing px (>= 40)}} fit a coarse value grid (bilinear, spacing S, Laplacian…
- `fitfaces.py` — fitfaces.py FACES.json OUT.js NAME [REF]: fit a value grid (pre-grade, blurred sigma 4) to every face of FACES.json on the ungraded reference; writes OUT.js: export cons…
- `tonefit.py` — tonefit.py RAW_RENDER.png [--S=48] [--lam=1] [--sig=16] [--reset]: fit a smooth gain grid G (frame px, spacing S) so that blur(render * G) ~ blur(source) (both pre-grade…
- `inkline.py` — inkline.py REF x0 y0 x1 y1 OUT [--dark\|--light] [--thr=T] [--eps=E] [--min=L] [--sig=S] Centre-lines of the ink lines in a crop of the ungraded reference (black-hat / wh…

### `snapshots-s05-fix2-study/` — measurement / study, 8 files
tonefit.py RAW_RENDER.png [--S=48] [--lam=1] [--sig=16] [--reset]: fit a smooth gain grid G (frame px, spacing S) so that blur(render * G) ~ blur(source) (both pre-grade…

**Produced runtime data:** `src/shots/s05/drawn/tonegrid.js`

- `tonefit.py` — tonefit.py RAW_RENDER.png [--S=48] [--lam=1] [--sig=16] [--reset]: fit a smooth gain grid G (frame px, spacing S) so that blur(render * G) ~ blur(source) (both pre-grade…
- `sweep2.py` — sweep2.py DIR...: sigma-1/2/4 blurred MAE of every kNNN.png vs source frame NNN, whole / outside screen / screen, summarised by part of the shot, plus region sigma-2 at …
- `featherov.py` — featherov.py SPEC.json OUT.jpg x0 y0 x1 y1 [scale]: draw feather outlines (root, tip, width, bend) and polylines over the reference crop, to check authored geometry agai…
- `merr.py` — merr.py DIR: for every kNNN.png in DIR, blurred (sigma 2) MAE vs source frame NNN, whole / outside screen / regions

### `snapshots-s05-p3-perf/` — measurement / study, 3 files
The Apprentice — drawn in code

- `index.html` — The Apprentice — drawn in code
- `perf.js` — timing driver (scratch only): P -> frame k = 578 + round(P*30); first build cost, then mean of 4 redraws, printed on the frame

### `snapshots-s05-p3-proj/` — tracing / fitting, 2 files
shot-only scratch driver for s05: scratch time P -> source frame k = 578 + round(P*30) (graded) for P < 10, k = 578 + round((P-10)*30) ungraded for P >= 10.

- `scratch.js` — shot-only scratch driver for s05: scratch time P -> source frame k = 578 + round(P*30) (graded) for P < 10, k = 578 + round((P-10)*30) ungraded for P >= 10.

### `snapshots-s05-p3-study/` — measurement / study, 17 files
cells.py DIR k [k...]: grid of mean (render - source) per 100x80 cell (blurred luminance)

- `cells.py` — cells.py DIR k [k...]: grid of mean (render - source) per 100x80 cell (blurred luminance)
- `orig/pure.js` — s05's copy of the laptop-view "Pure Imagination" page.
- `orig/s05.js` — s05 (23.12–26.72): over his shoulder.
- `orig/screen.js` — s05 laptop screen, frame by frame from the rectified source screen (snapshots/s05-study/rect*.jpg, luminance per frame in page columns): –23.68 his own site (sōko, "MIXI…

### `scratch-build/` — loose scripts from an agent scratchpad, 12 files
s05's copy of the laptop-view "Pure Imagination" page.

- `pure.new.js` — s05's copy of the laptop-view "Pure Imagination" page.
- `s05_tables.js` — source, trace/track.py). The left hand (LH_SET: [t, dx, dy, scale, rot (deg)] about C_L) is still after 23.52.
- `screen.new.js` — s05 laptop screen, frame by frame from the rectified source screen (snapshots/s05-study/rect*.jpg, luminance per frame in page columns): –23.68 his own site (sōko, "MIXI…
- `fld.mjs` — lh displacement of point p under similarity about C_L

### `scratch-build-s05rev1x/` — comparison / review evidence scripts, 7 files
crop.py dir P x0 y0 x1 y1 out [k\|-] [scale]

- `match.py`
- `shiftmap.py`
- `crop.py` — crop.py dir P x0 y0 x1 y1 out [k\|-] [scale]
- `scrstats.py`
