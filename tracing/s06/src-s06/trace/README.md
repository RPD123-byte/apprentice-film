# s06 measurement scripts

These scripts measure the source and write the film's data modules in `src/shots/s06/data/`. The film never loads
them, the source or any image. The data modules hold only control points (stroke centre-lines with width and value,
outlines of tonal masses at a few levels, blob and dot positions and sizes, motion samples) and numbers. The film
redraws everything with Canvas2D (`../ink.js`: tapered strokes, even-odd filled outlines).

Run from the project root. Scratch output goes to `snapshots/s06-r2-src/` and `snapshots/s06-r2-src/out/`.

1. `prep.py`
   - Extracts the 58 source frames of the segment.
   - Averages the still frames into `neutral.npy` and `smile.npy`.
   - Undoes the film's finish with `grade.py`, a Python copy of `src/lib/post.js` (vignette, S-curve, halation), and
     writes the result to `neutral_pre.npy`.
2. `build.py SET...` traces the parts named in `cfg/SET.json` and writes `data/SET.js`. The sets are face, brows,
   eyes, hair, nape, beanie, body, hand, front, owl, room and mouthwash. Each set can have these parts:
   - `ink`: dark strokes, from `trace.py`. A Hessian ridge is found at several scales, cut with a hysteresis
     threshold and skeletonised. The paths are re-joined, smoothed and simplified with RDP. Each point stores its
     width (ink mass / peak), its value and the local ground.
   - `light`: the same tracer run on pale strokes.
   - `mass`: tonal masses, from `masses.py`. It outlines either the local ground or the value itself at a few levels.
     Each outline is filled with the measured value, lighter levels nested inside darker ones.
   - `dots`: small pale marks such as the grille mesh, from `dots.py`, using LoG peaks with Hessian size and
     direction.

   `build.py SET --export` re-exports from the JSON in `out/` without re-tracing, which keeps the calibrated values.
3. The moving parts:
   - `mouthline.py`: the mouth line, fitted on every source frame.
   - `mouth2.py`: the mouth patch's fine strokes. These are traced with `trace.py`, plus the lower-lip hatching from
     `rows.py` and the bristle comb above the lip from `comb.py`. It writes `data/mouth.js`.
   - `flowgrid.py`: DIS optical flow from the neutral mean to each moving frame, sampled every 12 px over the brows
     and the mouth. It writes `data/flow.js`, and the film moves the neutral drawing with it.
   - `flecks.py`: the stubble flecks, which also move with the flow.
   - `blink.py`: the owl's head transform per blink frame (ECC fit), plus a value study of the eye patches, made in
     the neutral head's frame. It writes `data/owl_blink.js` through `blink2js.py`.
4. Calibration loops, run with the shell loops in `snapshots/s06-r2-tools/`:
   - `calibrate.py` compares a render with the source and shifts each mass level's value or each stroke's value
     until the render matches.
   - `calpatch.py` does the same for the per-frame patches.
   - `resid.py` measures the remaining low-frequency error and writes it as soft black and white veils: a base veil,
     smile and brow-rise deltas faded in with the measured motion, and an owl veil. They go to `data/resid*.js`.
