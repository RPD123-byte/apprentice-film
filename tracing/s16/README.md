# s16 — 45.72–47.84 s: It flies into his face; tumbles by the mug; white flash

Status **close**, method **traced** (see `docs/FIDELITY.md` and `docs/fidelity/s16.md`). The render code is `src/shots/s16.js` and `src/shots/s16/`.

## How the data in `src/shots/s16/` was made

The data files the render loads name the script that generated them in their header comment. Those scripts, at their new paths:

| producer script (in `tracing/`) | runtime files it produced |
|---|---|
| [`s16/src-s16/trace/owl3.py`](src-s16/trace/owl3.py) | `src/shots/s16/owl.js`, `src/shots/s16/data/owl.js` |
| [`s16/src-s16/trace/steam.py`](src-s16/trace/steam.py) | `src/shots/s16/steam.js`, `src/shots/s16/data/steam.js` |
| [`s16/src-s16/trace/band.py`](src-s16/trace/band.py) | `src/shots/s16/data/band.js` |
| [`s16/src-s16/trace/cel.py`](src-s16/trace/cel.py) | `src/shots/s16/data/cel.js` |
| [`s16/src-s16/trace/desk.py`](src-s16/trace/desk.py) | `src/shots/s16/data/desk.js` |
| [`s16/src-s16/trace/feet.py`](src-s16/trace/feet.py) | `src/shots/s16/data/feet.js` |
| [`s16/src-s16/trace/hair.py`](src-s16/trace/hair.py) | `src/shots/s16/data/hair.js` |
| [`s16/src-s16/trace/irises.py`](src-s16/trace/irises.py) | `src/shots/s16/eyes.js` |
| [`s16/src-s16/trace/mug.py`](src-s16/trace/mug.py) | `src/shots/s16/data/mug.js` |
| [`s16/src-s16/trace/room.py`](src-s16/trace/room.py) | `src/shots/s16/data/room.js` |
| [`s16/src-s16/trace/roomfix.py`](src-s16/trace/roomfix.py) | `src/shots/s16/data/roomfix.js` |
| [`s16/src-s16/trace/shirt.py`](src-s16/trace/shirt.py) | `src/shots/s16/data/shirt.js` |

Scripts whose code writes into `src/shots/s16/` (found from the output paths in their source; `{…}` = a name filled in at run time):

| script (in `tracing/`) | writes |
|---|---|
| [`s16/src-s16/trace/cel2.py`](src-s16/trace/cel2.py) | `src/shots/s16/trace/cel2.py` |
| [`s16/src-s16/trace/owl.py`](src-s16/trace/owl.py) | `src/shots/s16/trace/owl.py` |
| [`s16/src-s16/trace/owl2.py`](src-s16/trace/owl2.py) | `src/shots/s16/trace/owl.py` |
| [`s16/trace-scripts-s16-fix1-trace-archive/src-shots-s16/trace/calib.py`](trace-scripts-s16-fix1-trace-archive/src-shots-s16/trace/calib.py) | `src/shots/s16/trace/calib.py` |
| [`s16/trace-scripts-s16-fix1-trace-archive/src-shots-s16/trace/dyn.py`](trace-scripts-s16-fix1-trace-archive/src-shots-s16/trace/dyn.py) | `src/shots/s16/trace/dyn.py` |
| [`s16/trace-scripts-s16-p2-tools/cal.py`](trace-scripts-s16-p2-tools/cal.py) | `src/shots/s16/vec.js` |
| [`s16/trace-scripts-s16-p2-tools/cal2.py`](trace-scripts-s16-p2-tools/cal2.py) | `src/shots/s16/vec.js` |

Method notes written next to the trace code: [`src-s16/trace/README.md`](src-s16/trace/README.md).

## Index of folders (17)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `src-s16/` — trace / measurement scripts that lived next to the shot data in src/ (not loaded by the render), 27 files
Measurement scripts for s16 (never loaded by the film).

**Produced runtime data:** `src/shots/s16/eyes.js`, `src/shots/s16/owl.js`, `src/shots/s16/steam.js`, `src/shots/s16/data/` (11 files: band.js, cel.js, desk.js, …)

- `trace/cel.py` — s16 room, this pass: the two headphone cups round his neck as fine cel levels (the s13 method: sigma-0.9 light outlines at 12 levels, painted flat) instead of the engrav…
- `trace/owl3.py` — s16 owl, third pass (fix 1): the flying owl redrawn from authored parts placed on measured landmarks, replacing owl2.py's dense cel levels (see fidelity/s16.md).
- `trace/room.py` — s16 room: measure the static plate (the designer at his desk, steady framing) into data/room.js.
- `trace/desk.py` — s16 desk front (this pass): the lit plank and the dark band under it, measured on the clean plate (plateE) into data/desk.js (geometry only): PLANK the plank's outline (…

### `trace-scripts-s16-fix1-tools/` — tools, 9 files
lab.js = src/shots/s16.js without the s17 import (fast harness page loads), with absolute import paths; VIEW=roomonly (harness) leaves out the owl and the steam (for the…

- `mklab.sh` — lab.js = src/shots/s16.js without the s17 import (fast harness page loads), with absolute import paths; VIEW=roomonly (harness) leaves out the owl and the steam (for the…
- `lab.js` — s16 (45.72–47.84): the owl flies into his face, tumbles back onto the desk beside the mug and sits there dazed; a jittery pull-back, a white flash, then the cut to the p…
- `h.html`
- `r.mjs` — node r.mjs outdir frame1,frame2,...

### `trace-scripts-s16-fix1-trace-archive/` — tracing / fitting, 14 files
Measurement scripts for s16 (never loaded by the film).

**Writes into:** `src/shots/s16/trace/calib.py`, `src/shots/s16/trace/dyn.py`

- `src-shots-s16/trace/calib.py` — s16: tone calibration of the vector painter.
- `src-shots-s16/trace/dyn.py` — s16: everything that changes from frame to frame.
- `src-shots-s16/trace/build_plate.py` — s16: build the clean static plate (pre-grade luminance, measurement only) and the camera table.
- `src-shots-s16/trace/trace_plate.py` — s16: trace the clean static plate (build_plate.py) into geometry: tone levels of a median-smoothed value study plus dark and pale ink centre-lines, with one strength per…

### `trace-scripts-s16-fix1-work/` — tracing / fitting, 1 file
grid16.py x0 y0 x1 y1 out [scale] [frame] -> plate (or frame) crop with 50px grid, labels in frame px

- `grid16.py` — grid16.py x0 y0 x1 y1 out [scale] [frame] -> plate (or frame) crop with 50px grid, labels in frame px

### `trace-scripts-s16-p2-old/` — copy of the shot build before a pass, 5 files
s16 vector painter. A drawing is { L: tone levels, D: dark ink strokes, B: pale ink strokes } in frame px: L = [[value, ring, ring, ...], ...] painted in order; each rin…

- `vec.js` — s16 vector painter. A drawing is { L: tone levels, D: dark ink strokes, B: pale ink strokes } in frame px: L = [[value, ring, ring, ...], ...] painted in order; each rin…
- `designer.js` — s16 designer: the gaunt young designer in a beanie, drawn as a pen-and-ink portrait (lit paper, dark pen hatching) on the black plate.
- `owl.js` — s16 owl: a round, bright owl (the source's bird in this shot is a ball with a round head sunk into it).
- `scene.js` — s16 scene: the designer at his desk seen straight on at eye level (steady framing of 46.08–47.48).

### `trace-scripts-s16-p2-tools/` — tools, 18 files
synthetic strokes: random-ish thin lines of widths 0.6..4 px, strength 0.5, on grey 0.6

**Writes into:** `src/shots/s16/vec.js`

- `cal.py`
- `cal2.py` — synthetic strokes: random-ish thin lines of widths 0.6..4 px, strength 0.5, on grey 0.6
- `blurfit.py`
- `plate.py` — build the clean pre-grade plate (luminance) of the static scene: 1175 everywhere, the owl@1175 area from 1153, the steam area black.

### `trace-scripts-s16-study/` — measurement / study, 7 files
Frame-measured owl keyframes -> owl-unit JS for src/shots/s16/owl.js (printed to stdout).

- `keys.py` — Frame-measured owl keyframes -> owl-unit JS for src/shots/s16/owl.js (printed to stdout).
- `keys.js` — placement IMPACT: [45.72, IMPACT, 1212, 392, 1.0, 0.08]
- `gstrip.py`
- `trk.py` — where does frame centre (1103,473) go

### `snapshots-s16-fix1-orig/` — copy of the shot build before a pass, 7 files
Measurement scripts for s16 (never loaded by the film).

- `s16/room.js` — s16 room: the designer at his desk seen straight on (the steady framing of 46.08–47.48), with the laptop, mug, books and cables.
- `s16/engrave16.js` — s16's copy of the scratchboard engraver (src/lib/engrave.js), with two changes for a plate whose hatch direction changes from region to region: - the line anti-aliasing …
- `s16/owl.js` — s16 owl: one drawing per source frame where the owl's drawing changes (./data/owl.js, measured by src/shots/s16/trace/owl2.py; geometry only): sil the measured silhouett…
- `s16.js` — s16 (45.72–47.84): the owl flies into his face, tumbles back onto the desk beside the mug and sits there dazed; a jittery pull-back, a white flash, then the cut to the p…

### `snapshots-s16-fix1-tools/` — tools, 19 files
seg.py LOG_A LOG_B : segment means of sigma 1/2/4/8 errors and region errors from run.py logs

- `seg.py` — seg.py LOG_A LOG_B : segment means of sigma 1/2/4/8 errors and region errors from run.py logs
- `lab.py` — s16 scratch driver: bundle entry.js (esbuild, ESM), open h.html in headless chromium (file://, no server), run JS that paints a canvas and fetch it as a numpy array.
- `hp.py`
- `run.py` — usage: run.py OUTDIR [frames...\|all\|key] -> graded frames through the real post (no grain), errors vs source

### `snapshots-s16-fix2-final/` — the shot build after a pass (+ the scripts used in it), 25 files
Measurement scripts for s16 (never loaded by the film).

- `orig/s16/room.js` — s16 room: the designer at his desk seen straight on (the steady framing of 46.08–47.48), with the laptop, mug, books and cables.
- `orig/s16/owl.js` — s16 owl: one drawing per source frame where the owl's drawing changes (./data/owl.js, measured by src/shots/s16/trace/owl3.py; geometry and a few measured values only).
- `orig/s16.js` — s16 (45.72–47.84): the owl flies into his face, tumbles back onto the desk beside the mug and sits there dazed; a jittery pull-back, a white flash, then the cut to the p…
- `orig/s16/owlparts.js` — s16 owl parts, authored: the headphone cups of the flying owl (from fitted ellipses) and the seated owl's graphic parts (headphones, far wing hatching, feet), drawn with…

### `snapshots-s16-h1-orig/` — copy of the shot build before a pass, 5 files
Measurement scripts for s16 (never loaded by the film).

- `s16/engrave16.js` — s16's copy of the scratchboard engraver (src/lib/engrave.js), with two changes for a plate whose hatch direction changes from region to region: - the line anti-aliasing …
- `s16/room.js` — s16 room: the designer at his desk seen straight on (the steady framing of 46.08–47.48), with the laptop, mug, books and cables.
- `s16.js` — s16 (45.72–47.84): the owl flies into his face, tumbles back onto the desk beside the mug and sits there dazed; a jittery pull-back, a white flash, then the cut to the p…
- `s16/owl.js` — s16 owl: one drawing per source frame where the owl's drawing changes (the s12/s13 method; ./data/owl.js from src/shots/s16/trace/owl.py): the measured silhouette, fille…

### `snapshots-s16-h1-tools/` — tools, 18 files
automatic eye fits on the flying owl: iris ellipse (dark blob), sclera outline ellipse (the thin dark ring round the white), catchlight.

- `eyefit.py` — automatic eye fits on the flying owl: iris ellipse (dark blob), sclera outline ellipse (the thin dark ring round the white), catchlight.
- `cupfit.py` — the flying owl's near headphone cup: affine ECC of a template cup (1153 or 1160) onto each frame, initialised from the eye similarity; the template's hand-measured outer…
- `seatedeyes.py` — the seated owl's dazed eyes (1162, 1163, 1175): the thin dark ring (ellipse fit to the darkest point on rays from a rough centre) and the small pupil (dark blob inside, …
- `lab.py` — s16 scratch driver: bundle entry.js (esbuild, ESM), open h.html in headless chromium (file://, no server), run JS that paints a canvas and fetch it as a numpy array.

### `snapshots-s16-rev1-crops/` — measurement / study, 1 file
usage: crop.py dir idx x0 y0 x1 y1 out [scale]

- `crop.py` — usage: crop.py dir idx x0 y0 x1 y1 out [scale]

### `snapshots-s16-rev1-tools/` — tools, 4 files
s16 review harness (scratch, not part of the film): exact 25 fps frames through the real grade

- `run.py`
- `timing.py`
- `entry.js` — s16 review harness (scratch, not part of the film): exact 25 fps frames through the real grade
- `h.html`

### `snapshots-s16-rev2-final/` — the shot build after a pass (+ the scripts used in it), 7 files
fit.py frames... : similarity/affine from render to source (ORB+RANSAC) per frame

- `tools/fit2.py`
- `tools/fit.py` — fit.py frames... : similarity/affine from render to source (ORB+RANSAC) per frame
- `tools/run.py` — usage: run.py OUTDIR [grain\|nograin\|raw] frames...
- `tools/entry.js` — s16 review-2 harness (scratch, not part of the film): exact 25 fps frames through the real grade

### `scratch-build/` — loose scripts from an agent scratchpad, 7 files
hatching helpers (dark pen strokes on the white shirt) a fan of strokes from a base point

- `scene-bottom.js` — hatching helpers (dark pen strokes on the white shirt) a fan of strokes from a base point
- `scene-top.js` — s16 scene: the designer at his desk seen straight on at eye level (steady framing of 46.08–47.48).
- `sub.py`
- `regions.py`

### `scratch-build-s16rev1/` — comparison / review evidence scripts, 3 files
block stats 8x4 grid

- `diffmap.py` — block stats 8x4 grid
- `match.py`
- `crop.py`
