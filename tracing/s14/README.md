# s14 — 36.92–40.72 s: Small owl in the dark heads for a lit gap

Status **approx**, method **mixed** (see `docs/FIDELITY.md` and `docs/fidelity/s14.md`). The render code is `src/shots/s14.js` and `src/shots/s14/`.

## How the data in `src/shots/s14/` was made

The data files the render loads name the script that generated them in their header comment. Those scripts, at their new paths:

| producer script (in `tracing/`) | runtime files it produced |
|---|---|
| [`s14/src-s14/trace3/tone3.py`](src-s14/trace3/tone3.py) | `src/shots/s14/room3.js`, `src/shots/s14/tone3.js` |
| [`s14/src-s14/trace/owlpose2.py`](src-s14/trace/owlpose2.py) | `src/shots/s14/back.js` |
| [`s14/src-s14/trace3/facegain.py`](src-s14/trace3/facegain.py) | `src/shots/s14/facegain3.js` |
| [`s14/src-s14/trace3/gapface.py`](src-s14/trace3/gapface.py) | `src/shots/s14/gapface3.js` |
| [`s14/src-s14/trace3/gaplight.py`](src-s14/trace3/gaplight.py) | `src/shots/s14/gaplight3.js` |
| [`s14/src-s14/trace3/light3.py`](src-s14/trace3/light3.py) | `src/shots/s14/light3.js` |
| [`s14/src-s14/trace3/ov.py`](src-s14/trace3/ov.py) | `src/shots/s14/geo3.js` |

Scripts whose code writes into `src/shots/s14/` (found from the output paths in their source; `{…}` = a name filled in at run time):

| script (in `tracing/`) | writes |
|---|---|
| [`s14/src-s14/trace3/iterate.sh`](src-s14/trace3/iterate.sh) | `src/shots/s14/light3.js` |
| [`s14/src-s14/trace3/iterate_f1.sh`](src-s14/trace3/iterate_f1.sh) | `src/shots/s14/facegain3.js`, `src/shots/s14/light3.js` |
| [`s14/src-s14/trace3/iterate_f2.sh`](src-s14/trace3/iterate_f2.sh) | `src/shots/s14/facegain3.js`, `src/shots/s14/light3.js` |

Method notes written next to the trace code: [`src-s14/trace/README.md`](src-s14/trace/README.md), [`src-s14/trace3/README.md`](src-s14/trace3/README.md).

## Index of folders (13)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `src-s14/` — trace / measurement scripts that lived next to the shot data in src/ (not loaded by the render), 43 files
Measurement scripts for s14 (not loaded by the film).

**Produced runtime data:** `src/shots/s14/` (8 files: back.js, facegain3.js, gapface3.js, …)

- `trace3/tone3.py` — Fit one linear value gradient per room face (pre-grade values) to the source, or correct the fitted tones against a render: tone3.py fit T -> writes ../tone3.js from the…
- `trace3/light3.py` — Per-layer light over the dolly: for every source frame 40.00-40.64, fit a gain and a screen-space linear ramp per room layer so the render matches the source on that lay…
- `trace3/gapface.py` — fix pass 2: per-face gains in the gap view (36.96-39.72): for each geo3.js face, the ratio of pre-grade means (source / render) over its visible, lit part of each gap-fi…
- `trace3/gaplight.py` — Per-layer light in the gap view (36.92-39.96): for each render frame, the ratio (pre-grade mean, source / render) over each room layer's pixels inside the source's lit a…

### `snapshots-s14-fix1-orig/` — copy of the shot build before a pass, 16 files
Round-3 measurement scripts for s14 (not loaded by the film).

- `tone3.js` — s14 round 3: fitted face tones (trace3/tone3.py): name: [v at (cx,cy), dv/dx, dv/dy, cx, cy, texture gain, brush gain] (pre-grade values; the texture gain scales the fac…
- `trace3/tone3.py` — Fit one linear value gradient per room face (pre-grade values) to the source, or correct the fitted tones against a render: tone3.py fit T -> writes ../tone3.js from the…
- `owl.js` — s14 owl: five states, built on the shared B&W owl kit (src/lib/owlInk.js) with per-shot parts.
- `room3.js` — s14 round 3: the lit room (storage corridor of boxes and gear), drawn in Canvas2D as flat layers in R40 coordinates (the 40.00 s source frame).

### `snapshots-s14-r3-meas/` — measurement / study, 1 file
s14 round 3: fitted face tones (trace3/tone3.py): name: [v at (cx,cy), dv/dx, dv/dy, cx, cy] (pre-grade values)

- `tone3_fit0.js` — s14 round 3: fitted face tones (trace3/tone3.py): name: [v at (cx,cy), dv/dx, dv/dy, cx, cy] (pre-grade values)

### `snapshots-s14-r3-orig/` — copy of the shot build before a pass, 1 file
Shot 14 (36.92–40.72): the owl alone in the dark.

- `s14.js` — Shot 14 (36.92–40.72): the owl alone in the dark.

### `scratch-build/` — loose scripts from an agent scratchpad, 35 files
Record every Lay.fill polygon of the s14 room (R40 coords) -> fills.json

- `recvec.mjs` — Record every Lay.fill polygon of the s14 room (R40 coords) -> fills.json
- `maskfit.py` — camtrack (rel 38.48): t -> s,tx,ty
- `maskfit2.py` — exclude owl: owl region bright in src and not in w; drop ratio>1.3
- `depthtm.py` — depthtm.py : inverse depth w at R40 points by scale-compensated template matching 40.00 -> t (source only)

### `scratch-build-fx/` — work folder, 1 file

### `scratch-build-s14f1/` — scripts, 12 files
depthtm.py : inverse depth w at R40 points by scale-compensated template matching 40.00 -> t (source only)

- `depthtm.py` — depthtm.py : inverse depth w at R40 points by scale-compensated template matching 40.00 -> t (source only)
- `revmetrics.py` — dominant period along the 45-degree diagonal via autocorrelation of the high-pass
- `metrics.py` — metrics.py DIR [--cells] [x0 y0 x1 y1]
- `idxviz.py`

### `scratch-build-s14fix/` — work folder, 1 file
metrics for a compare dir: met.py dir [tiles]

- `met.py` — metrics for a compare dir: met.py dir [tiles]

### `scratch-build-s14fix1/` — work folder, 8 files
rtrack.py DIR IDX [x0 y0 x1 y1]: similarity render->source (ORB+RANSAC) on the room

- `rtrack.py` — rtrack.py DIR IDX [x0 y0 x1 y1]: similarity render->source (ORB+RANSAC) on the room
- `diffmap.py` — diffmap.py DIR IDX out.jpg [sigma]: blurred render \| blurred source \| signed diff (red = render brighter), 1/2 scale
- `blobcmp.py` — blobcmp.py DIR : for each frame/ref pair, owl blob centroid/area/bbox at thr (150 before 40.0, 225 after)
- `stats.py` — stats.py DIR : per frame mean luma, cell grid diffs (4x3), laplacian energy

### `scratch-build-s14rev1/` — comparison / review evidence scripts, 4 files
high-pass energy

- `tone.py` — high-pass energy
- `metrics.py`
- `crop.py` — usage: crop.py dir idx x0 y0 x1 y1 out [scale] [gain]
- `matchref.py`

### `scratch-build-s14rev2/` — comparison / review evidence scripts, 2 files
crop.py DIR T x0 y0 x1 y1 out.jpg [scale] [gamma] -> render\|source crop stacked side by side with grid

- `crop.py` — crop.py DIR T x0 y0 x1 y1 out.jpg [scale] [gamma] -> render\|source crop stacked side by side with grid
- `metrics.py`

### `scratch-ending-s14f2/` — scripts, 7 files
gapprof.py dir: horizontal profile of the lit gap above the owl (blurred luma) render vs source

- `gapprof.py` — gapprof.py dir: horizontal profile of the lit gap above the owl (blurred luma) render vs source
- `cmpcrop.py` — cmpcrop.py renderdir t x0 y0 x1 y1 scale out.jpg [stretch] -> render (top) / source (bottom) crops with a grid
- `scalematch.py` — scalematch.py x0 y0 x1 y1 t0 t1,t2,...
- `tdiff.py` — tdiff.py dirA dirB [ts]: per-tile blurred MAE (6x3) of A and B vs source, and B-A

### `scratch-ending-s14rev2/` — comparison / review evidence scripts, 2 files
per-frame metrics: blurred MAE, mean, percentiles, hp energy; tile grid biases

- `metrics.py` — per-frame metrics: blurred MAE, mean, percentiles, hp energy; tile grid biases
- `crop.py` — usage: crop.py DIR T x0 y0 x1 y1 out.png [scale] [gain] -> render \| source side by side crop
