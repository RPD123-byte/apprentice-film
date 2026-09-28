# s23 — 84.04–97.08 s: Carries the strip away, brings the colour banner, slaps it on, glows

Status **approx**, method **drawn** (see `docs/FIDELITY.md` and `docs/fidelity/s23.md`). The render code is `src/shots/s23.js` and `src/shots/s23/`.

## How the data in `src/shots/s23/` was made

Scripts whose code writes into `src/shots/s23/` (found from the output paths in their source; `{…}` = a name filled in at run time):

| script (in `tracing/`) | writes |
|---|---|
| [`s23/src-s23/trace/emit.py`](src-s23/trace/emit.py) | `src/shots/s23/cels.js` |

Method notes written next to the trace code: [`src-s23/trace/README.md`](src-s23/trace/README.md).

## Index of folders (16)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `src-s23/` — trace / measurement scripts that lived next to the shot data in src/ (not loaded by the render), 29 files
Measurement scripts for s23 (not loaded by the film).

**Writes into:** `src/shots/s23/cels.js`

- `trace/emit.py` — cels/*.json -> src/shots/s23/cels.js (compact strings; see celdraw.js for the decoder)
- `trace/cel.py` — trace one source frame's foreground (everything that is not the page, strip or banner) into a vector cel: posterised fills (nested level regions, each one flat colour) +…
- `celdraw.js` — s23 cel renderer: decodes the traced foreground cels (cels.js) into Path2D level fills and paints them.
- `trace/dissfit.py` — full-res similarity -> half-res: x' = SC*(a*(x/SC) - b*(y/SC) + tx)

### `prev-builds-s23r-prev/` — an earlier build of the shot that a later pass replaced (kept for reference), 2 files
s23 (84.04–97.08): the page framed on the lit screen.

- `s23.traced.js` — s23 (84.04–97.08): the page framed on the lit screen.

### `snapshots-end-s23-tfix-final/` — the shot build after a pass (+ the scripts used in it), 11 files
s23 targeted fix (2026-09-27): final comparison.

- `tools/shoot.mjs` — end-critic renderer (copy of end-s28-fix1 harness shoot.mjs, live tree): loads the REAL composition (index.html -> src/main.js) in the same headless Chrome and flags hyp…
- `tools/r.py` — r.py k out.jpg x0 y0 x1 y1 [scale] [dir] : crop with border rulers (ticks every 10 px, labels every 50) + faint 50-px grid
- `tools/g.py` — g.py k out.jpg x0 y0 x1 y1 [scale] [step] [dir] : source frame k (or dir/k.png) crop with a labelled grid in frame px
- `tools/reg.py` — reg.py DIR1 DIR2 ... --ks k1,k2 --box x0,y0,x1,y1 : region mean abs RGB diff (blur s4) vs source per dir

### `snapshots-s23-fix1-tools/` — tools, 7 files
axis-aligned ellipse: A x^2 + C y^2 + D x + E y = 1

- `ringfit.py` — axis-aligned ellipse: A x^2 + C y^2 + D x + E y = 1
- `shards.py`
- `cp.py` — cp.py render.png k x0 y0 x1 y1 out.jpg [scale] : render crop \| source crop with ticks (source frame k)
- `redate.py`

### `snapshots-s23-fix2-tools/` — tools, 4 files
emap.py render.png k x0 y0 x1 y1 out.jpg [scale]: blurred(σ8) render \| blurred source \| signed error (red = render brighter, blue = darker)

- `emap.py` — emap.py render.png k x0 y0 x1 y1 out.jpg [scale]: blurred(σ8) render \| blurred source \| signed error (red = render brighter, blue = darker)
- `ov.py` — ov.py render.png k x0 y0 x1 y1 out.jpg [scale] : render \| source \| overlay (render=magenta, source=green) with a grid every 50 px
- `stretch.py` — stretch.py log : mean blurred MAE per beat stretch from a pair.py log
- `reg.py` — reg.py dir k1,k2.. : blurred (σ8) abs error split by region (share of the frame total and mean inside)

### `snapshots-s23-fix2x-final/` — the shot build after a pass (+ the scripts used in it), 14 files
pair.py OUTDIR spec : render exact source frames k (ceil(k*1.2)/30+0.0005) and pair render\|source (vertical), MAE8

- `tools/pair.py` — pair.py OUTDIR spec : render exact source frames k (ceil(k*1.2)/30+0.0005) and pair render\|source (vertical), MAE8
- `tools/emap.py` — emap.py render.png k x0 y0 x1 y1 out.jpg [scale]: blurred(σ8) render \| blurred source \| signed error (red = render brighter, blue = darker)
- `tools/ov.py` — ov.py render.png k x0 y0 x1 y1 out.jpg [scale] : render \| source \| overlay (render=magenta, source=green) with a grid every 50 px
- `tools/grid.py` — grid.py k x0 y0 x1 y1 out.jpg [scale] [render.png]: source crop (and render crop) with a labelled 50 px grid

### `snapshots-s23-rev2-ex/` — comparison / review evidence scripts, 4 files
pair.py OUTDIR spec : render exact source frames k (ceil(k*1.2)/30+0.0005) and pair render\|source (vertical), MAE8

- `tools/pair.py` — pair.py OUTDIR spec : render exact source frames k (ceil(k*1.2)/30+0.0005) and pair render\|source (vertical), MAE8
- `tools/sheet.py` — sheet.py DIR out.jpg k1,k2,..
- `tools/crop.py` — crop.py DIR out.jpg x0 y0 x1 y1 k1,k2,...
- `tools/reg.py`

### `snapshots-s23r-gal/` — tracing / fitting, 3 files
render spec pages: run.sh 0,1,2 outdir

- `index.html` — s23 fit scratch
- `spec.js`
- `run.sh` — render spec pages: run.sh 0,1,2 outdir

### `snapshots-s23r-tools/` — tools, 10 files
s23 rebuild (this pass) — measuring and comparison scripts.

- `fit.py` — fit.py render.png k x0 y0 x1 y1 out.jpg [plate=B\|H] [thr] silhouette check of a render (owl on black) against the source owl (difference from the clean plate): IoU, bbox…
- `pair.py` — pair.py OUTDIR k1,k2,... \| kA-kB[:step] render the exact source frames k (25 fps) through the film and pair render \| source; render time = ceil(k*1.2)/30 + 0.0005 so the…
- `crop3.py` — crop3.py k x0 y0 x1 y1 out.jpg [scale]: source crop with frame-px tick labels every 20 px
- `score.py` — score.py outdir "page k x0 y0 x1 y1 name plate [white]" ...

### `scratch-build/` — loose scripts from an agent scratchpad, 11 files
even-odd: xor each ring

- `celmask.py` — even-odd: xor each ring
- `trk.py` — args: tref x0 y0 x1 y1 t0 t1 step [sx0 sy0 sx1 sy1 search roi]
- `reg.py`
- `xpair.py` — xpair.py OUTDIR k1,k2,... render exact source frames k (via the 1/30 snapshot grid) and pair with source frame k

### `scratch-build-s23/` — scripts, 4 files
cmpmask.py DIR PLATE_T x0 y0 x1 y1 : owl-mask centroid/bbox in render vs source, each against its own plate frame

- `cmpmask.py` — cmpmask.py DIR PLATE_T x0 y0 x1 y1 : owl-mask centroid/bbox in render vs source, each against its own plate frame
- `owlpos.py`
- `crop.py` — crop.py DIR x0 y0 x1 y1 [W] [out] -> side-by-side crops (render \| source) stacked
- `err.py` — err.py DIR : mean \|blurred luminance\| error render vs source per frame (σ8), whole frame and top/owl regions

### `scratch-build-s23-rev1-own/` — comparison / review evidence scripts, 2 files
pv.py OUT k[,k...] [x0 y0 x1 y1] [--w W] [--h] stacked render\|source (exact frames) crops

- `pv.py` — pv.py OUT k[,k...] [x0 y0 x1 y1] [--w W] [--h] stacked render\|source (exact frames) crops
- `exact.py` — render exact source frames k through the film: t = ceil(k*1.2)/30 + 0.0005 (the snapshot seek floors to 1/30 s)

### `scratch-build-s23fix/` — work folder, 1 file
reg.py DIR k1,k2 "x0 y0 x1 y1" ["x0 y0 x1 y1" ...] -> mean luminance render vs source per box

- `reg.py` — reg.py DIR k1,k2 "x0 y0 x1 y1" ["x0 y0 x1 y1" ...] -> mean luminance render vs source per box

### `scratch-build-s23g/` — scripts, 23 files
trace one source frame's foreground (everything that is not the page, strip or banner) into a vector cel: posterised fills (nested level regions, each one flat colour) +…

- `cel.py` — trace one source frame's foreground (everything that is not the page, strip or banner) into a vector cel: posterised fills (nested level regions, each one flat colour) +…
- `dissfit.py` — full-res similarity -> half-res: x' = SC*(a*(x/SC) - b*(y/SC) + tx)
- `ungrade.py`
- `plates.py` — ungraded clean plates (per-pixel medians of source frames), saved as npy

### `scratch-build-s23rev1/` — comparison / review evidence scripts, 5 files
usage: pairs.py snapdir outdir [crop x0 y0 x1 y1] [--w W]

- `pairs.py` — usage: pairs.py snapdir outdir [crop x0 y0 x1 y1] [--w W]
- `csheet.py` — csheet.py snapdir framesfile "n1,n2,..." x0 y0 x1 y1 out [--w W] -> rows: render \| source
- `crop.py` — crop.py snapdir framesfile n x0 y0 x1 y1 out [--stack v\|h] [--scale s]
- `sstrip.py` — sstrip.py n0 n1 step out.jpg [x0 y0 x1 y1] [--cols N --w W]

### `scratch-ending/` — loose scripts from an agent scratchpad, 1 file
usage: sheet.py out.jpg rdir rprefix F1,F2,...

- `sheet.py` — usage: sheet.py out.jpg rdir rprefix F1,F2,...
