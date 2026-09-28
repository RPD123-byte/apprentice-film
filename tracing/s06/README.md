# s06 — 26.72–29.04 s: Tired, head on hand, a small smile; owl on his shoulder

Status **close**, method **traced** (see `docs/FIDELITY.md` and `docs/fidelity/s06.md`). The render code is `src/shots/s06.js` and `src/shots/s06/`.

## How the data in `src/shots/s06/` was made

The data files the render loads name the script that generated them in their header comment. Those scripts, at their new paths:

| producer script (in `tracing/`) | runtime files it produced |
|---|---|
| [`s06/src-s06/trace3/layers_r3.py`](src-s06/trace3/layers_r3.py) | `src/shots/s06/owl3.js`, `src/shots/s06/data/` (29 files: r3_beanie.js, r3_body.js, r3_brow.js, …) |
| [`s06/src-s06/trace/grade.py`](src-s06/trace/grade.py) | `src/shots/s06/data/` (29 files: r3_beanie.js, r3_body.js, r3_brow.js, …) |
| [`s06/src-s06/trace3/fit.py`](src-s06/trace3/fit.py) | `src/shots/s06/data/` (29 files: r3_beanie.js, r3_body.js, r3_brow.js, …) |
| [`s06/src-s06/trace3/trace3.py`](src-s06/trace3/trace3.py) | `src/shots/s06/data/` (29 files: r3_beanie.js, r3_body.js, r3_brow.js, …) |
| [`s06/src-s06/trace/flowgrid.py`](src-s06/trace/flowgrid.py) | `src/shots/s06/motion3.js`, `src/shots/s06/data/flow.js` |
| [`s06/snapshots-s06-fix1-tools/expo.py`](snapshots-s06-fix1-tools/expo.py) | `src/shots/s06/data/expo.js` |
| [`s06/snapshots-s06-fix2-tools/fieldA.py`](snapshots-s06-fix2-tools/fieldA.py) | `src/shots/s06/data/fix2_za.js` |
| [`s06/src-s06/trace/mouth2.py`](src-s06/trace/mouth2.py) | `src/shots/s06/data/mouth.js` |
| [`s06/src-s06/trace/mouthline.py`](src-s06/trace/mouthline.py) | `src/shots/s06/data/mouth.js` |
| [`s06/src-s06/trace/trace.py`](src-s06/trace/trace.py) | `src/shots/s06/ink.js` |
| [`s06/src-s06/trace3/comb_r3.py`](src-s06/trace3/comb_r3.py) | `src/shots/s06/data/r3_comb.js` |

Scripts whose code writes into `src/shots/s06/` (found from the output paths in their source; `{…}` = a name filled in at run time):

| script (in `tracing/`) | writes |
|---|---|
| [`s06/snapshots-s06-fix1-tools/liftfield.py`](snapshots-s06-fix1-tools/liftfield.py) | `src/shots/s06/data/lift.js` |
| [`s06/src-s06/trace/mouth2js.py`](src-s06/trace/mouth2js.py) | `src/shots/s06/data/mouth.js` |
| [`s06/src-s06/trace/blink2js.py`](src-s06/trace/blink2js.py) | `src/shots/s06/data/owl_blink.js` |
| [`s06/src-s06/trace/resid.py`](src-s06/trace/resid.py) | `src/shots/s06/data/%s.js` |

Method notes written next to the trace code: [`src-s06/trace/README.md`](src-s06/trace/README.md), [`src-s06/trace3/README.md`](src-s06/trace3/README.md).

## Index of folders (16)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `src-s06/` — trace / measurement scripts that lived next to the shot data in src/ (not loaded by the render), 71 files
s06 measurement scripts

**Produced runtime data:** `src/shots/s06/ink.js`, `src/shots/s06/motion3.js`, `src/shots/s06/owl3.js`, `src/shots/s06/data/` (32 files: flow.js, mouth.js, r3_beanie.js, …)

- `trace/flowgrid.py` — flowgrid.py: the face's measured motion (measurement only): the optical flow (DIS, medium) from the neutral mean to every source frame, smoothed (Gaussian 4 px) and samp…
- `trace3/trace3.py` — trace3.py: r3 stroke tracer for s06 (measurement only; the film never loads this or any image).
- `trace/trace.py` — Stroke tracer for s06 (measurement only; the film never loads this or any image).
- `trace3/fit.py` — fit.py: analysis-by-synthesis calibration of traced strokes (measurement helper only; the film never loads this).

### `trace-scripts-s06-fix1-src/` — work folder, 5 files
metrics.py render.png source.png -> region means (render/source) + blurred MAE

- `metrics.py` — metrics.py render.png source.png -> region means (render/source) + blurred MAE
- `crop.py` — crop.py render.png source.png x0 y0 x1 y1 out.jpg [scale] [--grid step] -> render \| source crop, gridded
- `diffmap.py` — diffmap.py render source x0 y0 x1 y1 out.jpg [sigma] : red = render too bright, blue = render too dark (blurred)
- `one.py` — one.py img x0 y0 x1 y1 out.jpg scale step

### `trace-scripts-s06-fix1p-tools/` — tools, 6 files
metric.py DIR [IDX] : per-region blurred MAE / signed mean (render - source) at sigma 5 and 1.5, plus structure-tensor coherence (sigma 6) of the darkness in the region,…

- `metric.py` — metric.py DIR [IDX] : per-region blurred MAE / signed mean (render - source) at sigma 5 and 1.5, plus structure-tensor coherence (sigma 6) of the darkness in the region,…
- `skinerr.py` — skinerr.py DIR [IDX]: signed / abs error (sigma 4) on skin only (source blurred 3 > 120, outside the eye openings), per socket part, for calibrating the generated hatchi…
- `zgrid.py` — zgrid.py IMG\|T x0 y0 x1 y1 out.jpg [scale] [--poly json]: zoomed crop with a 10 px grid (labels every 50)
- `crop.py` — crop.py DIR IDX x0 y0 x1 y1 out.jpg [scale] : render \| source crop side by side (from compare.sh output), grid every 50 px or: crop.py SRC T x0 y0 x1 y1 out.jpg [scale] …

### `trace-scripts-s06-r2-src/` — work folder, 83 files

### `trace-scripts-s06-r2-tools/` — tools, 10 files
re-export the face data modules from the traced/calibrated JSON

- `export_face.sh` — re-export the face data modules from the traced/calibrated JSON
- `retrace_mass.sh` — retrace_mass.sh SET...: re-trace only the mass part of the sets (ink/light keep their calibration)
- `timing.mjs` — timing harness (measurement only): headless Chrome, files served by request interception (no server), times shot.draw
- `diff.py` — diff.py DIR IDX out.jpg [sigma] [x0 y0 x1 y1]: signed blurred difference (render - source): red = render brighter, blue = render darker

### `trace-scripts-s06-rev1-crops/` — measurement / study, 1 file
For each ref-*.png in a compare dir, find which exact source frame it equals; also compute MAE vs render.

- `match.py` — For each ref-*.png in a compare dir, find which exact source frame it equals; also compute MAE vs render.

### `trace-scripts-s06-study/` — measurement / study, 7 files
largest bright run

- `owlsil.py` — largest bright run
- `snap.py` — snap.py T in.json out.json overlay.jpg [r] [x0 y0 x1 y1 zoom] in.json: {name: {"pts": [[x,y],...], "mode": "dark"\|"light"\|"none"}}.
- `means.py`
- `g.py` — crop grid: g.py T out x0 y0 x1 y1 step zoom

### `snapshots-s06-fix1-orig/` — copy of the shot build before a pass, 2 files
s06 r3 motion: what moves on the face, from measurements (no pixels): - flow maps (data/flow.js): DIS optical flow from the neutral mean to every moving source frame, sa…

- `motion3.js` — s06 r3 motion: what moves on the face, from measurements (no pixels): - flow maps (data/flow.js): DIS optical flow from the neutral mean to every moving source frame, sa…
- `s06.js` — s06 (26.72–29.04): front view across the laptop lid.

### `snapshots-s06-fix1-tools/` — tools, 27 files
s06 fix pass 1 tools (measurement only; the film never loads these)

**Produced runtime data:** `src/shots/s06/data/expo.js`

- `expo.py` — expo.py DIR [--init \| --refine]: per-frame pre-grade channel gains for s06 (data/expo.js).
- `liftfield.py` — liftfield.py: the smile's displacement fields for s06 (fix pass 1), measured on the source: DIS flow from the neutral mean (668-677) to the held-smile mean (712-725), ro…
- `m2.py` — s06 fix1 metrics on render.mjs output (DIR/f-<frame>.png) against the exact source frame (s06-fix1-src/s-<n>.png).
- `render.mjs` — s06 fix1 render harness (measurement only): headless Chrome, project files served by request interception (no server), the real main.js pipeline (shot draw + post.js gra…

### `snapshots-s06-fix2-tools/` — tools, 23 files
fix pass 2, defect 1: the hair above the left brow's inner end slides up along its strands with the smile.

**Produced runtime data:** `src/shots/s06/data/fix2_za.js`

- `fieldA.py` — fix pass 2, defect 1: the hair above the left brow's inner end slides up along its strands with the smile.
- `fix2.pre-strip.js` — s06 fix pass 2 (2026-09-26): repairs from the second review, each MEASURED on the source (numbers only; no pixels are stored or loaded).
- `s06.pre-strip.js` — s06 (26.72–29.04): front view across the laptop lid.
- `motion3.pre-strip.js` — s06 r3 motion: what moves on the face, from measurements (no pixels): - flow maps (data/flow.js): DIS optical flow from the neutral mean to every moving source frame, sa…

### `snapshots-s06-r3-orig/` — copy of the shot build before a pass, 1 file
s06 (26.72–29.04): front view across the laptop lid.

- `s06.js` — s06 (26.72–29.04): front view across the laptop lid.

### `snapshots-s06-r3-out/` — work folder, 1 file

### `snapshots-s06-r3-tools/` — tools, 3 files
re-trace every r3 layer of s06 (measurement; ~30 min on 16 cores)

- `retrace_all.sh` — re-trace every r3 layer of s06 (measurement; ~30 min on 16 cores)
- `t_layer.py` — quick variant test of one layer config: t_layer.py NAME '{"kw overrides"}' (python model only)
- `diffmap.py`

### `snapshots-s06-rev2-a/` — comparison / review evidence scripts, 1 file
crop.py OUT.jpg x0 y0 x1 y1 scale n1,n2,...

- `evidence/crop.py` — crop.py OUT.jpg x0 y0 x1 y1 scale n1,n2,...

### `scratch-build/` — loose scripts from an agent scratchpad, 19 files
s06 (26.72–29.04): front view across the laptop lid.

- `s06.js.r16` — s06 (26.72–29.04): front view across the laptop lid.
- `probe5.mjs`
- `smoke.mjs` — mock canvas 2D context: every method is a no-op, gradients return stub objects
- `probe3.mjs` — strokes: long horizontal straight runs

### `scratch-build-s06rev1/` — comparison / review evidence scripts, 1 file
crop.py render.png ref.png x0 y0 x1 y1 out.jpg [scale]

- `crop.py` — crop.py render.png ref.png x0 y0 x1 y1 out.jpg [scale]
