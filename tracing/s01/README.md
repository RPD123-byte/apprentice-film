# s01 — 0.0–6.04 s: Bird's-eye push-in over the desk

Status **approx**, method **mixed** (see `docs/FIDELITY.md` and `docs/fidelity/s01.md`). The render code is `src/shots/s01_birdseye.js` and `src/shots/s01/`.

## How the data in `src/shots/s01/` was made

The data files the render loads name the script that generated them in their header comment. Those scripts, at their new paths:

| producer script (in `tracing/`) | runtime files it produced |
|---|---|
| [`s01/trace-scripts-s01-fix1-meas/pgconv.py`](trace-scripts-s01-fix1-meas/pgconv.py) | `src/shots/s01/pages.js` |
| [`s01/trace-scripts-s01-fix2-meas/fulltrack.py`](trace-scripts-s01-fix2-meas/fulltrack.py) | `src/shots/s01/motion.js` |
| [`s01/trace-scripts-s01-fix2-meas/ridge.py`](trace-scripts-s01-fix2-meas/ridge.py) | `src/shots/s01/hands.js` |
| [`s01/trace-scripts-s01-fix2-meas/ridge.py`](trace-scripts-s01-fix2-meas/ridge.py) (same-named copies also in: `trace-scripts-s01-fix2x-meas/`) | `src/shots/s01/figure.js` |
| [`s01/trace-scripts-s01-fix2x-meas/emit.py`](trace-scripts-s01-fix2x-meas/emit.py) | `src/shots/s01/folds.js` |
| [`s01/trace-scripts-s01-fix2x-meas/link.py`](trace-scripts-s01-fix2x-meas/link.py) | `src/shots/s01/folds.js` |
| [`s01/trace-scripts-s01-fix2x-meas/trace.py`](trace-scripts-s01-fix2x-meas/trace.py) | `src/shots/s01/folds.js` |

## Index of folders (6)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `trace-scripts-s01-fix1-meas/` — measurement / study, 18 files
Fit the carousel position p(t) per source frame from 1D column profiles of the rectified screen.

**Produced runtime data:** `src/shots/s01/pages.js`

- `pgconv.py`
- `pfit2.py` — Fit the carousel position p(t) per source frame from 1D column profiles of the rectified screen.
- `pfit.py` — Fit the carousel position p(t) per source frame from 1D column profiles of the rectified screen.
- `plate.py` — Source frame at time T warped back into plate (t=0) coordinates, crop [x0 y0 x1 y1], zoom Z, optional grid step G.

### `trace-scripts-s01-fix2-meas/` — measurement / study, 15 files
name, template box, search radius

**Produced runtime data:** `src/shots/s01/figure.js`, `src/shots/s01/hands.js`, `src/shots/s01/motion.js`

- `fulltrack.py` — name, template box, search radius
- `ridge.py` — ridge.py T x0 y0 x1 y1 out.jpg [minlen] [thr]: dark ink lines of the SOURCE at T in a plate region -> skeleton polylines (plate coords)
- `armtrack.js`
- `lfit2d.py` — refine L around best at best p

### `trace-scripts-s01-fix2x-meas/` — measurement / study, 18 files
trace.py x0 y0 x1 y1 out.json [thr] : measure the dark fold strokes of the source (t=0) inside a box: black-hat line strength -> threshold -> skeleton -> branches; per b…

**Produced runtime data:** `src/shots/s01/figure.js`, `src/shots/s01/folds.js`

- `trace.py` — trace.py x0 y0 x1 y1 out.json [thr] : measure the dark fold strokes of the source (t=0) inside a box: black-hat line strength -> threshold -> skeleton -> branches; per b…
- `link.py` — link.py in.json out.json : join traced fragments whose ends meet (<8 px) with compatible directions (<40 deg)
- `emit.py` — emit.py tr.json NAME [minlen] : print a JS array of measured fold strokes [w, v, x0, y0, x1, y1, ...]
- `ridge.py` — ridge.py x0 y0 x1 y1 out.jpg [k] : source t=0 dark-line map (black-hat) with a 10 px grid, labels in plate px

### `trace-scripts-s01-fix3-meas/` — measurement / study, 2 files
light.py: source region brightness per frame in plate coords (camera removed), ratio to t=0

- `light.py` — light.py: source region brightness per frame in plate coords (camera removed), ratio to t=0
- `crop.py` — crop.py DIR IDX x0 y0 x1 y1 out.jpg [scale] -> render crop \| source crop (stacked horizontally, labelled)

### `trace-scripts-s01-rev2n-crops/` — measurement / study, 2 files
tiles.py DIR x0 y0 x1 y1 out.jpg [--w W] [--cols N] [--from a --to b]

- `tiles.py` — tiles.py DIR x0 y0 x1 y1 out.jpg [--w W] [--cols N] [--from a --to b]
- `heat.py`

### `scratch-build/` — loose scripts from an agent scratchpad, 6 files
Shot 1 (0.00–6.04): 3:07 AM, high above and behind the designer.

- `s01_backup.js` — Shot 1 (0.00–6.04): 3:07 AM, high above and behind the designer.
- `regsheet.py` — regsheet.py dir x0 y0 x1 y1 out [scale] [cols] [tmin] [tmax] -> grid of (render\|source) crops over time, labelled
- `screenstrip.py` — Undo shot 1's push-in (similarity about the measured fixed point) and tile the laptop screen every 0.1 s.
- `mock.mjs`
