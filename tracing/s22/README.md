# s22 — 74.52–84.04 s: It cuts round the header: dashed line, outline, the strip comes loose

Status **approx**, method **traced** (see `docs/FIDELITY.md` and `docs/fidelity/s22.md`). The render code is `src/shots/s22.js` and `src/shots/s22/`.

## How the data in `src/shots/s22/` was made

The data files the render loads name the script that generated them in their header comment. Those scripts, at their new paths:

| producer script (in `tracing/`) | runtime files it produced |
|---|---|
| [`s22/src-s22/trace/measure_rim2.py`](src-s22/trace/measure_rim2.py) | `src/shots/s22/rim.js` |
| [`s22/src-s22/trace/trace_lines.py`](src-s22/trace/trace_lines.py) | `src/shots/s22/lines.js` |
| [`s22/src-s22/trace/write_lines2.py`](src-s22/trace/write_lines2.py) | `src/shots/s22/lines2.js` |

Method notes written next to the trace code: [`src-s22/trace/README.md`](src-s22/trace/README.md), [`src-s22/trace/retired/README.md`](src-s22/trace/retired/README.md).

## Index of folders (13)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `src-s22/` — trace / measurement scripts that lived next to the shot data in src/ (not loaded by the render), 26 files
Measurement scripts for s22's traced owl drawings (not loaded by the film).

**Produced runtime data:** `src/shots/s22/lines.js`, `src/shots/s22/lines2.js`, `src/shots/s22/rim.js`

- `trace/measure_rim2.py` — Fix pass 1: the hole's torn rim, re-measured (replaces measure_rim.py's per-column argmax, which jumped onto bright things next to the rim: the designer's eyes, a leaf, …
- `trace/trace_lines.py` — Pass 4: the fine dark lines of a held owl drawing that the traced tone regions lose (feather separations, the brow, the eye, the band's edges).
- `trace/write_lines2.py` — Fix pass 2: writes ../lines2.js from resid_lines.py's output plus the walk's hand-measured strokes (below).
- `trace/trace_all.py` — re-trace every late-phase drawing (the edge drawing: trace_edge.py)

### `trace-scripts-s22-bench/` — measurement / study, 1 file
s22 bench scratch

- `index.html` — s22 bench scratch

### `trace-scripts-s22-fix1-study/` — measurement / study, 8 files
fit2.py '{json}' out.jpg — overlay the rig's geometry on a source frame.

- `fit2.py` — fit2.py '{json}' out.jpg — overlay the rig's geometry on a source frame.
- `fit.py`
- `rig.py` — Python replica of the s21/owl21 rig geometry (outline, cup, band, eye, beak, body, tail) for fitting on the source.
- `score.py` — score.py DIR [ref_t] — owl mask (lum>150, opened) of each render (crop relative to the cup) vs the source sprite at 75.00

### `snapshots-s22-fix1-h/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 27 files
cardfit2.py DIR: per card pose (all its held source frames), corner corrections that put the render's card edges on the source's (50 % crossings along each edge's normal…

- `cardfit2.py` — cardfit2.py DIR: per card pose (all its held source frames), corner corrections that put the render's card edges on the source's (50 % crossings along each edge's normal…
- `poolfit.py` — poolfit.py DIR: fit the missing top-margin light above the card as alpha * blur(card mask, sigma) (outside the screen)
- `cardfit.py` — cardfit.py DIR: per card pose, the 50 % crossing offsets of each card edge, source vs render (along the outward normal)
- `roomfit.py` — roomfit.py DIR [F0 F1]: source/render ratio of the margins' light at knots (owl and bright things masked), medians over frames

### `snapshots-s22-fix2-final/` — the shot build after a pass (+ the scripts used in it), 19 files
s22 pass-4 scratch driver: bundle entry.js, render frames headless, pair with source frames, metrics.

- `harness/run.py` — s22 pass-4 scratch driver: bundle entry.js, render frames headless, pair with source frames, metrics.
- `harness/cups22.mjs`
- `harness/owlm.py` — owlm.py DIR [frames]: late-owl footprint metrics, render vs source: high-pass energy ratio (σ0.7−σ3 band std), σ0.7 / σ1.5 MAE, owl p50 white (render/source)
- `harness/boxes.mjs`

### `snapshots-s22-p4-base/` — copy of the shot build before a pass, 1 file

### `snapshots-s22-p4-h/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 45 files
s22 pass-4 scratch harness (not part of the film).

- `run.py` — s22 pass-4 scratch driver: bundle entry.js, render frames headless, pair with source frames, metrics.
- `latelines.py` — latelines.py RDIR: trace the fine lines of each late held drawing (medians of its source frames vs this render's)
- `med_edge.py` — median of the source's top-side owl drawing, aligned on the measured cup track (cup-local px); measuring only
- `h_entry_ex36.b.js.html`

### `snapshots-s22-rev2-m/` — comparison / review evidence scripts, 23 files
walkeye.py DIR [dx dy]: the walk's closed-eye strokes, render vs source: darkest value along each stroke (graded)

- `tools/walkeye.py` — walkeye.py DIR [dx dy]: the walk's closed-eye strokes, render vs source: darkest value along each stroke (graded)
- `tools/fidupd.py`
- `tools/walkloc.py` — walkloc.py DIR out.png F...: anchor-local crops (u 95..135, v 26..54) of render (top) and source (bottom), 8x, per frame
- `tools/facestat.py` — facestat.py DIR side: face stats (cup-local), render vs single source frames, for frames of that side in DIR

### `scratch-build/` — loose scripts from an agent scratchpad, 21 files
report as x' = sx*x + tx ; y' = sy*y + ty

- `track.py`
- `camrel.py` — report as x' = sx*x + tx ; y' = sy*y + ty
- `track2.py`
- `striptrack.py` — displacement of strip corners

### `scratch-build-s22/` — scripts, 19 files
Traced owl drawings for s22: control points MEASURED on the source (no pixels stored).

- `test_traced.js` — Traced owl drawings for s22: control points MEASURED on the source (no pixels stored).
- `trace_all.py` — re-trace every late-phase drawing (the edge drawing: trace_edge.py)
- `trace.py` — Vector trace of one owl drawing (pre-grade grey image, 0..1): silhouette rings, a quadratic base-value field, and nested tone regions below the base (each a set of even-…
- `build_data.py` — rings: delta-encoded integers (0.1 px) in a compact string: each value -> base-36 signed, comma separated

### `scratch-build-s22fx/` — work folder, 25 files
measuring aid (not part of the film): fit a late spec to the source silhouette of drawing arg.name (the source's owl silhouette as measured in pass 3, s22/owlData.js sil…

- `fitlate.js` — measuring aid (not part of the film): fit a late spec to the source silhouette of drawing arg.name (the source's owl silhouette as measured in pass 3, s22/owlData.js sil…
- `fitcut.js` — measuring aid (not part of the film): fit CUT_FIT to the source's cut-drawing silhouette (cut_mask.png, crop origin cup-local (-115, -60), 330 x 172) + landmarks, by Nel…
- `cutfit.js` — head centre (cup-local px) and scale (frame px per s21 unit), fitted by silhouette IoU + landmarks
- `mkspecs.py` — mkspecs.py out.js name=file.json ...

### `scratch-build-s22own/` — scripts, 1 file
sheet22.py dir out.jpg W t:x0,y0,x1,y1 ...

- `sheet22.py` — sheet22.py dir out.jpg W t:x0,y0,x1,y1 ...

### `scratch-ending/` — loose scripts from an agent scratchpad, 2 files
s22 (74.52–84.04): the sōko page, framed on the lit screen.

- `s22.clip.js` — s22 (74.52–84.04): the sōko page, framed on the lit screen.
- `tryface.sh` — tryface.sh NAME 'faceM-json': render margin-side face frames with that override, print stats
