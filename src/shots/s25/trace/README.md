Measurement scripts for s25 (not loaded by the film). They read source frames extracted with ffmpeg into `src/fNNNNN.png`
(frame number = t·25) in a scratch directory and write control data only — polygons, polylines, affines, blob and
ellipse parameters — which `mktimeline.py` / `tojs.py` turn into the modules in `src/shots/s25/`. No pixels are stored.

- `grade.py` — numpy port of `src/lib/post.js` (halation, S-curve, vignette, flicker) and its fixed-point inverse
  `ungrade()`, so traced values are pre-grade (the film's grade is applied on top at render time).
- `segm.py` — frame loader; `L(f)` warps a frame into the 104.60 page space with the measured camera affine
  (`camdrift.py` → `camdrift.json`: ECC on the page outside the owl, per frame 103.08–110.48).
- `trace_pose.py NAME FRAME rough.json out.json` — one drawing: outline rings of the figure (plumage by threshold +
  GrabCut / bright-region extras for headphones, scissors, feet), value iso-contours of the ungraded frame after a
  3×3 grey closing (12–15 levels, fill = band median), and centre-lines of the thin dark ink (Hessian ridge on the
  black-top-hat, hysteresis, skeleton, end-joining) with width and value. Rough seeds per drawing are in `rough.json`
  (`mkrough.py`, `mkrough2.py`; old silhouettes from `legacy/poses.js`).
- `tojs.py NAME in.json out.js` — base64-VLQ encoding (see `owlTrace.js`).
- `schedule.py` — which drawing per frame + ECC affine of the drawing onto each frame (residual in the log).
- `sctrack.py` (+ `divetrack.py`, `chtrack*.py`, `h2track.py`, `etrack.py`, `e2track.py`) — rotation/scale-searched
  masked template matching on gradient magnitude + ECC refine: held scissors, the chaos owls, the echoes.
- `spintrack.py` — the thrown scissors 106.92–108.60 (rotation search of the traced floating pairs).
- `smokefit.py` — landing dust as 10 gaussians per frame (brightness added to the clean 104.60 page).
- `smoke2.py` (uses `smokefit2.py`'s loaders) — chaos smoke as density iso-contours per frame.
- `chips.py` — paper chips per frame (small bright outlined near-rectangles not on the clean page).
- `arcfit.py`, `arcfit2.py`, `arctrace.py`, `arcrows.py` — slash arcs: ellipse fits and visible intervals per frame.
- `glowfit.py`, `gainfit.py`, `gainfit2.py` — the screen-glow gain per frame and the page light map (GAIN).
- `mktimeline.py` — writes `timeline.js` and `traces.js`.
