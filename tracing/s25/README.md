# s25 — 100.48–110.52 s: The page cut into shards; the owl stands in the middle, hands on hips

Status **approx**, method **drawn** (see `docs/FIDELITY.md` and `docs/fidelity/s25.md`). The render code is `src/shots/s25.js` and `src/shots/s25/`.

## How the data in `src/shots/s25/` was made

The data files the render loads name the script that generated them in their header comment. Those scripts, at their new paths:

| producer script (in `tracing/`) | runtime files it produced |
|---|---|
| [`s25/snapshots-s25-tools/extract3.py`](snapshots-s25-tools/extract3.py) | `src/shots/s25/v2/data/` (36 files: c308B.js, closed.js, crouchB.js, …) |
| [`s25/snapshots-s25-tools/crackfit.py`](snapshots-s25-tools/crackfit.py) | `src/shots/s25/v2/cracks2.js` |
| [`s25/snapshots-s25-tools/headtrack.py`](snapshots-s25-tools/headtrack.py) | `src/shots/s25/v2/headtrack.js` |
| [`s25/snapshots-s25-tools/lightfit.py`](snapshots-s25-tools/lightfit.py) | `src/shots/s25/v2/light.js` |
| [`s25/snapshots-s25-tools/mkindex.py`](snapshots-s25-tools/mkindex.py) | `src/shots/s25/v2/drawings.js` |
| [`s25/snapshots-s25-tools/scisfit.py`](snapshots-s25-tools/scisfit.py) | `src/shots/s25/v2/scisdata.js` |
| [`s25/snapshots-s25-tools/smokefit.py`](snapshots-s25-tools/smokefit.py) | `src/shots/s25/v2/smoke.js` |
| [`s25/src-s25/trace/divetrack.py`](src-s25/trace/divetrack.py) | `src/shots/s25/v2/sched.js` |
| [`s25/src-s25/trace/e2track.py`](src-s25/trace/e2track.py) | `src/shots/s25/v2/sched.js` |
| [`s25/src-s25/trace/etrack.py`](src-s25/trace/etrack.py) | `src/shots/s25/v2/sched.js` |
| [`s25/src-s25/trace/h2track.py`](src-s25/trace/h2track.py) | `src/shots/s25/v2/sched.js` |
| [`s25/src-s25/trace/schedule.py`](src-s25/trace/schedule.py) | `src/shots/s25/v2/sched.js` |

Scripts whose code writes into `src/shots/s25/` (found from the output paths in their source; `{…}` = a name filled in at run time):

| script (in `tracing/`) | writes |
|---|---|
| [`s25/snapshots-s25-tools/mksmoke.py`](snapshots-s25-tools/mksmoke.py) | `src/shots/s25/v2/smoke.js` |
| [`s25/snapshots-s25-tools/tojs2.py`](snapshots-s25-tools/tojs2.py) | `src/shots/s25/v2/data/KEY.js` |
| [`s25/snapshots-s25-tools/tojs3.py`](snapshots-s25-tools/tojs3.py) | `src/shots/s25/v2/data/NAME.js` |

Method notes written next to the trace code: [`src-s25/trace/README.md`](src-s25/trace/README.md).

## Index of folders (10)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `src-s25/` — trace / measurement scripts that lived next to the shot data in src/ (not loaded by the render), 75 files
Measurement scripts for s25 (not loaded by the film).

**Produced runtime data:** `src/shots/s25/v2/sched.js`

- `trace/e2track.py`
- `trace/etrack.py`
- `trace/h2track.py`
- `trace/divetrack.py`

### `prev-builds-s25-prev/` — an earlier build of the shot that a later pass replaced (kept for reference), 2 files
s25 (100.48–110.52): the framed sōko page, the colour banner on top, cut to pieces — white crack lines all over it like shattered glass.

- `s25.at-start.js` — s25 (100.48–110.52): the framed sōko page, the colour banner on top, cut to pieces — white crack lines all over it like shattered glass.

### `snapshots-end-s25-tfix-final/` — the shot build after a pass (+ the scripts used in it), 12 files
fitowl.py: search scale/rotation/position of the dive drawing (rendered alone, ../end-s25-tfix-dbg/1.png, head anchor (776,430)) on source frames by normalized cross-cor…

- `tools/fitowl.py` — fitowl.py: search scale/rotation/position of the dive drawing (rendered alone, ../end-s25-tfix-dbg/1.png, head anchor (776,430)) on source frames by normalized cross-cor…
- `tools/timing.mjs` — end-s25-tfix renderer (copy of end-s28-fix1 harness shoot.mjs, live tree): loads the REAL composition (index.html -> src/main.js) in the same headless Chrome and flags h…
- `tools/shoot.mjs` — end-s25-tfix renderer (copy of end-s28-fix1 harness shoot.mjs, live tree): loads the REAL composition (index.html -> src/main.js) in the same headless Chrome and flags h…
- `tools/hwarp.py` — hwarp.py F out.jpg x0 y0 x1 y1 [scale] [step] [--img path] [--body]: the frame warped into the 104.60 head space (p_head -> frame = CAM[f] .

### `snapshots-s25-fix1-tools/` — tools, 8 files
s25 scratch harness: render film frames headless without a server (requests are answered from disk by puppeteer request interception).

- `render.mjs` — s25 scratch harness: render film frames headless without a server (requests are answered from disk by puppeteer request interception).
- `dbg.mjs` — node dbg.mjs OUT key[,key…] [modulePath] -> OUT/d-<key>.png : a drawing painted alone at its key-frame placement
- `score.py` — score.py OUTDIR [--pairs] [--box x0 y0 x1 y1] [--sheet N] -- score every rNNNNN.png in OUTDIR against source frame N metric: grayscale mean \|diff\| after gaussian sigma 8…
- `gcrop.py` — gcrop.py F x0 y0 x1 y1 out [scale] [step] [dbgkey]: source (or drawing) crop with a labelled grid

### `snapshots-s25-fix2-tools/` — tools, 6 files
node dbg.mjs OUT key[,key…] [modulePath] -> OUT/d-<key>.png : a drawing painted alone at its key-frame placement

- `dbg.mjs` — node dbg.mjs OUT key[,key…] [modulePath] -> OUT/d-<key>.png : a drawing painted alone at its key-frame placement
- `pairs.py` — pairs.py : drawing (d-KEY.png) vs source crop with a grid, for each head
- `reg.py` — reg.py RDIR F "x0 y0 x1 y1" ["x0 y0 x1 y1" ...] -> mean RGB (and gray std) render vs source per box
- `dbg.html`

### `snapshots-s25-meas/` — measurement / study, 2 files
s25 v2 — the page's light in this shot: a coarse gain grid (nx × ny nodes over the screen, frame px, bilinear), fitted by least squares on 10 ungraded frames (source ≈ g…

- `light.js.bak` — s25 v2 — the page's light in this shot: a coarse gain grid (nx × ny nodes over the screen, frame px, bilinear), fitted by least squares on 10 ungraded frames (source ≈ g…

### `snapshots-s25-tools/` — tools, 33 files
smokefit.py F0 F1 -- the chaos smoke as soft gaussian puffs per frame: the brightness the frame adds over the clean chaos plate (approximately ungraded: S-curve, vignett…

**Produced runtime data:** `src/shots/s25/v2/` (6 files: cracks2.js, drawings.js, headtrack.js, …), `src/shots/s25/v2/data/` (36 files: c308B.js, closed.js, crouchB.js, …)

- `smokefit.py` — smokefit.py F0 F1 -- the chaos smoke as soft gaussian puffs per frame: the brightness the frame adds over the clean chaos plate (approximately ungraded: S-curve, vignett…
- `extract3.py` — extract3.py NAME FRAME HULLKEY [opts json] -- measure the GEOMETRY and LIGHT of one owl pose on its source frame: hull : the figure's outline rings (the earlier pass's m…
- `lightfit.py` — lightfit.py RENDERDIR f,f,f -- the page's light in this shot as a coarse multiplicative gain grid (NX x NY nodes over the screen, bilinear), least squares on ungraded fr…
- `scisfit.py` — scisfit.py -- python mirror of src/shots/s25/v2/scis.js geometry + a chamfer / brightness fit of a placement to a source frame.

### `scratch-build/` — loose scripts from an agent scratchpad, 8 files
screen region approx (x 140..2060, y 100..900)

- `score.py` — screen region approx (x 140..2060, y 100..900)
- `sheet.py`
- `exact.py`
- `vs.py` — usage: vs.py DIR IDX out.jpg [x0 y0 x1 y1] [--w W] -> render (top) over source (bottom), crop, + diff score

### `scratch-build-s25k/` — tracing / fitting, 30 files
numpy port of src/lib/post.js (no grain).

- `grade.py` — numpy port of src/lib/post.js (no grain).
- `segm2.py`
- `segm.py`
- `tr_hx.js` — s25 traced drawing 'tr_hx' (source frame 104.60 s): control data only — outline rings, value iso-contours and ink centre-lines measured on that frame (no pixels).

### `scratch-ending/` — loose scripts from an agent scratchpad, 2 files
s25 v2 — the page's light in this shot: a coarse gain grid (nx × ny nodes over the screen, frame px, bilinear), fitted by least squares on 10 ungraded frames (source ≈ g…

- `echo2.bak`
- `light.js.bak` — s25 v2 — the page's light in this shot: a coarse gain grid (nx × ny nodes over the screen, frame px, bilinear), fitted by least squares on 10 ungraded frames (source ≈ g…
