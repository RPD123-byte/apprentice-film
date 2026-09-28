# s19 — 57.32–63.12 s: Low angle: the note card propped up, the owl tumbles, dusts off, lifts it

Status **approx**, method **drawn** (see `docs/FIDELITY.md` and `docs/fidelity/s19.md`). The render code is `src/shots/s19.js` and `src/shots/s19/`.

## How the data in `src/shots/s19/` was made

The data files the render loads name the script that generated them in their header comment. Those scripts, at their new paths:

| producer script (in `tracing/`) | runtime files it produced |
|---|---|
| [`s19/snapshots-s19b-tools/shapefit.py`](snapshots-s19b-tools/shapefit.py) | `src/shots/s19/draw/posefit.js` |

## Index of folders (16)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `src-s19/` — trace / measurement scripts that lived next to the shot data in src/ (not loaded by the render), 4 files
s19 owl: for most of the shot the owl is seen from BEHIND (it sits and stands facing the card), which the kit's rig does not draw, so this module paints a back view from…

- `owl.js` — s19 owl: for most of the shot the owl is seen from BEHIND (it sits and stands facing the card), which the kit's rig does not draw, so this module paints a back view from…
- `room.js` — s19 room: the floor-level view among the gear (57.32–63.12).
- `carry.js` — s19 carry owl (62.32–63.12): three-quarter view facing right, walking off to the right under the lifted card.
- `feathers.js` — s19 feather wings: long pointed, layered flight feathers (the source's wings are fans of tapered primaries and secondaries under a band of coverts, not rounded paddles).

### `trace-scripts-s19-dev/` — work folder, 8 files
s19 harness: load the shot once in headless Chrome (files via request interception), render graded frames at times.

- `dev.mjs` — s19 harness: load the shot once in headless Chrome (files via request interception), render graded frames at times.
- `harness.html`
- `head.html`
- `pair.py` — pair renders r-T.png in a dir with source frames: pair-T.jpg (render \| source), vertical stack option, and blurred MAE.

### `trace-scripts-s19-fix1-dev/` — work folder, 5 files
s19 harness: load the shot once in headless Chrome (files via request interception), render graded frames at times.

- `keep.js`
- `dev.mjs` — s19 harness: load the shot once in headless Chrome (files via request interception), render graded frames at times.
- `harness.html`
- `blend.py` — blend.py dir T x0 y0 x1 y1 [scale]: 50/50 overlay of render and source, plus edges of source in red

### `trace-scripts-s19-fix1-src/` — work folder, 3 files
gridpair.py T x0 y0 x1 y1 out [renderpng]: source (and optional render) crop with a 50px grid labelled in frame px

- `gridpair.py` — gridpair.py T x0 y0 x1 y1 out [renderpng]: source (and optional render) crop with a 50px grid labelled in frame px
- `g50.py` — g50.py T x0 y0 x1 y1 out [render.png]: 1:1 crop, 50px grid, every line labelled with its frame coordinate
- `dump.py`

### `trace-scripts-s19-fix2-dev/` — work folder, 11 files
s19 room: the floor-level view among the gear (57.32–63.12).

- `room.fix1-final.js` — s19 room: the floor-level view among the gear (57.32–63.12).
- `dev2.mjs` — s19 harness: load the shot once in headless Chrome (files via request interception), render graded frames at times.
- `dev.mjs` — s19 harness: load the shot once in headless Chrome (files via request interception), render graded frames at times.
- `paperedge.py` — fit the paper's four straight edges (keyline -> paper transition) in a frame; print the corner intersections

### `trace-scripts-s19-fix2-ref/` — measurement / study, 8 files

- `zoom.py`

### `trace-scripts-s19-ref/` — measurement / study, 28 files
predicted edges from prev pose

- `fit3d.py` — predicted edges from prev pose
- `rigidfit.py` — owl lower-body exclusion boxes (root x,y from the animation, frame px)
- `liftfit.py` — hand readings (frame px): textbox TL, TR, BR, and y of the card bottom edge at x~1300, x of left/right edges at a y
- `ioufit.py` — rounded card: approximate by the quad

### `trace-scripts-s19-rev1-dev/` — comparison / review evidence scripts, 2 files
s19 harness: load the shot once in headless Chrome (files via request interception), render graded frames at times.

- `dev.mjs` — s19 harness: load the shot once in headless Chrome (files via request interception), render graded frames at times.
- `harness.html`

### `prev-builds-s19b-prev/` — an earlier build of the shot that a later pass replaced (kept for reference), 39 files
s19 (57.32–63.12): low on the floor among the gear.

- `s19.traced.js` — s19 (57.32–63.12): low on the floor among the gear.
- `src-legacy/roomtrace.js` — s19 room: redraws the traced scratchboard (roomdata.js) — broad lit areas as posterised even-odd outlines, then the dark strokes ('darken') and the white strokes ('light…
- `src-legacy/trace/linemeas.py` — Card pose from its keylines (measurement only).
- `src-legacy/trace/trace_owl.py` — Trace the owl on source key frames (measurement only) into the same layered stroke format as the room: posterised base tone outlines + dark strokes + bright strokes, ins…

### `snapshots-s19-fix1-tools/` — tools, 27 files
s19 back-view pose corrections fitted to the source silhouettes (snapshots/s19b-tools/shapefit.py): for each key pose, an extra placement d = [dx, dy, scale about the bo…

- `orig-s19/draw/posefit.js` — s19 back-view pose corrections fitted to the source silhouettes (snapshots/s19b-tools/shapefit.py): for each key pose, an extra placement d = [dx, dy, scale about the bo…
- `shmeas.py` — largest contiguous run (allow gaps < 25)
- `orig-s19/draw/room.js` — s19 room (57.32–63.12), redrawn by hand in code.
- `orig-s19/draw/back2.js` — s19 owl seen from BEHIND (58.00–62.28: it lands, skids, sits, gets up, stands and lifts the card with its back to us).

### `snapshots-s19-fix2-final/` — the shot build after a pass (+ the scripts used in it), 27 files
s19 back-view pose corrections fitted to the source silhouettes (snapshots/s19b-tools/shapefit.py): for each key pose, an extra placement d = [dx, dy, scale about the bo…

- `tools/orig/s19/draw/posefit.js` — s19 back-view pose corrections fitted to the source silhouettes (snapshots/s19b-tools/shapefit.py): for each key pose, an extra placement d = [dx, dy, scale about the bo…
- `tools/cells.py` — cells.py dir t : blurred (sigma 8) signed mean diff render-source per 100px cell (from r-t.png)
- `tools/orig/s19/draw/room.js` — s19 room (57.32–63.12), redrawn by hand in code.
- `tools/orig/s19/draw/back2.js` — s19 owl seen from BEHIND (58.00–62.28: it lands, skids, sits, gets up, stands and lifts the card with its back to us).

### `snapshots-s19-rev1-ana/` — measurement / study, 2 files
msheet.py dir t0 t1 x0 y0 x1 y1 scale out

- `msheet.py` — msheet.py dir t0 t1 x0 y0 x1 y1 scale out
- `crop.py` — usage: crop.py dir t x0 y0 x1 y1 out [scale]

### `snapshots-s19-rev2-cmp/` — comparison / review evidence scripts, 6 files
usage: crop.py T x0 y0 x1 y1 out [scale] [grid]

- `review/cells.py`
- `review/mask2.py`
- `review/mask.py`
- `review/crop.py` — usage: crop.py T x0 y0 x1 y1 out [scale] [grid]

### `snapshots-s19b-study/` — measurement / study, 1 file

- `dust.js.txt`

### `snapshots-s19b-tools/` — tools, 39 files
shapefit.py t1,t2,... [--show out.jpg] [--iters N] [--head]: fit placement + the body's 8 radial factors (+ head size) of each key row's pose to the source silhouette (I…

**Produced runtime data:** `src/shots/s19/draw/posefit.js`

- `shapefit.py` — shapefit.py t1,t2,... [--show out.jpg] [--iters N] [--head]: fit placement + the body's 8 radial factors (+ head size) of each key row's pose to the source silhouette (I…
- `silmask.py` — source owl silhouette while the card stands (57.40–61.44): background difference against the owl-free 57.32/57.36
- `silfit.py` — silfit.py t1,t2,... [--scale] [--show out.jpg]: fit an extra (dx, dy, s) per key row to maximise silhouette IoU
- `dustfit2.py` — dustfit2.py: per source frame, the dust as circles (58.16–58.68) and curls (58.72–58.92): for each connected piece its centroid, equivalent radius and principal angle.

### `scratch-build/` — loose scripts from an agent scratchpad, 2 files

- `t.mjs`
- `pose.mjs`
