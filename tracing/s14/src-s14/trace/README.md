Measurement scripts for s14 (not loaded by the film). They read source frames and write control points or scalars
only; no pixels are stored. Paths inside point at the build session's scratch directory; adjust before re-running.

- `trace_room.py src40.png fills.json out.json dbg.png HI LO MINLEN` + `tojs.py`: dark ink strokes of the room on the
  40.00 s frame (R40 framing). Hessian ridge on the log image (the frame's vignette is multiplicative), hysteresis,
  skeleton, junction re-joining, RDP; width = ink mass / peak, darkness = 1 - ink / local background; each stroke is
  split by the room layer it lies on (layer map from `fills.json`). Used: `0.3 0.15 20` -> ../strokes.js.
- `rec.mjs fills.json`: runs room.js's painters in Node with stub canvases and records every `Lay.fill` polygon.
- `tone.py` / `toneupd.py`: maps each fill polygon into source frames 40.08/40.12/40.16 with its layer's dolly depth,
  takes the visible part (later fills and the owl removed), compares mean luma render vs source, and folds the ratio
  into ../tone.js (one scalar gain per fill). Iterated 3x after each geometry change.
- `layerratio.py`: the same per layer and per frame (-> LATE gains in s14.js). `floor2.py`: the floor's value on an
  R40 grid. `depth.py`: inverse depth per block from the source's optical flow about the focus of expansion.
- `owlpose2.py` / `cups.py`: the back-view owl per source frame (head centre, top, scale, wing tips, lowest foot,
  lower-body offset; headphone cup centroids -> roll) -> the BK table in ../back.js.

Fix pass 1:
- `tone2.py fills.json renderdir ../tone2.js`: the same visible-region comparison on every dolly frame 40.00-40.64
  (polygons clipped where they pass behind the camera; the owl masked as a cross of head/body, wings and legs), folded
  into one gain per fill per frame (FT.g[layer][id][k]); the floor's tone zones (room.js floorZones) count as fills.
  Iterated after each change (render the 17 frames with tools/compare.sh, then run this). Scalars only.
- Measurements done in scratch for this pass (not kept as tools): scale-compensated template matching for layer depth
  (w at points of the left and right walls, 40.00 -> 40.24..40.64), leg blobs below the body on unit-grid resamplings
  of every flight frame (back.js FLYLEG), the owl's floor shadow as the dark blob of frame / local floor (owl.js
  SHADOW_U), plank edge profiles per frame (the desk offset at 40.64).
