# s09 — 32.6–33.6 s: Owl close-up, the room still behind it

Status **approx**, method **mixed** (see `docs/FIDELITY.md` and `docs/fidelity/s09.md`). The render code is `src/shots/s09.js` and `src/shots/s09/`.

## How the data in `src/shots/s09/` was made

The data files the render loads name the script that generated them in their header comment. Those scripts, at their new paths:

| producer script (in `tracing/`) | runtime files it produced |
|---|---|
| [`s09/src-s09/trace/trace_cheek.py`](src-s09/trace/trace_cheek.py) | `src/shots/s09/cheek.js` |
| [`s09/src-s09/trace/trace_hair.py`](src-s09/trace/trace_hair.py) | `src/shots/s09/flicks.js` |

Scripts whose code writes into `src/shots/s09/` (found from the output paths in their source; `{…}` = a name filled in at run time):

| script (in `tracing/`) | writes |
|---|---|
| [`s09/trace-scripts-s09-fix1-meas/strands3.py`](trace-scripts-s09-fix1-meas/strands3.py) | `src/shots/s09/strands.js` |

## Index of folders (9)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `src-s09/` — trace / measurement scripts that lived next to the shot data in src/ (not loaded by the render), 3 files
Trace the bright hair flicks of s09 (source frames 815-818, the head is static there) as centre lines.

**Produced runtime data:** `src/shots/s09/cheek.js`, `src/shots/s09/flicks.js`

- `trace/trace_hair.py` — Trace the bright hair flicks of s09 (source frames 815-818, the head is static there) as centre lines.
- `trace/trace_cheek.py` — Measure the pale cheek outline (with the thin black lock spikes cut into it) and the lit neck patch of s09 on source frames 815-818.
- `trace/fit_sway.py` — Rigid head-sway fit for s09: phase correlation of six head regions per source frame vs frame 815, then a least-squares (tx, ty, rot about the frame origin).

### `trace-scripts-s09-fix1-meas/` — measurement / study, 8 files
drop cuff-edge artifacts and slab/owl stuff

**Writes into:** `src/shots/s09/strands.js`

- `strands3.py`
- `strands.js`
- `strands2.py` — drop cuff-edge artifacts and slab/owl stuff
- `strands.py` — resample to ~5 control points by binning along t

### `trace-scripts-s09-fix1b-meas/` — measurement / study, 8 files
metrics: python3 m.py DIR -> per-region stats for render vs ref (frame-*/ref-*)

- `fitsway.py`
- `m.py` — metrics: python3 m.py DIR -> per-region stats for render vs ref (frame-*/ref-*)
- `motion.py`
- `crop2.py` — crop.py src.png x0 y0 x1 y1 scale out.jpg [grid step]

### `trace-scripts-s09-rev2-v3-crops/` — measurement / study, 1 file
usage: crop.py render.png srcframe.png x0 y0 x1 y1 out.jpg [scale]

- `crop.py` — usage: crop.py render.png srcframe.png x0 y0 x1 y1 out.jpg [scale]

### `trace-scripts-s09-rev2-v3-meas/` — measurement / study, 6 files
track.py DIR : for each render frame, phase-correlate head (beanie+cuff) and shoulder-slab-left regions against source frames around round(t*25); report shift of render …

- `track.py` — track.py DIR : for each render frame, phase-correlate head (beanie+cuff) and shoulder-slab-left regions against source frames around round(t*25); report shift of render …
- `m.py` — python3 m.py DIR [regions] -> per-region stats, render (frame-*) vs my own extracted source frame at round(tr*25)
- `motion.py` — interpolate source
- `overlay.py` — overlay.py render src x0 y0 x1 y1 scale out : render edges magenta, source edges green, on dim source

### `snapshots-s09-fix1-work/` — tracing / fitting, 8 files
final metrics: base vs final, per region (render - source), blurred MAE sigma 6

- `final.py` — final metrics: base vs final, per region (render - source), blurred MAE sigma 6
- `crops.py` — usage: crops.py DIR IDX T OUTPREFIX [region names...]
- `zoom.py` — zoom.py IMG x0 y0 x1 y1 scale out [gamma] [grid]
- `m.py` — dominant period along x and along y via FFT of detrended mean rows

### `snapshots-s09-fix2-w/` — work folder, 8 files
Owl close-up (32.60–33.60): the owl on his shoulder, the edge of his beanie, hair and cheek filling the left of frame, the dim room and a lit speaker behind on the right.

- `s09.pre2.js` — Owl close-up (32.60–33.60): the owl on his shoulder, the edge of his beanie, hair and cheek filling the left of frame, the dim room and a lit speaker behind on the right.
- `room.pre2.js` — s09 room: the dim clutter behind the owl (x 1530-2206) and the lit speaker, ENGRAVED like the rest of the film.
- `stats.py`
- `gridcrop.py` — usage: gridcrop.py img.png x0 y0 x1 y1 out.jpg [scale] [step] -> upscaled crop with labelled grid (frame coords)

### `snapshots-s09-rev1-work/` — comparison / review evidence scripts, 2 files

- `sway.py`
- `crops.py`

### `scratch-build/` — loose scripts from an agent scratchpad, 5 files

- `cheek.js`
- `motion.py`
- `anch.mjs`
