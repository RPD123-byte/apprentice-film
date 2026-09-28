Measurement scripts for s16 (never loaded by the film). They read source frames and write GEOMETRY only: tone-level
outlines with a value, and ink centre-lines with a width and a strength per point. No pixels are written. See
fidelity/s16.md for the method and its caveat.

Run them in this order (scratch output goes to snapshots/s16-p2-tools/):
1. `snapshots/s16-p2-tools/cachepre.py`: caches the ungraded source frames 1140–1197 (grade.py inverts post.js).
2. `build_plate.py`: builds the clean static plate (1175, with the owl's place from 1153, no steam, iris-free eyes,
   90 px margins from the jolt and pull-back frames), the eye openings, and the camera fits (cams.json).
3. `trace_plate.py`: traces the plate into `data/plate.js`. The plate is denoised with NLM, then turned into median-3
   tone levels, and ink is traced in 12 orientations in overlapping tiles. One global least-squares fit sets the
   stroke strengths.
4. `eyes.py`: traces the two iris drawings and matches the iris per frame into `data/eyes.js`.
5. `dyn.py`: traces the per-frame drawings (the owl, the steam, the eyes of the in-between frames) into `data/dyn.js`,
   the dazed owl into `data/hold.js`, and writes the camera table `data/cams.js`.
6. `calib.py plate|dyn`: tone correction per level (`data/tonecal.js`). Each round needs a raw render first:
   `node snapshots/s16-p2-tools/r.mjs snapshots/s16-p2-raw 1175 raw /snapshots/s16-p2-tools/plate_test.js` for
   plate, and `node snapshots/s16-p2-tools/r.mjs snapshots/s16-p2-rawdyn 1152,1157,1175 raw` for dyn. Run two or
   three rounds.

`tr.py` holds the shared tracer: levels, strokes3 (the hatch-aware oriented tracer), the gain fits and the preview
renderers. Its ribbon and outline rasterisation is calibrated to match the canvas (WSHRINK, OFFSET).
