# s04 — 19.12–23.12 s: Owl on his shoulder; camera arcs round behind him

Status **approx**, method **traced** (see `docs/FIDELITY.md` and `docs/fidelity/s04.md`). The render code is `src/shots/s04.js` and `src/shots/s04/`.

## How the data in `src/shots/s04/` was made

The data files the render loads name the script that generated them in their header comment. Those scripts, at their new paths:

| producer script (in `tracing/`) | runtime files it produced |
|---|---|
| [`s04/src-s04/trace/flow_key.py`](src-s04/trace/flow_key.py) | `src/shots/s04/tkey.js`, `src/shots/s04/tk/` (59 files: k1912.js, k1916.js, k1928.js, …) |
| [`s04/src-s04/trace/tojs_d.py`](src-s04/trace/tojs_d.py) | `src/shots/s04/tkey.js`, `src/shots/s04/tk/` (59 files: k1912.js, k1916.js, k1928.js, …) |
| [`s04/src-s04/trace/trace_key.py`](src-s04/trace/trace_key.py) | `src/shots/s04/tkey.js`, `src/shots/s04/tk/` (59 files: k1912.js, k1916.js, k1928.js, …) |
| [`s04/src-s04/trace/fix1/pencil_track.py`](src-s04/trace/fix1/pencil_track.py) | `src/shots/s04/pencil2.js`, `src/shots/s04/pencil2data.js` |
| [`s04/src-s04/trace/fix2/plaster_fit.py`](src-s04/trace/fix2/plaster_fit.py) | `src/shots/s04/owlface.js`, `src/shots/s04/plasterdata.js` |
| [`s04/src-s04/trace/b1/tcal.py`](src-s04/trace/b1/tcal.py) | `src/shots/s04/tcorr.js` |
| [`s04/src-s04/trace/fix1/eyes2js.py`](src-s04/trace/fix1/eyes2js.py) | `src/shots/s04/eyes2.js` |
| [`s04/src-s04/trace/fix1/eyetrack2.py`](src-s04/trace/fix1/eyetrack2.py) | `src/shots/s04/eyes2.js` |
| [`s04/src-s04/trace/fix1/hatchflow.py`](src-s04/trace/fix1/hatchflow.py) | `src/shots/s04/hatchflow.js` |
| [`s04/src-s04/trace/fix1/owlface2.py`](src-s04/trace/fix1/owlface2.py) | `src/shots/s04/owlface2.js` |
| [`s04/src-s04/trace/fix1/pencil_width.py`](src-s04/trace/fix1/pencil_width.py) | `src/shots/s04/pencil2data.js` |
| [`s04/src-s04/trace/fix2/cup_track.py`](src-s04/trace/fix2/cup_track.py) | `src/shots/s04/cup.js` |
| [`s04/src-s04/trace/screen_track.py`](src-s04/trace/screen_track.py) | `src/shots/s04/screen04.js` |
| [`s04/trace-scripts-s04-k2/tr/hiseyes.py`](trace-scripts-s04-k2/tr/hiseyes.py) | `src/shots/s04/hiseyes.js` |
| [`s04/trace-scripts-s04-k2/tr/owlface.py`](trace-scripts-s04-k2/tr/owlface.py) | `src/shots/s04/owlface.js` |
| [`s04/trace-scripts-s04-k2/tr/owlmask.py`](trace-scripts-s04-k2/tr/owlmask.py) | `src/shots/s04/owlmask.js` |

Scripts whose code writes into `src/shots/s04/` (found from the output paths in their source; `{…}` = a name filled in at run time):

| script (in `tracing/`) | writes |
|---|---|
| [`s04/trace-scripts-s04-study/sil.py`](trace-scripts-s04-study/sil.py) | `src/shots/s04/silhouettes.js` |

Method notes written next to the trace code: [`src-s04/trace/README.md`](src-s04/trace/README.md).

## Index of folders (11)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `src-s04/` — trace / measurement scripts that lived next to the shot data in src/ (not loaded by the render), 37 files
Measurement scripts for the s04 rotoscope keys (not loaded by the film).

**Produced runtime data:** `src/shots/s04/` (11 files: cup.js, eyes2.js, hatchflow.js, …), `src/shots/s04/tk/` (59 files: k1912.js, k1916.js, k1928.js, …)

- `trace/fix1/eyes2js.py` — eyes2js.py : writes s04/eyes2.js -- per key frame, per eye: the eye region's affine (20.56 eye coords -> frame; b1's eyetrack to 21.64, eyetrack2 frame by frame after), …
- `trace/trace_key.py` — trace_key.py T masks.json out.json [--prev prev.png] Measures ONE source frame (time T) of the designer and writes control points only: tone : a 4-band value study (outl…
- `trace/fix1/pencil_track.py` — pencil_track.py : the pencil in his teeth, per source frame 478-577: its outline measured on the hold frame 20.56 at 4x (snapshots/s04-fix1w/penL.jpg, penR.jpg: tip (706…
- `trace/tojs_d.py` — tojs_d.py key.json out.js NAME -- a traced key (draw mode) as a compact JS module: tone : a 6-value study (simplified outlines of the regions darker than each level), en…

### `trace-scripts-s04-fix1-study/` — measurement / study, 5 files
layertrack.py: similarity of regions of source frames t (vs a reference time) — per depth layer

- `layertrack.py` — layertrack.py: similarity of regions of source frames t (vs a reference time) — per depth layer
- `chain.py` — chain.py NAME x0,y0,x1,y1[;...] cx,cy [exclude x0,y0,x1,y1]: chain-track a region backwards from 23.12 (frame to frame)
- `gstrip.py` — gstrip.py T0 T1 STEP out.jpg x0 y0 x1 y1 [--cols N] [--w PX] [--grid 100]: source crops with a labelled frame-px grid
- `ovl.py` — ovl.py DIR idx t x0 y0 x1 y1 out.jpg [scale]: render (grey) with the source's dark-mass outline (red) and edges (green)

### `trace-scripts-s04-fix1n/` — work folder, 4 files
m.py DIR [T0 T1] -- per-frame metrics of harness renders DIR/r-T.png against the source: s6/s2 blurred MAE, and motion-compensated frame residual (render vs source; both…

- `m.py` — m.py DIR [T0 T1] -- per-frame metrics of harness renders DIR/r-T.png against the source: s6/s2 blurred MAE, and motion-compensated frame residual (render vs source; both…
- `resmap.py` — where does the hold key frame (20.56, warped by the measured flow) fail to show frame f? -> residual maps
- `pair.py` — pair.py DIR out.jpg T1,T2,..
- `scr.py`

### `trace-scripts-s04-k2/` — scripts, 47 files
hiseyes.py -- his eyes on the hold frame (20.56), measured for the authored irises (s04/hiseyes.js): opening: outline of the eye's opening (sclera + iris, holes filled) …

**Produced runtime data:** `src/shots/s04/hiseyes.js`, `src/shots/s04/owlface.js`, `src/shots/s04/owlmask.js`

- `tr/hiseyes.py` — hiseyes.py -- his eyes on the hold frame (20.56), measured for the authored irises (s04/hiseyes.js): opening: outline of the eye's opening (sclera + iris, holes filled) …
- `tr/owlface.py` — owlface.py -- measure the owl's face at the hold frame (20.56) as primitives (paint space, frame px): eyes: iris disc (centre, r), outer ring r, catchlights (centre, r);…
- `tr/owlmask.py` — owlmask.py F0 F1 out.js -- where the hold key's frame (20.56), carried by its STORED flow, fails to show source frame f (the owl gliding in / landing / folding its wings…
- `tr/tojs_d.py` — tojs_d.py key.json out.js NAME -- a traced key (draw mode) as a compact JS module: tone : a 6-value study (simplified outlines of the regions darker than each level), en…

### `trace-scripts-s04-rev1-crops/` — measurement / study, 1 file
usage: crop.py render.png ref.png x0 y0 x1 y1 out.jpg [scale]

- `crop.py` — usage: crop.py render.png ref.png x0 y0 x1 y1 out.jpg [scale]

### `trace-scripts-s04-study/` — measurement / study, 17 files
Clean figure silhouette + dark regions inside it for a key frame (coordinates only).

**Writes into:** `src/shots/s04/silhouettes.js`

- `sil.py` — Clean figure silhouette + dark regions inside it for a key frame (coordinates only).
- `camfit.py` — Joint fit: camera per time + laptop pose + speaker pose, from hand-measured source points (frame px).
- `spantrack.py` — Auto landmarks for a morph span: features inside the figure mask (minus the owl) at Ta tracked forward to Tb, and features at Tb tracked backward to Ta; keep the tracks …
- `seedtrack.py` — Track given seed points (x,y) from T0 to T1 (forward) or backward if T1<T0; prints per-frame positions and fb error.

### `snapshots-s04-b1/` — work folder, 15 files
Rotoscoped keys for s04: every source frame of the segment is covered by a key drawing made from measurements of one source frame (snapshots/s04-k2/tr: trace_key.py, flo…

- `tkey.js.b1-before-cleanup` — Rotoscoped keys for s04: every source frame of the segment is covered by a key drawing made from measurements of one source frame (snapshots/s04-k2/tr: trace_key.py, flo…
- `tr/grade.py` — Python port of src/lib/post.js (no grain) + its inverse, for measuring in pre-grade ("paint") space.
- `tr/hf_tojs.py` — hf_tojs.py in.json out.js NAME : pack the hatch fields as 1-char-per-cell strings (91 levels) for s04/penhatch.js
- `dropped/penhatch.js.txt` — s04 pen hatching: the source draws the lit figure (hoodie, face shadows, neck, beanie) with fine tapered pen strokes laid in parallel bundles (cross-hatched where it is …

### `snapshots-s04-b1k/` — tracing / fitting, 1 file

### `snapshots-s04-fix1w/` — work folder, 24 files
Rotoscoped keys for s04: every source frame of the segment is covered by a key drawing made from measurements of one source frame (snapshots/s04-k2/tr: trace_key.py, flo…

- `orig/tkey.js` — Rotoscoped keys for s04: every source frame of the segment is covered by a key drawing made from measurements of one source frame (snapshots/s04-k2/tr: trace_key.py, flo…
- `orig/eyetrack.js` — s04: where his eyes are on each key frame (snapshots/s04-b1/tr/eyetrack.py): per eye, the ECC affine from the 20.56 frame's eye region (brow + lids, iris masked) to that…
- `tools/flowreg.mjs` — node flowreg.mjs NNNN x0 y0 x1 y1 : flow stats of key NNNN inside a frame region
- `tools/flowstat.mjs` — node flowstat.mjs NNNN : per flow offset of key K NNNN: mean / p95 / max displacement (px) and mean vector

### `scratch-build/` — loose scripts from an agent scratchpad, 6 files

- `prof.mjs`
- `det.mjs`
- `timing.mjs`
- `strokes.mjs`

### `scratch-build-s04rev1/` — comparison / review evidence scripts, 2 files
usage: crop.py dir idx x0 y0 x1 y1 out [scale] [v]

- `crop.py` — usage: crop.py dir idx x0 y0 x1 y1 out [scale] [v]
- `which.py`
