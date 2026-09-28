# s28 — 129.3–136.0 s: From behind the laptop: asleep, smiling, in the sun

Status **close**, method **traced** (see `docs/FIDELITY.md` and `docs/fidelity/s28.md`). The render code is `src/shots/s28.js` and `src/shots/s28/`.

## How the data in `src/shots/s28/` was made

The data files the render loads name the script that generated them in their header comment. Those scripts, at their new paths:

| producer script (in `tracing/`) | runtime files it produced |
|---|---|
| [`s28/snapshots-s28t-tools/faintink.py`](snapshots-s28t-tools/faintink.py) | `src/shots/s28/keys/` (34 files: fig12932.js, fig12952.js, fig12972.js, …) |
| [`s28/trace-scripts-s28-tools/buildkeys.py`](trace-scripts-s28-tools/buildkeys.py) | `src/shots/s28/keys/` (11 files: index.js, lock13144.js, lock13260.js, …) |
| [`s28/snapshots-end-s28-fix1-tools/fixbeanie.py`](snapshots-end-s28-fix1-tools/fixbeanie.py) | `src/shots/s28/keys/` (10 files: lock13144.js, lock13260.js, lock13312.js, …) |
| [`s28/snapshots-s28t-tools/retrace_fig.py`](snapshots-s28t-tools/retrace_fig.py) | `src/shots/s28/keys/` (10 files: fig12932.js, fig12952.js, fig12972.js, …) |
| [`s28/snapshots-s28t-tools/retrace_room.py`](snapshots-s28t-tools/retrace_room.py) | `src/shots/s28/keys/` (10 files: room12932.js, room12952.js, room12972.js, …) |
| [`s28/trace-scripts-s28-k-tools/lockrooms.py`](trace-scripts-s28-k-tools/lockrooms.py) | `src/shots/s28/keys/room13160.js`, `src/shots/s28/keys/room13280.js`, `src/shots/s28/keys/room13420.js`, `src/shots/s28/keys/room13560.js` |
| [`s28/snapshots-end-s28-fix1-tools/fixfleck.py`](snapshots-end-s28-fix1-tools/fixfleck.py) | `src/shots/s28/keys/room13032.js`, `src/shots/s28/keys/room13052.js` |
| [`s28/snapshots-end-s28-fix1-tools/fixstrand.py`](snapshots-end-s28-fix1-tools/fixstrand.py) | `src/shots/s28/keys/fig13032.js`, `src/shots/s28/keys/fig13052.js` |
| [`s28/snapshots-end-s28-fix1-tools/trace_cab.py`](snapshots-end-s28-fix1-tools/trace_cab.py) | `src/shots/s28/cabpatch.js` |
| [`s28/snapshots-end-s28-fix1-tools/trace_lidstrip.py`](snapshots-end-s28-fix1-tools/trace_lidstrip.py) | `src/shots/s28/lidstrip.js` |
| [`s28/snapshots-end-s28-fix1-tools/trace_owl.py`](snapshots-end-s28-fix1-tools/trace_owl.py) | `src/shots/s28/owlpatch.js` |
| [`s28/snapshots-s28t-tools/k/emitresid.py`](snapshots-s28t-tools/k/emitresid.py) (same-named copies also in: `trace-scripts-s28-k-tools/`) | `src/shots/s28/resid.js` |
| [`s28/snapshots-s28t-tools/t/billboards.py`](snapshots-s28t-tools/t/billboards.py) (same-named copies also in: `trace-scripts-s28-tools/`) | `src/shots/s28/depth.js` |
| [`s28/snapshots-s28t-tools/trace_bottom.py`](snapshots-s28t-tools/trace_bottom.py) | `src/shots/s28/botpatch.js` |
| [`s28/snapshots-s28t-tools/trace_left.py`](snapshots-s28t-tools/trace_left.py) | `src/shots/s28/leftpatch.js` |
| [`s28/snapshots-s28t-tools/trace_mug.py`](snapshots-s28t-tools/trace_mug.py) | `src/shots/s28/mug.js` |
| [`s28/trace-scripts-s28-k-tools/corr.py`](trace-scripts-s28-k-tools/corr.py) | `src/shots/s28/corr.js` |
| [`s28/trace-scripts-s28-k-tools/keygain.py`](trace-scripts-s28-k-tools/keygain.py) | `src/shots/s28/keygain.js` |
| [`s28/trace-scripts-s28-k-tools/lidcol.py`](trace-scripts-s28-k-tools/lidcol.py) | `src/shots/s28/lidcol.js` |
| [`s28/trace-scripts-s28-k-tools/resid.py`](trace-scripts-s28-k-tools/resid.py) | `src/shots/s28/resid.js` |
| [`s28/trace-scripts-s28-tools/depthgrids.py`](trace-scripts-s28-tools/depthgrids.py) | `src/shots/s28/depth.js` |

Scripts whose code writes into `src/shots/s28/` (found from the output paths in their source; `{…}` = a name filled in at run time):

| script (in `tracing/`) | writes |
|---|---|
| [`s28/snapshots-s28t-tools/corrfit.py`](snapshots-s28t-tools/corrfit.py) | `src/shots/s28/corr.js` |
| [`s28/snapshots-s28t-tools/regain.py`](snapshots-s28t-tools/regain.py) | `src/shots/s28/keygain.js` |
| [`s28/trace-scripts-s28-k-tools/emitresid.py`](trace-scripts-s28-k-tools/emitresid.py) | `src/shots/s28/resid.js` |
| [`s28/snapshots-s28t-tools/k/lockrooms.py`](snapshots-s28t-tools/k/lockrooms.py) | `src/shots/s28/keys/{name}.js` |
| [`s28/snapshots-s28t-tools/k/retrace129.py`](snapshots-s28t-tools/k/retrace129.py) | `src/shots/s28/keys/{name}.js` |
| [`s28/snapshots-s28t-tools/k/retrace_rooms.py`](snapshots-s28t-tools/k/retrace_rooms.py) | `src/shots/s28/keys/{name}.js` |
| [`s28/snapshots-s28t-tools/t/buildkeys.py`](snapshots-s28t-tools/t/buildkeys.py) | `src/shots/s28/keys/{name}.js` |
| [`s28/trace-scripts-s28-k-tools/retrace129.py`](trace-scripts-s28-k-tools/retrace129.py) | `src/shots/s28/keys/{name}.js` |
| [`s28/trace-scripts-s28-k-tools/retrace_rooms.py`](trace-scripts-s28-k-tools/retrace_rooms.py) | `src/shots/s28/keys/{name}.js` |

## Index of folders (21)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `src-s28/` — trace / measurement scripts that lived next to the shot data in src/ (not loaded by the render), 17 files
s28 measurements (numbers only, no image data), carried over from the earlier s28 passes and re-checked this pass (snapshots/s28d-tools/chkplane.py, chklid.py): CAM per …

- `drawn/measure.js` — s28 measurements (numbers only, no image data), carried over from the earlier s28 passes and re-checked this pass (snapshots/s28d-tools/chkplane.py, chklid.py): CAM per …
- `drawn/keysData.js` — s28 orbit key drawings: coarse measured outlines (frame px of each key's own source frame), at most 40 vertices each.
- `drawn/trackmap.js` — s28: the measured figure motion of a key drawing (tracks.js) as a point map key px -> frame(t) px, and its inverse.
- `drawn/figL.js` — s28 locked view: the designer asleep on his arms (131.36-136.00), drawn in locked-frame px.

### `trace-scripts-s28-harness/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 1 file
Copy of the composition’s index.html (+ hyperframes.json/meta.json) used to render this shot on its own; at the time `src/` and `assets/` were symlinked next to it, so the shot code it loaded is not duplicated here.

- `index.html` — The Apprentice — drawn in code

### `trace-scripts-s28-harness-dbg/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 1 file
Copy of the composition’s index.html (+ hyperframes.json/meta.json) used to render this shot on its own; at the time `src/` and `assets/` were symlinked next to it, so the shot code it loaded is not duplicated here.

- `index.html` — The Apprentice — drawn in code

### `trace-scripts-s28-k-tools/` — tools, 36 files
resid.json -> src/shots/s28/resid.js (base64 int8, 0.5 px units; dx block then dy block, every 2nd vertex)

**Produced runtime data:** `src/shots/s28/corr.js`, `src/shots/s28/keygain.js`, `src/shots/s28/lidcol.js`, `src/shots/s28/resid.js`, `src/shots/s28/keys/room13160.js`, `src/shots/s28/keys/room13280.js`, `src/shots/s28/keys/room13420.js`, `src/shots/s28/keys/room13560.js`

- `emitresid.py` — resid.json -> src/shots/s28/resid.js (base64 int8, 0.5 px units; dx block then dy block, every 2nd vertex)
- `lockrooms.py` — Re-trace the four locked room keys with a tight hidden area: the matching locked figure key's own silhouette + 2 px (the camera does not move once locked, so the room ri…
- `keygain.py` — Per-key low-frequency colour gain for the orbit keys, measured at each key's own frame (where the key is drawn unwarped): pre-grade source / render, separately for the r…
- `resid.py` — Measure per-vertex screen-space residuals of s28's key re-projection during the orbit.

### `trace-scripts-s28-proto/` — tracing / fitting, 3 files
The sunlit room behind the sleeping designer, as the final (locked) camera of s28 sees it (131.36–136.0 s).

- `room.js` — The sunlit room behind the sleeping designer, as the final (locked) camera of s28 sees it (131.36–136.0 s).
- `figure.js` — The sleeping designer in the final s28 view (frame coordinates of the locked camera).
- `desk.js` — The desk top in the final s28 view: surface, papers, the book and the cable on the left.

### `trace-scripts-s28-tools/` — tools, 91 files
Build all s28 key drawings (vector traces) and write them as JS data modules in src/shots/s28/keys/.

**Produced runtime data:** `src/shots/s28/depth.js`, `src/shots/s28/keys/` (11 files: index.js, lock13144.js, lock13260.js, …)

- `buildkeys.py` — Build all s28 key drawings (vector traces) and write them as JS data modules in src/shots/s28/keys/.
- `depthgrids.py` — Per-key depth grids (ray parameter s along each key camera's pixel rays) for the room and figure key drawings.
- `billboards.py` — Objects standing on the desk (not on any fitted plane): vertical billboards through their measured base point.
- `traceview.py` — Vector trace of an area of a SOURCE frame (measurement -> drawing data): regions: flat-colour areas of the ink-free colour field (felzenszwalb segmentation + RAG merge),…

### `prev-builds-s28-fix1-prev/` — an earlier build of the shot that a later pass replaced (kept for reference), 15 files
s28 orbit key drawings: measured outline parts (frame px of each key's own source frame), simplified polygons.

- `keysData.js` — s28 orbit key drawings: measured outline parts (frame px of each key's own source frame), simplified polygons.
- `measure.js` — s28 measurements (numbers only, no image data), carried over from the earlier s28 passes and re-checked this pass (snapshots/s28d-tools/chkplane.py, chklid.py): CAM per …
- `roomL.js` — s28 locked view: the room as seen from the locked camera (131.36-136.00), drawn in locked-frame px.
- `figL.js` — s28 locked view: the designer asleep on his arms (131.36-136.00), drawn in locked-frame px.

### `prev-builds-s28-prev/` — an earlier build of the shot that a later pass replaced (kept for reference), 2 files
s28 (129.30–136.00): from behind the laptop, the designer asleep at his desk in the sunlit morning room.

- `s28.traced.js` — s28 (129.30–136.00): from behind the laptop, the designer asleep at his desk in the sunlit morning room.

### `snapshots-end-s28-fix1-harness/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 4 files
s28 (129.30–136.00): from behind the laptop, the designer asleep at his desk in the sunlit morning room.

- `s28w.js` — s28 (129.30–136.00): from behind the laptop, the designer asleep at his desk in the sunlit morning room.
- `index.html` — s28t harness
- `shoot.mjs` — end-s28-rev1 renderer: loads the REAL composition (index.html -> src/main.js) in the same headless Chrome and flags hyperframes snapshot uses, but with no protocol timeo…
- `r.sh` — end-s28-fix1: render source frame indices through this harness (s28w.js working copy).

### `snapshots-end-s28-fix1-tools/` — tools, 16 files
end-s28-fix1: the bedside cabinet and wall right of his shoulder (x 1440-1690, y 420-750).

**Produced runtime data:** `src/shots/s28/cabpatch.js`, `src/shots/s28/lidstrip.js`, `src/shots/s28/owlpatch.js`, `src/shots/s28/keys/` (14 files: fig13032.js, fig13052.js, lock13144.js, …)

- `trace_cab.py` — end-s28-fix1: the bedside cabinet and wall right of his shoulder (x 1440-1690, y 420-750).
- `trace_owl.py` — end-s28-fix1: the owl and the speaker cabinet behind him, 129.32-129.40, as their own layer: one trace per source frame of the non-figure part of the box right of the fi…
- `trace_lidstrip.py` — end-s28-fix1: the strip just outside the laptop lid's LEFT edge in the locked view (bookshelf, pink box, cable): every room key hides it (behind the lid) and filled it w…
- `fixbeanie.py` — end-s28-fix1: the beanie's lit right edge keyline (x 1440-1600, y 120-260) is broken in most locked figure keys (the key's ink was traced only inside its silhouette, and…

### `snapshots-end-s28-rev1-final/` — the shot build after a pass (+ the scripts used in it), 4 files
end-s28-rev1 renderer: loads the REAL composition (index.html -> src/main.js) in the same headless Chrome and flags hyperframes snapshot uses, but with no protocol timeo…

- `tools/experiment-switches.diff`
- `tools/shoot.mjs` — end-s28-rev1 renderer: loads the REAL composition (index.html -> src/main.js) in the same headless Chrome and flags hyperframes snapshot uses, but with no protocol timeo…
- `tools/metrics.py` — per-frame metrics: new render (end-s28-rev1-all) and baseline film.mp4 vs source, sigma 4 / 12 blurred abs diff (8-bit) and mean deltaE (CIE76 on blurred Lab); plus fram…
- `tools/pairs.py` — triptychs new \| baseline film.mp4 \| source for given frame indices, labelled; optional crop x0 y0 x1 y1 and width

### `snapshots-s28-fix1-harness/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 1 file
s28 fix1 harness

- `index.html` — s28 fix1 harness

### `snapshots-s28-fix1-work/` — tracing / fitting, 16 files
s28 fix1: MEASURE the hair of a source frame as a coarse mass outline (<= N vertices) plus a short list of lock centre-lines (<= 5 points each, with a root width) -- spa…

- `hairmeas.py` — s28 fix1: MEASURE the hair of a source frame as a coarse mass outline (<= N vertices) plus a short list of lock centre-lines (<= 5 points each, with a root width) -- spa…
- `massfit.py` — s28 fix1: MEASURE a coarse outline (<= N vertices) of a dark region of a source frame: dark pixels inside a hand-placed region, bridged by a morphological close (so stra…
- `keyerr.py` — per-frame figure-region blurred error for forced-key renders.
- `simplify.mjs` — s28 fix1: reduce the measured region outlines to coarse outlines (<= 40 vertices, outer ring only).

### `snapshots-s28-fix2-final/` — the shot build after a pass (+ the scripts used in it), 13 files
s28 fix2: MEASURE a coarse outline (<= maxv vertices) of a region class in a source frame (numbers only, for drawing by hand on top).

- `tools/fit.py` — s28 fix2: MEASURE a coarse outline (<= maxv vertices) of a region class in a source frame (numbers only, for drawing by hand on top).
- `tools/backfit.py` — fit the (dx, dy) shift that maps the render's hood back contour (top of the hood per column) onto the source's.
- `tools/silh.py` — hood-silhouette comparison: per row leftmost green-hood x and per column topmost hood y, render vs source.
- `tools/acorr.mjs` — key A orbit correction: anchors on key A's left/back hood outline (129.32 px) and, per time, their displacement onto the source's silhouette mapped back through the key-…

### `snapshots-s28d-harness/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 1 file
Copy of the composition’s index.html (+ hyperframes.json/meta.json) used to render this shot on its own; at the time `src/` and `assets/` were symlinked next to it, so the shot code it loaded is not duplicated here.

- `index.html` — s28 harness

### `snapshots-s28d-keys/` — tracing / fitting, 3 files

- `kA.py`
- `kC.py`
- `kB.py`

### `snapshots-s28d-tools/` — tools, 28 files
keyfig.py T 'poly x,y ...' out_prefix [--lid 1] [--eps 2] Measured OUTLINES of the figure at a key frame: the whole silhouette (every figure class inside the hand polygo…

- `keyfig.py` — keyfig.py T 'poly x,y ...' out_prefix [--lid 1] [--eps 2] Measured OUTLINES of the figure at a key frame: the whole silhouette (every figure class inside the hand polygo…
- `figtrack.py` — figtrack.py TK T0 T1 'x,y x,y ...' out.json -- the figure's motion around a key frame: KLT points inside the hand polygon (figure at TK, lid excluded), tracked frame to …
- `seg.py` — Measure the OUTLINE of one colour region of a source frame as a simplified polygon (for hand-built shapes).
- `keybuild.py` — keybuild.py spec.py out.json -- measure the outline parts of one key drawing from a spec: T = key time; PARTS = [(name, kind, args...)] kind 'snap' : (name, 'snap', 'x,y…

### `snapshots-s28t-harness/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 2 files
s28t scratch render through the harness.

- `index.html` — s28t harness
- `r.sh` — s28t scratch render through the harness.

### `snapshots-s28t-hdbg/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 2 files
s28t debug render (dbg.json switches).

- `index.html` — s28t harness
- `r.sh` — s28t debug render (dbg.json switches).

### `snapshots-s28t-tools/` — tools, 127 files
s28t: the bottom strip of the frame (y 836-946: the near desk, papers, cable, laptop base) for 129.32-130.48.

**Produced runtime data:** `src/shots/s28/` (5 files: botpatch.js, depth.js, leftpatch.js, …), `src/shots/s28/keys/` (34 files: fig12932.js, fig12952.js, fig12972.js, …)

- `trace_bottom.py` — s28t: the bottom strip of the frame (y 836-946: the near desk, papers, cable, laptop base) for 129.32-130.48.
- `retrace_room.py` — s28t: re-trace the orbit room keys: hidden = the refined figure silhouette + 5 px, the lid, and (129.32-129.92) the mug, which is now its own layer (mug.js).
- `retrace_fig.py` — s28t: re-trace the orbit figure keys inside the refined silhouettes (sil_new.json), with the build's own settings (buildkeys.py): vector trace of the source frame -> src…
- `trace_left.py` — s28t: the strip at the left edge, 129.32-129.84 (bookshelf, chair, wainscot): no room key sees all of it and the chair does not re-project well, so each of those source …

### `scratch-build/` — loose scripts from an agent scratchpad, 5 files
region error on 6x3 grid at sigma 8

- `metr.py` — region error on 6x3 grid at sigma 8
- `fd_dbg.py` — vertical residual: epipolar consistency
- `temporal.py`
- `batch.sh` — batch.sh name "t1,t2,..." -> snapshots/s28-rev1-<name>, jpgs + metrics, pngs removed
