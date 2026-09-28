# s17 — 47.84–53.24 s: Full-frame: his site, MIXING DOWN, the owl flying inside the illustration

Status **approx**, method **mixed** (see `docs/FIDELITY.md` and `docs/fidelity/s17.md`). The render code is `src/shots/s17.js` and `src/shots/s17/`.

## How the data in `src/shots/s17/` was made

The data files the render loads name the script that generated them in their header comment. Those scripts, at their new paths:

| producer script (in `tracing/`) | runtime files it produced |
|---|---|
| [`s17/src-s17/trace/steam_trace.py`](src-s17/trace/steam_trace.py) | `src/shots/s17/steam.js`, `src/shots/s17/steam_data.js` |
| [`s17/snapshots-s17-fix1x-lab/hairtrace.py`](snapshots-s17-fix1x-lab/hairtrace.py) | `src/shots/s17/hair_data.js` |
| [`s17/snapshots-s17-fix1x-lab/silfill.py`](snapshots-s17-fix1x-lab/silfill.py) | `src/shots/s17/sil_fill.js` |
| [`s17/src-s17/trace/sil_trace.py`](src-s17/trace/sil_trace.py) | `src/shots/s17/sil_data.js` |
| [`s17/src-s17/trace/sil_trace2.py`](src-s17/trace/sil_trace2.py) | `src/shots/s17/sil_data.js` |
| [`s17/src-s17/trace/wing_trace.py`](src-s17/trace/wing_trace.py) | `src/shots/s17/wing_data.js` |

Scripts whose code writes into `src/shots/s17/` (found from the output paths in their source; `{…}` = a name filled in at run time):

| script (in `tracing/`) | writes |
|---|---|
| [`s17/snapshots-s17-fix1x-lab/steamkeys.py`](snapshots-s17-fix1x-lab/steamkeys.py) | `src/shots/s17/steam_data.js` |
| [`s17/snapshots-s17-fix2-lab/silfill_dash.py`](snapshots-s17-fix2-lab/silfill_dash.py) | `src/shots/s17/sil_fill_dash.js` |

## Index of folders (13)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `src-s17/` — trace / measurement scripts that lived next to the shot data in src/ (not loaded by the render), 4 files
Steam tracer for s17 (a measurement tool, not loaded by the film).

**Produced runtime data:** `src/shots/s17/sil_data.js`, `src/shots/s17/steam.js`, `src/shots/s17/steam_data.js`, `src/shots/s17/wing_data.js`

- `trace/steam_trace.py` — Steam tracer for s17 (a measurement tool, not loaded by the film).
- `trace/wing_trace.py` — Wing outline tracer for s17 (a measurement tool, not loaded by the film).
- `trace/sil_trace2.py` — Owl silhouette tracer for s17, pass 2 (fix pass 1; a measurement tool, not loaded by the film).
- `trace/sil_trace.py` — Owl silhouette tracer for s17 (a measurement tool, not loaded by the film).

### `trace-scripts-s17-fix1-trace/` — tracing / fitting, 4 files
s17 wing outlines per drawing tick of the rise, traced from the source by trace/wing_trace2.py (gaps between the primaries kept): polygons in page px (flat [x0, y0, x1, …

- `wtone.py`
- `w2test.js` — s17 wing outlines per drawing tick of the rise, traced from the source by trace/wing_trace2.py (gaps between the primaries kept): polygons in page px (flat [x0, y0, x1, …
- `ovls.py`
- `ovl.py`

### `trace-scripts-s17-lab/` — measurement / study, 239 files
the headphone band's crown height per key: bisect headphones.bandH so the band's outer edge at the crown matches

- `js/bandfit.mjs` — the headphone band's crown height per key: bisect headphones.bandH so the band's outer edge at the crown matches
- `old/s17old.js` — s17 — 47.84–53.24: his site full-frame (MIXING DOWN, LATE AT NIGHT.), with the owl inside the illustration.
- `lab.py` — masks
- `lab2.py` — lab2.py: fast headless render of s17 at times (full res) + metrics vs the source.

### `trace-scripts-s17-meas/` — measurement / study, 10 files
render\|source metrics using the source frame the render actually shows (the snapshot tool floors t*25; its own reference image is the ceil frame, so pairs can be one fra…

- `headfit.py`
- `metrics.py` — render\|source metrics using the source frame the render actually shows (the snapshot tool floors t*25; its own reference image is the ceil frame, so pairs can be one fra…
- `mask2.py`
- `mask.py` — also union of comps > 80 px

### `snapshots-s17-fix1x-lab/` — measurement / study, 27 files
silfill.py: small slits in the traced silhouettes (sil_data.js): the difference between a morphological closing of each drawing's silhouette mask and the mask itself, ke…

**Produced runtime data:** `src/shots/s17/hair_data.js`, `src/shots/s17/sil_fill.js`

- `silfill.py` — silfill.py: small slits in the traced silhouettes (sil_data.js): the difference between a morphological closing of each drawing's silhouette mask and the mask itself, ke…
- `hairtrace.py` — hairtrace.py: the designer's hair over his face (bangs, side locks against the skin), traced as outlines of the dark regions (graded < THR on the σ1 median plate of 48.8…
- `steamkeys.py` — steamkeys.py: rewrite s17/steam_data.js without per-point sampled values (fix pass 1).
- `zmeas.py`

### `snapshots-s17-fix2-lab/` — measurement / study, 17 files
silfill_dash.py: the tracer's split lines and slits inside the dash owl's head (sil_data.js, 52.68–53.20): the difference between a K px closing of each drawing's silhou…

**Writes into:** `src/shots/s17/sil_fill_dash.js`

- `silfill_dash.py` — silfill_dash.py: the tracer's split lines and slits inside the dash owl's head (sil_data.js, 52.68–53.20): the difference between a K px closing of each drawing's silhou…
- `bandfit2.py` — dash band centreline, left + top of the crown only (angles -168..-46 deg, page frame, about the model head centre), from the crown profile of the source's traced silhoue…
- `bandfit.py` — the dash band's centreline per frame from the crown profile of the source's traced silhouette (coordinates only): a robust quadratic in angle, pushed out by OFF px (the …
- `crownfit.py` — fit a circle to the crown of the source's traced silhouette (sil_data.js) per dash frame (coordinates only)

### `snapshots-s17-p4-lab/` — measurement / study, 13 files
s17 pass-4 scratch driver: bundle entry.js, render frames headless (file://), grade with post.js, compare to source.

- `ringmeas.py`
- `lab.py` — s17 pass-4 scratch driver: bundle entry.js, render frames headless (file://), grade with post.js, compare to source.
- `h.html`
- `owlm.py` — owl-region metrics: mask = the source's traced silhouette of the drawing (sil_data.js) grown 6 px

### `scratch-build/` — loose scripts from an agent scratchpad, 6 files
s17 owl: the owl inside the sōko illustration (47.84–53.24).

- `keys.mjs`
- `owl_new.js` — s17 owl: the owl inside the sōko illustration (47.84–53.24).
- `ana.py` — texture energy: high-pass std inside owl
- `fgrid.py` — fgrid.py in.png out.jpg x0 y0 x1 y1 [zoom]

### `scratch-build-r17/` — work folder, 3 files
template-match small feature patches: mug and DO NOT KNOCK plate, headline

- `tone.py`
- `align.py` — template-match small feature patches: mug and DO NOT KNOCK plate, headline
- `crop.py` — usage: crop.py dir idx x0 y0 x1 y1 out [scale]

### `scratch-build-s17/` — scripts, 6 files
crop.py DIR x0 y0 x1 y1 out.jpg [scale] -> stacks (render\|source) crops for every frame in DIR

- `steam_check.py`
- `crop.py` — crop.py DIR x0 y0 x1 y1 out.jpg [scale] -> stacks (render\|source) crops for every frame in DIR
- `round.sh` — round.sh OUTDIR : official compare at the standard s17 times + blurred MAE per frame

### `scratch-build-s17f/` — scripts, 7 files
The designer's head, redrawn from 5x grids of the source at 50.0 s: a lean pale face lit by the laptop, narrow heavy-lidded almond eyes with the irises in the left corne…

- `head_new.js` — The designer's head, redrawn from 5x grids of the source at 50.0 s: a lean pale face lit by the laptop, narrow heavy-lidded almond eyes with the irises in the left corne…
- `owlstats.py` — fill holes
- `regions.py`
- `crops.py` — usage: crops.py renderdir out.jpg x0 y0 x1 y1 [scale] [cols] -> pairs (render \| source) per frame, labelled

### `scratch-build-s17rev1/` — comparison / review evidence scripts, 3 files
ORB similarity render->source on the UI/text region (top 180 px) + whole

- `pairs.py` — ORB similarity render->source on the UI/text region (top 180 px) + whole
- `crops.py`
- `tick.mjs`

### `scratch-build-s17rev2/` — comparison / review evidence scripts, 4 files
zoom of each pull-back frame relative to a reference frame, for render and source separately (ORB+RANSAC), owl + steam masked; also the direct render->source similarity …

- `cam.py` — zoom of each pull-back frame relative to a reference frame, for render and source separately (ORB+RANSAC), owl + steam masked; also the direct render->source similarity …
- `overlay.py` — usage: overlay.py OUT.jpg SCALE x0 y0 x1 y1 T1 [T2 ...] -> red = render, cyan = source, per row: overlay \| render \| source
- `crop.py` — usage: crop.py OUT.jpg SCALE x0 y0 x1 y1 T1 [T2 ...] (times exact n/25; looks for frame in s17-rev2-{a,b,c,x*})
- `metrics.py`
