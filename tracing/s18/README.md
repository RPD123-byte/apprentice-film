# s18 — 53.24–57.32 s: Close on the synth; the owl's feet on the keys

Status **close**, method **traced** (see `docs/FIDELITY.md` and `docs/fidelity/s18.md`). The render code is `src/shots/s18.js` and `src/shots/s18/`.

## How the data in `src/shots/s18/` was made

The data files the render loads name the script that generated them in their header comment. Those scripts, at their new paths:

| producer script (in `tracing/`) | runtime files it produced |
|---|---|
| [`s18/src-s18/trace2/encode_all.py`](src-s18/trace2/encode_all.py) | `src/shots/s18/data/` (5 files: bgB.js, kbB.js, owlA.js, …) |
| [`s18/src-s18/trace2/fit_tone.py`](src-s18/trace2/fit_tone.py) | `src/shots/s18/tone.js`, `src/shots/s18/data/toneA.js`, `src/shots/s18/data/toneB.js`, `src/shots/s18/data/toneOwlA.js`, `src/shots/s18/data/toneOwlB.js` |
| [`s18/src-s18/trace2/trace_plate2.py`](src-s18/trace2/trace_plate2.py) | `src/shots/s18/data/bgB.js`, `src/shots/s18/data/roomA.js` |
| [`s18/snapshots-s18-fix1-h/feetdiff.py`](snapshots-s18-fix1-h/feetdiff.py) | `src/shots/s18/data/feetA.js` |
| [`s18/snapshots-s18-fix1-h/feetover.py`](snapshots-s18-fix1-h/feetover.py) | `src/shots/s18/data/feetA.js` |
| [`s18/snapshots-s18-fix2-h/fitcush.py`](snapshots-s18-fix2-h/fitcush.py) | `src/shots/s18/data/cushTone.js` |
| [`s18/src-s18/trace2/fit_tone_box.py`](src-s18/trace2/fit_tone_box.py) | `src/shots/s18/data/cupTone.js` |
| [`s18/src-s18/trace2/inktrace.py`](src-s18/trace2/inktrace.py) | `src/shots/s18/inkdraw.js` |
| [`s18/src-s18/trace2/plateB2.py`](src-s18/trace2/plateB2.py) | `src/shots/s18/data/bgB.js` |
| [`s18/src-s18/trace2/refit_tail.py`](src-s18/trace2/refit_tail.py) | `src/shots/s18/data/owlB.js` |
| [`s18/src-s18/trace2/tojs.py`](src-s18/trace2/tojs.py) | `src/shots/s18/inkdraw.js` |
| [`s18/src-s18/trace2/trace_owlA2.py`](src-s18/trace2/trace_owlA2.py) | `src/shots/s18/data/owlA.js` |
| [`s18/src-s18/trace2/trace_owlB2.py`](src-s18/trace2/trace_owlB2.py) | `src/shots/s18/data/owlB.js` |

Scripts whose code writes into `src/shots/s18/` (found from the output paths in their source; `{…}` = a name filled in at run time):

| script (in `tracing/`) | writes |
|---|---|
| [`s18/src-s18/traced_v2/trace/trace_owlA.py`](src-s18/traced_v2/trace/trace_owlA.py) | `src/shots/s18/trace/trace_owlA.py` |
| [`s18/src-s18/traced_v2/trace/trace_owlB.py`](src-s18/traced_v2/trace/trace_owlB.py) | `src/shots/s18/trace/trace_owlB.py` |
| [`s18/src-s18/traced_v2/trace/trace_plate.py`](src-s18/traced_v2/trace/trace_plate.py) | `src/shots/s18/trace/trace_plate.py` |

Method notes written next to the trace code: [`src-s18/handbuilt/README.md`](src-s18/handbuilt/README.md), [`src-s18/trace2/README.md`](src-s18/trace2/README.md), [`src-s18/traced_v2/trace/README.md`](src-s18/traced_v2/trace/README.md), [`src-s18/traced_v2/trace/prep/README.md`](src-s18/traced_v2/trace/prep/README.md).

## Index of folders (16)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `src-s18/` — trace / measurement scripts that lived next to the shot data in src/ (not loaded by the render), 64 files
The hand-built version of s18 from fix pass 1 (procedural engraved plates, a custom-drawn owl, generic take-off

**Produced runtime data:** `src/shots/s18/inkdraw.js`, `src/shots/s18/tone.js`, `src/shots/s18/data/` (10 files: bgB.js, cupTone.js, kbB.js, …)

- `trace2/inktrace.py` — s18 ink tracer (measurement only; nothing here is loaded by the film).
- `trace2/trace_owlB2.py` — Shot B owl as ink drawings (measurement only; nothing here is loaded by the film).
- `trace2/trace_plate2.py` — trace_plate2.py in_P.npy out.pkl [--crop x0 y0 x1 y1] [--p key=val ...] - trace a static plate into an ink drawing
- `trace2/encode_all.py` — encode_all.py WORKDIR - write ../data/*.js from the traced drawings (pickles in WORKDIR)

### `trace-scripts-s18-fix1r-h/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 22 files
raster micro-benchmarks

- `profB4.js`
- `profB3.js` — simple op costs
- `profA2.js` — raster micro-benchmarks
- `profFill.js` — pattern from a canvas drawn with drawImage (GPU-resident?)

### `trace-scripts-s18-perf/` — measurement / study, 1 file

- `perf.html` — s18 perf

### `snapshots-s18-fix1-h/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 36 files
feetover.py DIR f1 f2 ... : registered source \| source with the rig (DIR/r<f>.png, registered coords) overlaid

**Produced runtime data:** `src/shots/s18/data/feetA.js`

- `feetdiff.py`
- `feetover.py` — feetover.py DIR f1 f2 ... : registered source \| source with the rig (DIR/r<f>.png, registered coords) overlaid
- `flyfit.py`
- `flyfit.mjs` — harness: n = 10000*mode + f.

### `snapshots-s18-fix2-h/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 20 files
fitcush.py rdir out.json N -- tone blobs (tone.js form) fitted on the registered medians of the standing frames, graded values, blob centres in the cup box, error at blu…

**Produced runtime data:** `src/shots/s18/data/cushTone.js`

- `fitcush.py` — fitcush.py rdir out.json N -- tone blobs (tone.js form) fitted on the registered medians of the standing frames, graded values, blob centres in the cup box, error at blu…
- `fit.html` — LOADING
- `fit.mjs` — node fit.mjs frames(a-b,..) outjson [initjson] -> fits the shot-A feet per frame (see fit.html)
- `tailfit.mjs` — node tailfit.mjs frames out.json -> tail pose [a, tx, ty, spread] per frame, coordinate search on the graded render

### `snapshots-s18-h/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 2 files
node render.mjs outdir frames(comma, a-b ranges) [raw] [module]

- `render.mjs` — node render.mjs outdir frames(comma, a-b ranges) [raw] [module]
- `h.html` — LOADING

### `snapshots-s18-rev1-h/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 4 files
node render.mjs outdir frames(comma, a-b ranges) [order: fwd\|rev] -> renders the REAL main.js at t=(n+0.5)/25

- `render.mjs` — node render.mjs outdir frames(comma, a-b ranges) [order: fwd\|rev] -> renders the REAL main.js at t=(n+0.5)/25
- `pair.py` — pair.py n x0 y0 x1 y1 [scale] [dir] -> s18-rev1-pairs/p<n>_<x0>_<y0>.jpg (render on top, source below)
- `metrics.py`
- `h.html` — LOADING

### `snapshots-s18-rev2-h/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 3 files
strip.py out.jpg frames(a-b) x0 y0 x1 y1 [scale] [track:A\|none] [cols]

- `strip.py` — strip.py out.jpg frames(a-b) x0 y0 x1 y1 [scale] [track:A\|none] [cols]
- `metrics.py`
- `pair.py` — pair.py n x0 y0 x1 y1 [scale] [dir] [tag] (render top/left, source bottom/right)

### `scratch-build/` — loose scripts from an agent scratchpad, 9 files
invert f*0.65+0.35*smoothstep(f) by Newton

- `grade.py` — invert f*0.65+0.35*smoothstep(f) by Newton
- `juncparts.mjs`
- `owlAstats.mjs`
- `bellystats.mjs`

### `scratch-build-f18/` — scripts, 6 files
node perf.mjs module frames reps -> per-frame draw ms (first pass = with cache builds, then best of reps)

- `perf.mjs` — node perf.mjs module frames reps -> per-frame draw ms (first pass = with cache builds, then best of reps)
- `render.mjs` — node render.mjs outdir frames(comma, a-b ranges) [raw] [module]
- `calwk.sh`
- `summ.py`

### `scratch-build-p2/` — work folder, 28 files
s18 shot B plates (55.28–57.28): the extreme close-up of the synth keys, locked off.

- `backup_s18_fix1/keysB.js` — s18 shot B plates (55.28–57.28): the extreme close-up of the synth keys, locked off.
- `vec5.py` — stacked outline traces: for each threshold, ink shapes with holes and a measured value (flat or ramp) per shape.
- `vec4.py` — single-threshold outline trace with holes; per ink shape a measured linear value ramp (plane fit)
- `vec3.py` — single-threshold outline trace with holes; one measured value per connected ink shape

### `scratch-build-s18fix1/` — work folder, 8 files
Frame-accurate pairs for s18: render the given SOURCE frame numbers (via tools/compare.sh at times that land on that source frame), then pair each render with the exact …

- `fp.py` — Frame-accurate pairs for s18: render the given SOURCE frame numbers (via tools/compare.sh at times that land on that source frame), then pair each render with the exact …
- `zoom.py` — zoom.py out x0 y0 x1 y1 scale frames(,sep) [--reg] [--img path]
- `maskA.py`
- `summ.py`

### `scratch-build-s18r4/` — work folder, 24 files
s18 ink-drawing renderer. A drawing (measured by trace2/inktrace.py, encoded by trace2/tojs.py) is made of base - silhouettes filled with their own dark value (an owl's …

- `bak0/inkdraw.js` — s18 ink-drawing renderer. A drawing (measured by trace2/inktrace.py, encoded by trace2/tojs.py) is made of base - silhouettes filled with their own dark value (an owl's …
- `py/fitmb2.py` — fitmb.py layerdir frames : fit a linear motion blur (angle, length) + gaussian to the owl layer vs the source
- `py/fitmb.py` — fitmb.py layerdir frames : fit a linear motion blur (angle, length) + gaussian to the owl layer vs the source
- `shotB.pre-grad.js` — s18 shot B (55.28-57.28, source frames 1382-1432): extreme close-up of the keys.

### `scratch-build-s18rev1n/` — comparison / review evidence scripts, 3 files
frame-accurate pairs: render frame at floor(30t)/30 vs exact source frame; plus diff map and stats

- `fa.py` — frame-accurate pairs: render frame at floor(30t)/30 vs exact source frame; plus diff map and stats
- `match.py`
- `crop.py`

### `scratch-build-s18tools/` — tools, 8 files
silhouette overlay: owl mask (bright & differs from the clean bg) for render (red) and source (green)

- `maskov.py` — silhouette overlay: owl mask (bright & differs from the clean bg) for render (red) and source (green)
- `gridstrip.py` — usage: gridstrip.py T0 T1 STEP out.jpg scale cols [x0 y0 x1 y1]
- `fixref.py` — The snapshot tool renders at floor(30t)/30 and pulls the reference at round(25t).
- `overlay.py` — usage: overlay.py dir out.jpg x0 y0 x1 y1 [scale] -> per time: render \| source \| overlay(R=render,G=source)

### `scratch-ending/` — loose scripts from an agent scratchpad, 2 files
s18 shot A feet, fix pass 2 (see ../feet2.js): converted from the eye-read feetA.js, then fitted per frame.

- `feetA2_converted.js` — s18 shot A feet, fix pass 2 (see ../feet2.js): converted from the eye-read feetA.js, then fitted per frame.
- `feetA_old.cjs` — s18 shot A: the owl's feet per source frame as foot-rig specs (../handdraw.js footRig), registered coords (the frame-1356 placement; the film moves them by PATH_A).
