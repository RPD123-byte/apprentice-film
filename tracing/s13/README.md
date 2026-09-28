# s13 — 35.36–36.92 s: Owl startled

Status **approx**, method **drawn** (see `docs/FIDELITY.md` and `docs/fidelity/s13.md`). The render code is `src/shots/s13.js` and `src/shots/s13/`.

## How the data in `src/shots/s13/` was made

The data files the render loads name the script that generated them in their header comment. Those scripts, at their new paths:

| producer script (in `tracing/`) | runtime files it produced |
|---|---|
| [`s13/src-s13/trace/outlines.py`](src-s13/trace/outlines.py) | `src/shots/s13/silC.js`, `src/shots/s13/silD.js` |
| [`s13/snapshots-s13-fix1-tools/caltone.py`](snapshots-s13-fix1-tools/caltone.py) | `src/shots/s13/flowCal.js` |
| [`s13/snapshots-s13-fix1-tools/fitline.py`](snapshots-s13-fix1-tools/fitline.py) | `src/shots/s13/wingC.js` |
| [`s13/snapshots-s13-fix1-tools/flow.py`](snapshots-s13-fix1-tools/flow.py) | `src/shots/s13/fur.js` |
| [`s13/snapshots-s13-fix1-tools/gen_flow.py`](snapshots-s13-fix1-tools/gen_flow.py) | `src/shots/s13/flowM.js` |
| [`s13/snapshots-s13-fix1-tools/gen_zones.py`](snapshots-s13-fix1-tools/gen_zones.py) | `src/shots/s13/zonesM.js` |
| [`s13/snapshots-s13-fix1-tools/strokestats.py`](snapshots-s13-fix1-tools/strokestats.py) | `src/shots/s13/flowM.js` |
| [`s13/snapshots-s13-fix1-tools/tonefit.py`](snapshots-s13-fix1-tools/tonefit.py) | `src/shots/s13/toneF.js` |
| [`s13/snapshots-s13-w3-tools/sheen.py`](snapshots-s13-w3-tools/sheen.py) | `src/shots/s13/sheenC.js` |
| [`s13/src-s13/trace/ecc_all.py`](src-s13/trace/ecc_all.py) | `src/shots/s13/placeC.js` |
| [`s13/src-s13/trace/farwing.py`](src-s13/trace/farwing.py) | `src/shots/s13/silX.js` |
| [`s13/src-s13/trace/feet.py`](src-s13/trace/feet.py) | `src/shots/s13/silX.js` |

Method notes written next to the trace code: [`src-s13/trace/README.md`](src-s13/trace/README.md).

## Index of folders (9)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `src-s13/` — trace / measurement scripts that lived next to the shot data in src/ (not loaded by the render), 51 files
Measurement scripts for s13 (not loaded by the film).

**Produced runtime data:** `src/shots/s13/placeC.js`, `src/shots/s13/silC.js`, `src/shots/s13/silD.js`, `src/shots/s13/silX.js`

- `trace/ecc_all.py` — ecc_all.py silC.json silD.json feet.json out.json — per-frame placement of every part layer, measured on the source: an affine ECC fit (image-gradient alignment, 1.5 px …
- `trace/outlines.py` — outlines.py src.png geo.json out.json dbg.png feet.json — measured part silhouettes for pose C.
- `trace/feet.py` — feet.py src.png out.json dbg.png — measured talons of pose C: lit outline rings (with the black gaps between the toes), the flat mid-grey shading shapes inside them, and…
- `trace/farwing.py` — farwing.py frame silC.json ecc.json box out.json dbg.png — the far wing in poses A (884) / B (886): the lit pixels of that source frame, inside a box left of the head, t…

### `snapshots-s13-fix1-orig/` — copy of the shot build before a pass, 1 file
Owl startled (35.36–36.92): a big close-up of the owl on black — saucer eyes with pin-prick pupils, a sweat drop, beak hanging open, one wing flung up and out to the rig…

- `s13.js` — Owl startled (35.36–36.92): a big close-up of the owl on black — saucer eyes with pin-prick pupils, a sweat drop, beak hanging open, one wing flung up and out to the rig…

### `snapshots-s13-fix1-tools/` — tools, 31 files
gen_zones.py : measure the cel tone zones (zones.py's rule) for every part / pose -> src/shots/s13/zonesM.js

**Produced runtime data:** `src/shots/s13/` (6 files: flowCal.js, flowM.js, fur.js, …)

- `gen_zones.py` — gen_zones.py : measure the cel tone zones (zones.py's rule) for every part / pose -> src/shots/s13/zonesM.js
- `gen_flow.py` — gen_flow.py : run the coarse fur statistics (flow.py's measure) for every part / pose and write src/shots/s13/flowM.js (anchors [x, y, angle, coherence, coverage, depth]…
- `tonefit.py` — tonefit.py RENDERDIR FRAME PART[,PART...] [--gain 0.8] : refit the parts' cubic value study (src/shots/s13/toneF.js) from the render's residual: (source - render) in pre…
- `caltone.py` — caltone.py RENDERDIR FRAME PART[,PART...] [--k 6] : per-anchor density multipliers (src/shots/s13/flowCal.js) nudged so the sigma-8 tone of the render meets the source's…

### `snapshots-s13-fix2-tools/` — tools, 8 files
inkstats.py DIR frame : per-region ink coverage (<110 within lit area), high-pass (sigma 1.5) std, whites (>=225) for render vs source

- `inkstats.py` — inkstats.py DIR frame : per-region ink coverage (<110 within lit area), high-pass (sigma 1.5) std, whites (>=225) for render vs source
- `wingov.py` — wingov.py x0 y0 x1 y1 scale out [extra.json] : source C hold (median 891-898) with the existing WINGLINES / TAILLINES in red
- `pz.py` — pz.py DIR frame x0 y0 x1 y1 scale out.jpg [grid] [--v] : render (DIR/r<f>.png) \| source crop, magnified with grid
- `litov.py` — litov.py DIR frame x0 y0 x1 y1 scale out.jpg [thr=70]: lit-mask overlay: both lit = grey (source value), source-only = green, render-only = magenta

### `snapshots-s13-w3-lab/` — measurement / study, 1 file

- `index.html` — s13 timing lab

### `snapshots-s13-w3-tools/` — tools, 21 files
sheen.py : the wing's bright vane streaks on the C hold (median 891-898, sigma 1.5 > THR inside the wing silhouette), each fitted as a tapered centre-line: points along …

**Produced runtime data:** `src/shots/s13/sheenC.js`

- `sheen.py` — sheen.py : the wing's bright vane streaks on the C hold (median 891-898, sigma 1.5 > THR inside the wing silhouette), each fitted as a tapered centre-line: points along …
- `celcal_all.py` — celcal_all.py OUT lift_in.json lift_out.json [damp] : per cel trace and posterised level, mean render - source inside its groups (eroded 1 px) on the frames where that t…
- `trackall.py` — trackall.py OUT : every part's template (C hold median) tracked in source and render, all C-based frames; prints render - source placement error (px, deg) where the temp…
- `celcal.py` — celcal.py OUT key f0 f1 : per posterised level of a cel trace, mean render vs source inside its groups (eroded 1px)

### `scratch-build/` — loose scripts from an agent scratchpad, 13 files
celview.py cel.json name x0 y0 x1 y1 zoom out.png [ref.png] -- paint a cel trace (flat pre-grade values, no grade) beside the ref

- `calib.py`
- `regtrack.py`
- `celview.py` — celview.py cel.json name x0 y0 x1 y1 zoom out.png [ref.png] -- paint a cel trace (flat pre-grade values, no grade) beside the ref
- `s13.pre-tex.js` — Owl startled (35.36–36.92): a big close-up of the owl on black — saucer eyes with pin-prick pupils, a sweat drop, beak hanging open, one wing flung up and out to the rig…

### `scratch-build-s13fix/` — work folder, 17 files
calibrate every cel trace against one render (frames: A 884, B 886, C 895, D 901, E 912) -> *_cal.json, then rebuild

- `calib.sh` — calibrate every cel trace against one render (frames: A 884, B 886, C 895, D 901, E 912) -> *_cal.json, then rebuild
- `retrace.sh` — re-run every cel trace and regenerate the data module
- `sumev.py` — sumev.py OUTDIR -- segment summary from metrics.json (+ sigma-3 MAE and IoU by pose)
- `hatch.py` — hatch.py OUTDIR fi,... -- skeleton length of ink strokes (local darkness > thr) in regions: render vs source

### `scratch-build-s13fix1/` — work folder, 7 files
Owl startled (35.36–36.92): a big close-up of the owl on black — saucer eyes with pin-prick pupils, a sweat drop, beak hanging open, one wing flung up and out to the rig…

- `s13.pre-perf.js` — Owl startled (35.36–36.92): a big close-up of the owl on black — saucer eyes with pin-prick pupils, a sweat drop, beak hanging open, one wing flung up and out to the rig…
- `m2.py` — m2.py dir...: metrics against the exact source frame the render shows (render time snapped to the 30 fps grid)
- `metrics.py` — metrics.py dir [dir2 ...]: per pair blurred MAE, IoU, region means (render-source)
- `pair.py` — pair.py dir idx x0 y0 x1 y1 out [scale] [grid]
