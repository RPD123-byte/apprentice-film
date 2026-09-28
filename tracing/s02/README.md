# s02 — 6.04–19.12 s: The stare; pan off his face into the dark boxes; the owl on the boxes takes off and flies to him

Status **approx**, method **drawn** (see `docs/FIDELITY.md` and `docs/fidelity/s02.md`). The render code is `src/shots/s02.js` and `src/shots/s02/`.

## How the data in `src/shots/s02/` was made

The data files the render loads name the script that generated them in their header comment. Those scripts, at their new paths:

| producer script (in `tracing/`) | runtime files it produced |
|---|---|
| [`s02/src-s02/hand/trace/tone_fit.py`](src-s02/hand/trace/tone_fit.py) | `src/shots/s02/hand/tone.js`, `src/shots/s02/hand/tonedata.js` |
| [`s02/src-s02/hand/trace/wingtips.py`](src-s02/hand/trace/wingtips.py) | `src/shots/s02/hand/owltrack.js` |

Scripts whose code writes into `src/shots/s02/` (found from the output paths in their source; `{…}` = a name filled in at run time):

| script (in `tracing/`) | writes |
|---|---|
| [`s02/src-s02/hand/trace/hairsil.py`](src-s02/hand/trace/hairsil.py) | `src/shots/s02/hand/hairsil.js` |
| [`s02/scratch-build-s02fix1/hairx.py`](scratch-build-s02fix1/hairx.py) | `src/shots/s02/hairShapes.js` |
| [`s02/scratch-build-s02fx/mktrack.py`](scratch-build-s02fx/mktrack.py) | `src/shots/s02/track.js` |
| [`s02/src-s02/trace/tojs.py`](src-s02/trace/tojs.py) | `src/shots/s02/faceInk.js` |
| [`s02/src-s02/trace/tojs_owl.py`](src-s02/trace/tojs_owl.py) | `src/shots/s02/owlInk.js` |
| [`s02/src-s02/trace/tojs_pan.py`](src-s02/trace/tojs_pan.py) | `src/shots/s02/panInk.js` |
| [`s02/src-s02/trace/tojs_poster.py`](src-s02/trace/tojs_poster.py) | `src/shots/s02/faceInk.js` |
| [`s02/src-s02/trace/tojs_room.py`](src-s02/trace/tojs_room.py) | `src/shots/s02/roomInk.js` |
| [`s02/src-s02/trace/tojs_wings.py`](src-s02/trace/tojs_wings.py) | `src/shots/s02/wings.js` |

Method notes written next to the trace code: [`src-s02/hand/README.md`](src-s02/hand/README.md), [`src-s02/trace/README.md`](src-s02/trace/README.md).

## Index of folders (22)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `src-s02/` — trace / measurement scripts that lived next to the shot data in src/ (not loaded by the render), 90 files
s02 hand-drawn rebuild (this pass)

**Produced runtime data:** `src/shots/s02/hand/owltrack.js`, `src/shots/s02/hand/tone.js`, `src/shots/s02/hand/tonedata.js`

- `hand/trace/tone_fit.py` — s02 value-study correction (not loaded by the film): fit a smooth value offset D = sum a_i * gauss(x - p_i, s_i) so that blur(render) + D ~ blur(source) in pre-grade pai…
- `hand/trace/wingtips.py` — measure the flying owl's silhouette extremes per frame in KIT owl units (root/scale/bank from the verified track)
- `hand/trace/hairsil.py` — the designer's hair: outer silhouettes of the dark hair masses on the stare average (sigma 2 < 55), inside a hand-drawn hair zone (eyes, brows and sweat left out), outli…
- `trace/tojs_wings.py` — measure_wings.py JSON -> src/shots/s02/wings.js : per frame 400..478 the two wing outlines in owl units (integers, delta-coded): [L..., R...] as [n, x0, y0, dx, dy, ...]

### `trace-scripts-s02-bench/` — measurement / study, 2 files

- `index.html` — s02 bench

### `trace-scripts-s02-fix1r-lab/` — measurement / study, 2 files

- `index.html` — s02 fix lab

### `trace-scripts-s02-lab/` — measurement / study, 3 files

- `index.html` — s02 lab
- `bench.html` — s02 bench

### `trace-scripts-s02-rev1-r2-lab/` — measurement / study, 1 file

- `index.html` — s02 rev lab

### `trace-scripts-s02-rev1-r2-lab2/` — measurement / study, 2 files

- `index.html` — s02 timing lab

### `trace-scripts-s02-rev1-r2-lab3/` — measurement / study, 2 files

- `index.html` — seek probe

### `trace-scripts-s02-rev1-r2-lab4/` — measurement / study, 2 files

- `index.html` — s02 rev lab

### `trace-scripts-s02-rev1-r2-tools/` — tools, 10 files
refine shift by phase correlation on region

- `blurfit2.py` — refine shift by phase correlation on region
- `facetrack.py` — face+beanie world box (stare coords)
- `blurfit.py` — exclude the owl area (it is on the world, fine) keep all
- `labpair.py`

### `prev-builds-s02-legacy-traced/` — an earlier build of the shot that a later pass replaced (kept for reference), 8 files
s02 per-frame measurements (fix pass 1, scratch scripts charfit*.py / blurfit*.py; see fidelity/s02.md): each pan frame fitted against the sharp stare view (the look, fr…

- `track.js` — s02 per-frame measurements (fix pass 1, scratch scripts charfit*.py / blurfit*.py; see fidelity/s02.md): each pan frame fitted against the sharp stare view (the look, fr…
- `cam.js` — frames 261..478 (t = f/25): [dx, dy] pairs
- `designer.js` — s02 designer: the front close-up (knit beanie, wet black hair, bulging eyes in hatched sockets, sweat, a pencil between his teeth, stubble, pale hoodie, the laptop lid a…
- `room.js` — s02 room: the dark studio behind him and the stack of cartons the owl sits on, as one engraved world.

### `snapshots-s02-fix1h-lab/` — measurement / study, 11 files
the flying owl's face on the source (template: eyes + beak of source f462, rotated / scaled per frame from the root track), against the flight pose's beak anchor.

- `facetrack.py` — the flying owl's face on the source (template: eyes + beak of source f462, rotated / scaled per frame from the root track), against the flight pose's beak anchor.
- `fit_des.py` — refit DES_TONE for the redrawn stare designer: render the raw designer (only CROWN_TONE applied) at f160, fit N round gaussians against the ungraded stare average inside…
- `cells.py` — cells.py src.png ren.png x0 y0 x1 y1 cell : mean value per cell, src / ren
- `run.py` — s02 r3 scratch driver (not part of the film): bundle entry.js, open h.html in headless chromium, render exact frames.

### `snapshots-s02-fix1h-orig/` — copy of the shot build before a pass, 11 files
s02 hand-drawn rebuild (this pass)

- `hand/tonedata.js` — s02 value-study corrections (trace/tone_fit.py; see tone.js): [x, y, sigma, a] world px, a in 1/255
- `hand/owltrack.js` — s02 flying owl, measured per source frame (snapshots/s02-r3-meas/wingtips.py): silhouette extremes of each wing in kit owl units (farthest point from the shoulder), afte…
- `hand/tone.js` — s02 value-study correction: a smooth value offset D(x, y) = sum of round Gaussians [x, y, sigma, a] (world px, a in 1/255), fitted offline by trace/tone_fit.py against t…
- `hand/hairsil.js` — s02 designer: outer silhouettes of the dark hair masses (measured on the stare average, 6.04-6.84 s: sigma 2 < 55/255, or sigma 4 < 62 above y 430 inside a hand-drawn ha…

### `snapshots-s02-fix1r-lab/` — measurement / study, 1 file

- `index.tpl` — s02 fix lab

### `snapshots-s02-r3-lab/` — measurement / study, 20 files
coarse cell means (graded, 0..255) of render vs source in a region: prints S/R rows

- `cells.py` — coarse cell means (graded, 0..255) of render vs source in a region: prints S/R rows
- `run.py` — s02 r3 scratch driver (not part of the film): bundle entry.js, open h.html in headless chromium, render exact frames.
- `crops.py` — side-by-side crops (render \| source) of named regions for a rendered frame dir
- `owlpairs.py` — render\|source crops around the owl (kit root track) for a list of frames in a rendered dir

### `snapshots-s02-r3-meas/` — measurement / study, 7 files
wing tips v2: the owl as the bright component connected to the body (pre-grade > THR), farthest points from each shoulder, in kit owl units (root/scale/bank from OWL_ROO…

- `wingtips2.py` — wing tips v2: the owl as the bright component connected to the body (pre-grade > THR), farthest points from each shoulder, in kit owl units (root/scale/bank from OWL_ROO…
- `common.py` — s02 r3 measuring helpers (study only; nothing here is loaded by the film)
- `mosaic.py` — study only: paste source frames at their camera offsets to see the whole world (world = 6.04 frame coords)
- `gridz.py` — zoomed crop of an image (png or npy) with a labelled grid every STEP px (labels = frame px).

### `snapshots-s02-r3-orig/` — copy of the shot build before a pass, 1 file
Shot 2 (6.04–19.12): one continuous camera.

- `s02.js.orig` — Shot 2 (6.04–19.12): one continuous camera.

### `snapshots-s02-rev1-work/` — comparison / review evidence scripts, 6 files
which cv2 frame is the tool's ref

- `pairs.py` — which cv2 frame is the tool's ref
- `metrics.py`
- `owlpos.py`
- `iris.py`

### `snapshots-s02-rev2-work/` — comparison / review evidence scripts, 4 files
gcrop.py f x0 y0 x1 y1 out [scale] [step] -> render\|source crop stacked vertically with a labelled grid (frame coords)

- `gcrop.py` — gcrop.py f x0 y0 x1 y1 out [scale] [step] -> render\|source crop stacked vertically with a labelled grid (frame coords)
- `pairs.py` — also vs f-1, f+1
- `regions.py`
- `crop.py` — usage: crop.py f x0 y0 x1 y1 out [scale] -> render\|source crop (render from rev2 frames, or rendered png path via env)

### `scratch-build/` — loose scripts from an agent scratchpad, 11 files
template: head incl. headphones; find its exact bright blob first

- `camtab.py`
- `facetrack.py` — template: head incl. headphones; find its exact bright blob first
- `s02-before-root.js` — Shot 2 (6.04–19.12): one continuous camera.
- `anchor.py` — nearest pan1 frame by offset (only frames with real motion, prefer non-dark)

### `scratch-build-s02fix1/` — work folder, 10 files
leave out: the eyes with their lids (ellipses), the brows (bands), sweat, nose, pencil

**Writes into:** `src/shots/s02/hairShapes.js`

- `hairx.py` — leave out: the eyes with their lids (ellipses), the brows (bands), sweat, nose, pencil
- `blurfit.py` — blurfit.py refk k0 k1 step : fit gaussian sigma + line-blur length that turns the (shifted) sharp source frame refk into source frame k (camera from s02/cam.js); region …
- `rend.py` — rend.py OUTNAME k1,k2,... [--pairs] : render source frame indices k exactly (t = round(1.2k)/30 + 1e-4, which the snapshot tool floors to 1/30 and s02 rounds to frame k)…
- `pano2.py` — pano2.py out.jpg src\|rdir ks X0 Y0 X1 Y1 sc [step] : world-coordinate panorama crop with grid

### `scratch-build-s02fx/` — work folder, 23 files
450-455: only the beanie's corner is in view (n < 100k): the fits agree on about (+12, -11)

**Writes into:** `src/shots/s02/track.js`

- `mktrack.py` — 450-455: only the beanie's corner is in view (n < 100k): the fits agree on about (+12, -11)
- `charfit3.py` — fit shift + smear L + sigma of a CHARACTER region (designer = the look drawing; owl = the sitting owl at the hold) against each pan frame: reference = the static average…
- `charfit2.py` — fit shift + smear L + sigma of a CHARACTER region (designer = the look drawing; owl = the sitting owl at the hold) against each pan frame: reference = the static average…
- `blurfit2.py` — blur fit robust to local misregistration: per-tile shifts (phase correlation), then a global (L, sigma) grid on the tile-registered reference.

### `scratch-build-s02rev1/` — comparison / review evidence scripts, 6 files
track the same world features separately in render frames and in the true source frames; compare camera offsets

- `camcmp.py` — track the same world features separately in render frames and in the true source frames; compare camera offsets
- `repair.py` — repair.py dir out.jpg [cols] [width] [x0 y0 x1 y1]: pair each render frame with the SOURCE frame it really shows (renderSeek floors t to 1/30 s; frame = round(q*25)); wr…
- `align.py` — align.py dir... : for each render frame, true source frame; blurred MAE; best offset render->source (template of centre)
- `crop.py` — usage: crop.py dir time x0 y0 x1 y1 out [scale] [--diff] -> render (top) / source (bottom) crop
