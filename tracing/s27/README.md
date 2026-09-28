# s27 — 117.52–129.3 s: Pull back into the morning room; pan to him asleep; the owl on the laptop

Status **close**, method **traced** (see `docs/FIDELITY.md` and `docs/fidelity/s27.md`). The render code is `src/shots/s27.js` and `src/shots/s27/`.

## How the data in `src/shots/s27/` was made

The data files the render loads name the script that generated them in their header comment. Those scripts, at their new paths:

| producer script (in `tracing/`) | runtime files it produced |
|---|---|
| [`s27/trace-scripts-s27-k-tools/codec.py`](trace-scripts-s27-k-tools/codec.py) | `src/shots/s27/` (6 files: codec.js, designerData2.js, owlTrace.js, …), `src/shots/s27/dkeys/` (7 files: d_127_88.js, d_128_2.js, d_128_44.js, …), `src/shots/s27/keys/` (9 files: k_120_6.js, k_121_2.js, k_121_6.js, …) |
| [`s27/snapshots-end-s27-tfix-tools/plate.py`](snapshots-end-s27-tfix-tools/plate.py) | `src/shots/s27/okeys/` (13 files: o_127_88.js, o_128_00.js, o_128_12.js, …) |
| [`s27/trace-scripts-s27-k-tools/room_vec.py`](trace-scripts-s27-k-tools/room_vec.py) | `src/shots/s27/designerData2.js`, `src/shots/s27/roomA.js`, `src/shots/s27/roomB.js`, `src/shots/s27/roomC.js`, `src/shots/s27/keys/` (9 files: k_120_6.js, k_121_2.js, k_121_6.js, …) |
| [`s27/snapshots-end-s27-tfix-tools/room_vec.py`](snapshots-end-s27-tfix-tools/room_vec.py) (same-named copies also in: `trace-scripts-s27-k-tools/`, `trace-scripts-s27t-tools/`) | `src/shots/s27/dkeys/index.js`, `src/shots/s27/keys/index.js` |
| [`s27/trace-scripts-s27-k-tools/des_median.py`](trace-scripts-s27-k-tools/des_median.py) | `src/shots/s27/designerData2.js` |
| [`s27/trace-scripts-s27-k-tools/des_track.py`](trace-scripts-s27-k-tools/des_track.py) | `src/shots/s27/data3.js` |
| [`s27/trace-scripts-s27-k-tools/deskey_mask.py`](trace-scripts-s27-k-tools/deskey_mask.py) | `src/shots/s27/dkeys/index.js` |
| [`s27/trace-scripts-s27-k-tools/export3.py`](trace-scripts-s27-k-tools/export3.py) | `src/shots/s27/data3.js` |
| [`s27/trace-scripts-s27-meas/export_data.py`](trace-scripts-s27-meas/export_data.py) | `src/shots/s27/data.js` |
| [`s27/trace-scripts-s27-meas/export_data2.py`](trace-scripts-s27-meas/export_data2.py) | `src/shots/s27/data2.js` |
| [`s27/trace-scripts-s27t-tools/deckgain.py`](trace-scripts-s27t-tools/deckgain.py) | `src/shots/s27/deckgain.js` |
| [`s27/trace-scripts-s27t-tools/desfix.py`](trace-scripts-s27t-tools/desfix.py) | `src/shots/s27/desfix.js` |
| [`s27/trace-scripts-s27t-tools/keymove.py`](trace-scripts-s27t-tools/keymove.py) | `src/shots/s27/speaker.js` |

Scripts whose code writes into `src/shots/s27/` (found from the output paths in their source; `{…}` = a name filled in at run time):

| script (in `tracing/`) | writes |
|---|---|
| [`s27/snapshots-end-s27-fix1-tools/chair_trace.py`](snapshots-end-s27-fix1-tools/chair_trace.py) | `src/shots/s27/chairTrace.js` |
| [`s27/snapshots-end-s27-fix1-tools/pageowl_trace.py`](snapshots-end-s27-fix1-tools/pageowl_trace.py) | `src/shots/s27/pageOwl.js` |
| [`s27/snapshots-end-s27-tfix-tools/meshes.py`](snapshots-end-s27-tfix-tools/meshes.py) | `src/shots/s27/orbitMesh.js` |
| [`s27/snapshots-s27d-tools/export_mesh.py`](snapshots-s27d-tools/export_mesh.py) | `src/shots/s27/drawn/desmesh.js` |
| [`s27/snapshots-s27d-tools/export_tracks.py`](snapshots-s27d-tools/export_tracks.py) | `src/shots/s27/drawn/tracks.js` |
| [`s27/trace-scripts-s27-meas/des_vec2.py`](trace-scripts-s27-meas/des_vec2.py) | `src/shots/s27/designerData.js` |
| [`s27/trace-scripts-s27-meas/export_des.py`](trace-scripts-s27-meas/export_des.py) | `src/shots/s27/designerData.js` |

## Index of folders (24)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `src-s27/` — trace / measurement scripts that lived next to the shot data in src/ (not loaded by the render), 8 files
s27 (drawn) — hand-measured keyframes (read off 2–3x gridded crops of the source; frame px).

- `drawn/keys.js` — s27 (drawn) — hand-measured keyframes (read off 2–3x gridded crops of the source; frame px).
- `drawn/designer.js` — s27 (drawn) — the designer asleep on his folded arms (the user's character), drawn in code.
- `drawn/room.js` — s27 (drawn) — the morning room's back wall, drawn in code in REFERENCE coordinates (= frame px of the held view at 119.6 s).
- `drawn/owl.js` — s27 (drawn) — the colour owl (the user's character): a round chibi owl — wide head with a warm-grey cap, a small ear tuft, a heart-shaped cream facial disc with a grey V…

### `trace-scripts-s27-k-mask/` — tracing / fitting, 2 files

### `trace-scripts-s27-k-tools/` — tools, 25 files
export the new s27 tracks into src/shots/s27/data3.js

**Produced runtime data:** `src/shots/s27/` (7 files: codec.js, data3.js, designerData2.js, …), `src/shots/s27/dkeys/` (8 files: d_127_88.js, d_128_2.js, d_128_44.js, …), `src/shots/s27/keys/` (10 files: index.js, k_120_6.js, k_121_2.js, …)

- `export3.py` — export the new s27 tracks into src/shots/s27/data3.js
- `room_vec.py` — Trace a view of the room from the source (measurement -> vector data): temporal median of a static stretch (removes the film grain), un-graded to pre-grade colours; the …
- `des_track.py` — Track the designer's 12x9 control mesh on the source by template alignment (measurement only): template = source frame @125.0 inside his silhouette; for each frame the t…
- `deskey_mask.py` — deskey_mask.py T out.png [poly.json] : the SOURCE designer's silhouette at T (measurement only): sil125 warped through the tracked mesh (or a hand polygon), refined by G…

### `trace-scripts-s27-meas/` — measurement / study, 58 files
designer entry similarity (s, rot, tx, ty) of the 125.0 designer layer, chamfer-fitted 121.28-122.4, extrapolated before

**Produced runtime data:** `src/shots/s27/data.js`, `src/shots/s27/data2.js`

- `export_data2.py` — designer entry similarity (s, rot, tx, ty) of the 125.0 designer layer, chamfer-fitted 121.28-122.4, extrapolated before
- `export_data.py` — Writes src/shots/s27/data.js from the measurement JSONs (all numbers measured on the source film).
- `des_vec2.py` — Designer v2 measurement (125.0 s): ink layer (dark mask contours, sub-pixel), soft-line layer, colour regions.
- `export_des.py`

### `trace-scripts-s27-tools/` — tools, 3 files
Fast preview for s27: loads the composition in headless Chrome (files served by request interception, no server), calls window.__film.renderAt(t) and saves the #film can…

- `prev.mjs` — Fast preview for s27: loads the composition in headless Chrome (files served by request interception, no server), calls window.__film.renderAt(t) and saves the #film can…
- `metric.py` — metric.py outdir [sigma]: mean blurred colour error (CIE76 dE in Lab) render vs source for each r-T.png, plus a heat grid
- `pair.py` — pair.py outdir : render \| source pairs for every r-T.png in outdir (source frames from the scratch dump)

### `trace-scripts-s27t-tools/` — tools, 33 files
s27t pass (2026-09-27): the traced s27 restored as the active shot and fixed.

**Produced runtime data:** `src/shots/s27/deckgain.js`, `src/shots/s27/desfix.js`, `src/shots/s27/speaker.js`, `src/shots/s27/dkeys/index.js`, `src/shots/s27/keys/index.js`

- `desfix.py` — Per-view mesh correction for the designer key views of the end orbit (127.6-129.28), measurement only.
- `deckgain.py` — Fit a low-frequency colour gain for the laptop base's top face per key time: source / render on a 4x3 grid of base-cm cells (median per channel over the cell's pixels), …
- `room_vec.py` — Trace a view of the room from the source (measurement -> vector data): temporal median of a static stretch (removes the film grain), un-graded to pre-grade colours; the …
- `keymove.py` — Move traced polygons between a room key and the designer key of the same frame (same frame-px x2 coordinates).

### `prev-builds-s27-drawn-prev/` — an earlier build of the shot that a later pass replaced (kept for reference), 2 files
s27 (117.52–129.30): out of the screen into the sunny morning room — DRAWN rebuild.

- `s27.drawn.js` — s27 (117.52–129.30): out of the screen into the sunny morning room — DRAWN rebuild.

### `prev-builds-s27d-prev/` — an earlier build of the shot that a later pass replaced (kept for reference), 2 files
s27 (117.52–129.30): out of the screen into the sunny morning room.

- `s27.traced.js` — s27 (117.52–129.30): out of the screen into the sunny morning room.

### `snapshots-end-s27-fix1-final/` — the shot build after a pass (+ the scripts used in it), 1 file
end-s27-fix1: fix round 1 on s27 (117.52-129.30), against snapshots/end-s27-rev1-final.

### `snapshots-end-s27-fix1-tools/` — tools, 27 files
end-s27-fix1 (2026-09-27): fix round 1 on s27 (117.52-129.30).

**Writes into:** `src/shots/s27/chairTrace.js`, `src/shots/s27/pageOwl.js`

- `chair_trace.py` — Trace the chair back at the left edge of the end orbit (128.68-129.28) per source frame: mask by colour (dark red-brown, the component that reaches above the jacket's lo…
- `pageowl_trace.py` — Trace the page owl (registered, un-graded median in page px, pageowl_median.py) inside its mask: colour regions (k-means, posterized polygons, region-mean colours) + ink…
- `lidgen.py` — Write src/shots/s27/lidback.js from the source fit (lidfit_src.json) and the pre-grade colours.
- `lidfit2.py` — Lid back sunlit patch, per frame, in lid-back coords (the shot's own mapping, lidwarp.py).

### `snapshots-end-s27-rev1-final/` — the shot build after a pass (+ the scripts used in it), 5 files
end-s27-rev1: adversarial review (round 1) of s27 (117.52-129.30).

- `tools/harness.html` — end-s27-rev1 scratch harness (review only, not part of the film): s26 / s27 / s28 chosen by film time exactly as
- `tools/render_dbg.mjs` — end-s27-rev1 (review scratch): like render.mjs but renders each frame once per __s27dbg variant (s27 measuring hook).
- `tools/render.mjs` — end-s27-rev1 (review scratch): frame-exact renderer for harness.html.
- `tools/pairs2.py` — end-s27-rev1: rows of SRC \| NOW for frames and a crop.

### `snapshots-end-s27-tfix-final/` — the shot build after a pass (+ the scripts used in it), 1 file
end-s27-tfix (2026-09-27): targeted fixes on s27 (117.52-129.30) after the ending critic (snapshots/end-critic).

### `snapshots-end-s27-tfix-tools/` — tools, 32 files
end-s27-tfix (2026-09-27): targeted fix round on s27.

**Produced runtime data:** `src/shots/s27/dkeys/index.js`, `src/shots/s27/keys/index.js`, `src/shots/s27/okeys/` (13 files: o_127_88.js, o_128_00.js, o_128_12.js, …)

- `room_vec.py` — Trace a view of the room from the source (measurement -> vector data): temporal median of a static stretch (removes the film grain), un-graded to pre-grade colours; the …
- `plate.py` — end-s27-tfix: grain-free source plate at key frame K (measurement only): frames K-R..K+R brought onto K by the room mesh (flowmesh.fit) plus a small, smoothed dense DIS …
- `meshes.py` — end-s27-tfix: per-frame room meshes for the end orbit -> src/shots/s27/orbitMesh.js (numbers only).
- `flowmesh.py` — end-s27-tfix: smooth background warp between two source frames, as a mesh (measurement -> numbers).

### `snapshots-s27-fix1-tools/` — tools, 18 files
Pair harness renders with source frames: blurred CIE76 dE (sigma 8 and 2), side-by-side jpgs, per-frame table.

- `pair.py` — Pair harness renders with source frames: blurred CIE76 dE (sigma 8 and 2), side-by-side jpgs, per-frame table.
- `owleyes.py` — locate the owl's two eyes (dark round irises on the white disc) in source frames: prints eye centres, midpoint, spacing
- `maskcmp.py` — maskcmp.py render.png T out.jpg x0 y0 x1 y1 [scale]: dark-mask overlay: black=both, red=source only, blue=render only
- `gridc.py` — gridc.py T out.jpg x0 y0 x1 y1 [scale] [step] [--render file.png] -> crop with labelled grid (frame px)

### `snapshots-s27-fix2-harness/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 1 file
s27 fix2 harness

- `index.html` — s27 fix2 harness

### `snapshots-s27-fix2-tools/` — tools, 21 files
chained frame-to-frame homography of the designer (figure region) -> H mapping 129.0-frame px to frame px at t

- `figtrack.py` — chained frame-to-frame homography of the designer (figure region) -> H mapping 129.0-frame px to frame px at t
- `prev/s27.js` — s27 (117.52–129.30): out of the screen into the sunny morning room — DRAWN rebuild.
- `prev/room.js` — s27 (drawn) — the morning room's back wall, drawn in code in REFERENCE coordinates (= frame px of the held view at 119.6 s).
- `prev/designer.js` — s27 (drawn) — the designer asleep on his folded arms (the user's character), drawn in code.

### `snapshots-s27d-harness/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 1 file
Copy of the composition’s index.html (+ hyperframes.json/meta.json) used to render this shot on its own; at the time `src/` and `assets/` were symlinked next to it, so the shot code it loaded is not duplicated here.

- `index.html` — s27 harness

### `snapshots-s27d-parts/` — scripts, 1 file

- `index.html` — s27 harness

### `snapshots-s27d-timing/` — work folder, 1 file

- `index.html` — s27 harness

### `snapshots-s27d-tools/` — tools, 44 files
Export the measured s27 tracks (snapshots/s27d-meas/*.json) to src/shots/s27/drawn/tracks.js.

**Writes into:** `src/shots/s27/drawn/desmesh.js`, `src/shots/s27/drawn/tracks.js`

- `export_tracks.py` — Export the measured s27 tracks (snapshots/s27d-meas/*.json) to src/shots/s27/drawn/tracks.js.
- `export_mesh.py` — Export the designer's measured mesh warp (des_mesh*.json) to src/shots/s27/drawn/desmesh.js
- `klt_track2.py` — KLT planar tracker: H(t) maps reference-frame coords (T_REF) -> frame t.
- `bg_track.py` — Background (back wall) KLT track with dynamic masks: the laptop (screen H + base H, dilated), the designer (left of a measured boundary), the desk (below the desk/wall l…

### `snapshots-s27t-final/` — the shot build after a pass (+ the scripts used in it), 1 file
s27t pass (traced s27 restored + fixed), final comparison.

### `scratch-build/` — loose scripts from an agent scratchpad, 18 files
probe the s27 desk homographies (scratch; imports the shot's data modules only)

- `deskprobe.mjs` — probe the s27 desk homographies (scratch; imports the shot's data modules only)
- `lidedge.mjs` — print the lid quad's corners per frame 128.44-129.28 (same interpolation as s27.js lidCorners)
- `tstrip.py` — usage: tstrip.py out x0 y0 x1 y1 dir1 [dir2 ...] --tmin A --tmax B -> top row renders at their TRUE render time floor(t*30)/30, bottom row the source frame nearest that …
- `drift.mjs`

### `scratch-ending/` — loose scripts from an agent scratchpad, 3 files
s27 designer key views: per-view corrections of the extended designer mesh (14 x 11 nodes) in the end orbit, so each traced key view follows its own pixels between keys …

- `desfix.right.js` — s27 designer key views: per-view corrections of the extended designer mesh (14 x 11 nodes) in the end orbit, so each traced key view follows its own pixels between keys …
- `de.py`
- `demap.py`

### `scratch-ending-sleeve/` — scripts, 4 files
s27 room view X: traced from the source (temporal median 128.68-128.68 s, un-graded), foreground objects cut out.

- `tr_128_68.js` — s27 room view X: traced from the source (temporal median 128.68-128.68 s, un-graded), foreground objects cut out.
- `tr_128_44.js` — s27 room view X: traced from the source (temporal median 128.44-128.44 s, un-graded), foreground objects cut out.
- `tr_128_20.js` — s27 room view X: traced from the source (temporal median 128.2-128.2 s, un-graded), foreground objects cut out.
- `tr_127_88.js` — s27 room view X: traced from the source (temporal median 127.88-127.88 s, un-graded), foreground objects cut out.
