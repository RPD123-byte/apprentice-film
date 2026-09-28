# s21 — 69.44–74.52 s: The page, framed on the screen: the owl walks in and flies up

Status **approx**, method **drawn** (see `docs/FIDELITY.md` and `docs/fidelity/s21.md`). The render code is `src/shots/s21.js` and `src/shots/s21/`.

## How the data in `src/shots/s21/` was made

None of this shot’s data files names a generator script, and no script here writes into `src/shots/s21/` by a literal path: its measurements (positions, timings, tracks, fitted values) were read off with the scripts below and entered into the shot code, or written through paths built at run time. Start with the largest tool / harness folders in the index.

## Index of folders (15)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `trace-scripts-s21-fix1-final/` — the shot build after a pass (+ the scripts used in it), 1 file

### `trace-scripts-s21-fix1-tools/` — tools, 9 files
crop.py DIR out.jpg [--z 3] [--half 120] : for each frame/ref pair in DIR, crop round the owl's head and stack render\|source

- `crop.py` — crop.py DIR out.jpg [--z 3] [--half 120] : for each frame/ref pair in DIR, crop round the owl's head and stack render\|source
- `masks.py` — masks.py DIR [--thr 28] [--sheet out.jpg]: owl masks (difference from a median background of 70.0/71.2/74.4) for render and source; prints IoU, centroid, bbox, area and …
- `ugpair.py` — ugpair.py DIR out.jpg [s] [half]: render\|source crops on a head-centred owl-unit grid (origin = my head centre)
- `ugrid.py` — ugrid.py out.jpg "t:hx,hy,s[,half]" ...

### `trace-scripts-s21-fix1n-h/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 3 files
Copy of the composition’s index.html (+ hyperframes.json/meta.json) used to render this shot on its own; at the time `src/` and `assets/` were symlinked next to it, so the shot code it loaded is not duplicated here.

- `template.html` — s21 harness
- `index.html` — s21 harness

### `trace-scripts-s21-fix1n-perf/` — measurement / study, 2 files
s21 perf scratch

- `index.html` — s21 perf scratch

### `trace-scripts-s21-fix1n-tools/` — tools, 36 files
harness.py NAME "t:x0,y0,x1,y1;t:...;..." [--z 2.5] [--cols 2] [--raw] Renders s21 (shot + the film's grade) at each time in ONE browser page (caches stay warm), packing…

**Writes into:** `src/shots/{shot}.js`

- `harness.py` — harness.py NAME "t:x0,y0,x1,y1;t:...;..." [--z 2.5] [--cols 2] [--raw] Renders s21 (shot + the film's grade) at each time in ONE browser page (caches stay warm), packing…
- `wingfit.py` — wingfit.py T0 T1 : for each source frame, the flight-wing states (uNear, uFar) whose silhouette (with s21's head, body, tail, scissors at that time) best matches the sou…
- `lmk.py` — lmk.py out.jpg T1,T2,... [z] [hw] [hh]: SOURCE head crops with s21's probe() landmarks overlaid (red ellipse = our cup, green + = our eye, blue + = our beak point, yello…
- `silov.py` — silov.py out.jpg T1,T2,.. [z] : SOURCE frames with s21's silhouette polygons (probeShape) drawn over them, source owl mask outline in green

### `trace-scripts-s21-p2-perf/` — measurement / study, 1 file
s21 perf scratch

- `index.html` — s21 perf scratch

### `trace-scripts-s21-p2-tools/` — tools, 14 files
wingfit.py T0 T1 : for each source frame, the flight-wing states (uNear, uFar) whose silhouette (with s21's head, body, tail, scissors at that time) best matches the sou…

- `wingfit.py` — wingfit.py T0 T1 : for each source frame, the flight-wing states (uNear, uFar) whose silhouette (with s21's head, body, tail, scissors at that time) best matches the sou…
- `bodyfit.py` — bodyfit.py T0 T1 : fit a body offset/scale [dx, dy, sa, sb, drot] (units) for the flight by mean silhouette IoU
- `s21.pass1.js` — s21 (69.44–74.52): the sōko page, shrunk onto the lit screen in the dark room.
- `owl.pass1.js` — s21's owl, drawn in code: a side-on (facing right) white owl with an angry V brow, a small hooked beak, dark headphones on the back of the head, a plump feathered body, …

### `snapshots-s21-fix1b-orig/` — copy of the shot build before a pass, 4 files
s21's owl, drawn in code: a side-on (facing right) white owl with an angry V brow, a small hooked beak, dark headphones on the back of the head, a plump feathered body, …

- `owl.js` — s21's owl, drawn in code: a side-on (facing right) white owl with an angry V brow, a small hooked beak, dark headphones on the back of the head, a plump feathered body, …
- `s21.js` — s21 (69.44–74.52): the sōko page, shrunk onto the lit screen in the dark room.
- `poses.js` — s21's owl poses (units of s21/owl.js: head radius 100, origin = head centre, facing right), measured on the source (see fidelity/s21.md).
- `scissors.js` — s21's scissors (frame px), drawn to the source's structure (measured on 73.40–74.48, where they are seen side-on and large): two long pointed blades that run on a little…

### `snapshots-s21-fix1b-tools/` — tools, 27 files
tone.py RDIR [step]: percentiles of grey inside the eroded intersection of both owl masks (render vs source), and fine-detail energy (\|I - blur σ2\|) inside it

- `tone.py` — tone.py RDIR [step]: percentiles of grey inside the eroded intersection of both owl masks (render vs source), and fine-detail energy (\|I - blur σ2\|) inside it
- `fitgain.py` — fitgain.py RDIR [prev.json] -> margin gain knots (source/render median ratio, blurred), multiplied into prev
- `harness.html` — score(t, dbg, [x0,y0,x1,y1], sigma) -> { ncc, mae } of the graded render vs the source frame in the window
- `opt.mjs` — node opt.mjs spec.json -> coordinate descent of pose overrides against the source (NCC in windows) spec: { pose: "WALK", frames: [t...], win: [hw, hh] \| per-frame [[x0,y…

### `snapshots-s21-fix2-cmp/` — comparison / review evidence scripts, 13 files
score(t, dbg, [x0,y0,x1,y1], sigma) -> { ncc, mae } of the graded render vs the source frame in the window

- `evidence/scripts/harness.html` — score(t, dbg, [x0,y0,x1,y1], sigma) -> { ncc, mae } of the graded render vs the source frame in the window
- `evidence/scripts/opt.mjs` — node opt.mjs spec.json -> coordinate descent of pose overrides against the source (NCC in windows) spec: { pose: "WALK", frames: [t...], win: [hw, hh] \| per-frame [[x0,y…
- `evidence/scripts/owlsheet.py` — owlsheet.py step zoom outprefix [t0 t1]: render\|source crops around the owl, every `step` frames
- `evidence/scripts/run.mjs` — node run.mjs OUTDIR t1,t2,...

### `snapshots-s21-r3-orig/` — copy of the shot build before a pass, 3 files
s21's owl, drawn in code: a side-on (facing right) white owl with an angry V brow, a small hooked beak, dark headphones on the back of the head, a plump feathered body, …

- `s21/owl.js` — s21's owl, drawn in code: a side-on (facing right) white owl with an angry V brow, a small hooked beak, dark headphones on the back of the head, a plump feathered body, …
- `s21.js` — s21 (69.44–74.52): the sōko page, shrunk onto the lit screen in the dark room.
- `s21/poses.js` — s21's owl poses (units of s21/owl.js: head radius 100, origin = head centre, facing right), measured on the source (see fidelity/s21.md).

### `snapshots-s21-r3-tools/` — tools, 15 files
fitglow.py: per-frame non-negative LSQ for the whole-owl glow (B, walkConst 0.2) and the outside-owl glow (C, ownConst 0.3)

- `fitglow.py` — fitglow.py: per-frame non-negative LSQ for the whole-owl glow (B, walkConst 0.2) and the outside-owl glow (C, ownConst 0.3)
- `harness.html` — score(t, dbg, [x0,y0,x1,y1], sigma) -> { ncc, mae } of the graded render vs the source frame in the window
- `opt.mjs` — node opt.mjs spec.json -> coordinate descent of pose overrides against the source (NCC in windows) spec: { pose: "WALK", frames: [t...], win: [hw, hh] \| per-frame [[x0,y…
- `run.mjs` — node run.mjs OUTDIR t1,t2,...

### `snapshots-s21-rev2-tools/` — tools, 4 files
owlsheet.py step zoom outprefix [t0 t1]: render\|source crops around the owl, every `step` frames

- `owlsheet.py` — owlsheet.py step zoom outprefix [t0 t1]: render\|source crops around the owl, every `step` frames
- `run.mjs` — node run.mjs OUTDIR t1,t2,...
- `harness.html`
- `crop.py` — crop.py outdir/name.jpg x0 y0 x1 y1 zoom renderPNG srcPNG [renderPNG srcPNG ...] -> rows of (render \| source) with a 10px grid

### `snapshots-s21-rev2b-cmp/` — comparison / review evidence scripts, 4 files
owlsheet.py step zoom outprefix [t0 t1]: render\|source crops around the owl, every `step` frames

- `evidence/owlsheet.py` — owlsheet.py step zoom outprefix [t0 t1]: render\|source crops around the owl, every `step` frames
- `evidence/metrics.py` — metrics.py RENDER_DIR [frames a:b] -> per-frame owl IoU, owl MAE, halo bias, margin biases (render - source)
- `evidence/shift.py` — per-frame best integer shift (render -> source) of the owl window, NCC on σ1.5-blurred gray, search ±24 px
- `evidence/ovl.py` — ovl.py out.jpg x0 y0 x1 y1 zoom t1 t2 ...

### `scratch-build/` — loose scripts from an agent scratchpad, 1 file

- `mask2.py`
