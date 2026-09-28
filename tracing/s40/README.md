# s40 — 136.0–140.8 s: End card

Status **close**, method **mixed** (see `docs/FIDELITY.md` and `docs/fidelity/s40.md`). The render code is `src/shots/s40_endcard.js` and `src/shots/s40/`.

## How the data in `src/shots/s40/` was made

None of this shot’s data files names a generator script, and no script here writes into `src/shots/s40/` by a literal path: its measurements (positions, timings, tracks, fitted values) were read off with the scripts below and entered into the shot code, or written through paths built at run time. Start with the largest tool / harness folders in the index.

## Index of folders (9)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `trace-scripts-s40-fix1c-h/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 27 files
Refine the traced glyph contours: per control point, compare where the white face meets its dark keyline (along the normal) in the render and in the source, and move the…

- `glyphfit.py` — Refine the traced glyph contours: per control point, compare where the white face meets its dark keyline (along the normal) in the render and in the source, and move the…
- `grade.py` — numpy port of post.js (no grain) for inverse-grading pre-grade colours
- `cmp.py` — cmp.py t1,t2,... x0 y0 x1 y1 scale out.jpg [--norender] [--grid N] renders the times with the local harness (exact t), pairs crops render \| source (source frame round(t*…
- `dotclass.py` — ribbons by luminance bins

### `trace-scripts-s40-fix1c-x/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 1 file
crop.py render.png ref.png x0 y0 x1 y1 out.jpg [scale]

- `crop.py` — crop.py render.png ref.png x0 y0 x1 y1 out.jpg [scale]

### `trace-scripts-s40-fix2-harness/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 16 files
pad so regions touching the frame edge can have circles centred outside it

- `cloudfit5.py` — pad so regions touching the frame edge can have circles centred outside it
- `cloudfit3.py` — per-layer distance from the layer's own outline (union of circles at r-2.5)
- `cloudfit.py` — inverse grade whole image
- `cloudfit4.py`

### `trace-scripts-s40-fix2p-h/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 37 files
least-squares bilinear correction grid: per-pixel graded diff on sky pixels, through the local slope, + smoothness

- `skyfit2.py` — least-squares bilinear correction grid: per-pixel graded diff on sky pixels, through the local slope, + smoothness
- `skyfit.py` — fill far cells with a wider kernel
- `grade.py` — numpy port of post.js (no grain) for inverse-grading pre-grade colours
- `keyline2.py`

### `trace-scripts-s40-rev2n-h/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 9 files
track features on the headphones/head outline (exclude eyes/beak which change): cups + band + tuft

- `headtrack.py` — track features on the headphones/head outline (exclude eyes/beak which change): cups + band + tuft
- `keyline.py` — cloud keyline: find a dark run followed by light cloud (>180) within 12px
- `headecc.py` — displacement of the top of the band (1596,203) and of the tuft (1655,250)
- `gridpair.py`

### `snapshots-s40-fix2p-h/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 1 file
The end card, drawn in code: warm sky, two folded retro ribbons, cloud banks, sparkles, the extruded "rapport" wordmark, the tagline and the owl on the full stop.

- `card.js.bak` — The end card, drawn in code: warm sky, two folded retro ribbons, cloud banks, sparkles, the extruded "rapport" wordmark, the tagline and the owl on the full stop.

### `snapshots-s40-fix2q-h/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 17 files
serve the chosen version of s40's files

- `buildtime.mjs` — serve the chosen version of s40's files
- `grade.py` — numpy port of src/lib/post.js (no grain) + local inverse, for s40 fix pass 5.
- `run.mjs` — Exact-time render harness for s40 (fix pass 5).
- `lib.py` — Measurement helpers for s40 fix pass 5 (render vs source, exact frame times).

### `snapshots-s40-rev2c-x/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 8 files
measured curve from card.js (graded target)

- `alpha.py` — measured curve from card.js (graded target)
- `strip.py` — strip.py dir x0 y0 x1 y1 scale out t0 t1 -> rows: render / source tiles over time
- `tex.py`
- `diff.py`

### `scratch-build/` — loose scripts from an agent scratchpad, 31 files
candidate bg mask

- `bgfit.py` — candidate bg mask
- `extfit3.py`
- `extfit2.py` — source bottom profile of the dark band per column
- `extfit.py` — for columns across a letter bottom, find: face bottom edge (bright->dark), then the dark keyline runs below
