Measurement scripts for the s04 rotoscope keys (not loaded by the film). They read source frames and write control
data only (region outlines, ink centre lines with widths, flow-grid displacements, homography quads); no pixels.
Run from `snapshots/s04-k2/` (the scripts expect `tr/` and `../../src/shots/s04/tk/` relative to it).

- `grade.py` — Python port of src/lib/post.js (halation, S-curve, vignette, flicker; no grain) and its inverse, so a
  source frame can be measured in paint values (what a shot draws before the grade).
- `trace_key.py T masks_d.json out.json` — one key: a 14-level value study (region outlines of the line-free base,
  simplified), solid blacks / white-ink highlights, and the ink lines (Hessian ridges, hysteresis, skeleton, re-joined,
  two-sided test, width = half-max run, value = ground minus peak), plus knife directions / soft-region weights.
- `flow_key.py key.json offsets` — DIS optical flow from each covered source frame back to the key frame, smoothed
  and sampled on a 24 px grid (held frames are recorded as such, without a flow).
- `calib.py key.json` — one tone offset per key against its own frame (Python raster of the key, graded).
- `jscal.py` — the same tone offset measured on the JS render itself (headless harness, graded), 3 passes.
- `tojs_d.py key.json out.js NAME` — writes `src/shots/s04/tk/kNNNN.js` (delta-coded strings; see s04/tkey.js).
- `screen_track.py` — the laptop page quad per frame, 23.12 back to 22.52 (SIFT + RANSAC homographies chained from
  s05's page quad under s05's 23.12 settle) -> `screen.json`, copied into s04/screen04.js.
- `warp_poly.py` — carries figure outlines between key times with forward flow (only used to place outlines).
- `build_d2.sh T offsets` — trace + flow (reused when already measured) + calibrate + write, for one key.
- `masks_d.json` (per-key frame outline, screen cut-out, tracer parameters), `plan3.txt` (key times and the frame
  offsets each covers; the table in src/shots/s04.js follows it), `screen.json` (measured screen quads).

## Build pass b1 (this run) — `trace/b1/`

Copies of the scripts this pass used (working copies live in `snapshots/s04-b1/` and `snapshots/s04-b1k/`; the
pipeline copy with the key JSONs is `snapshots/s04-b1k/tr/`). Measurements only; nothing here writes pixels.
- `tcal.py T1,T2,... [passes] [gain]` — the per-key value-study corrections (`s04/tcorr.js`): renders the keys in the
  headless harness (graded), takes blur(render) − blur(source) (σ 10) on a 24 px grid, converts it to paint values by
  the grade's local slope and subtracts it (iterated). The laptop screen is excluded; the landing keys (19.64–20.20) are
  measured only inside the owl's outlines, where they are drawn.
- `jscal_b1.py` — the per-key tone offset (as `jscal.py`) for the four keys traced this pass (21.80, 21.88, 21.96, 22.04).
- `eyetrack.py` — his eyes on every key frame: an ECC affine per eye from the 20.56 frame's brow+lid region (iris masked)
  to each key frame, chained outward from 20.56, and the pupil found on that frame -> `s04/eyetrack.js` (19.52–21.64).
- `dev.mjs` + `harness.html` — the headless harness (request interception, no server): `node dev.mjs outdir t1,t2,…`.
- `metric.py DIR`, `full.sh OUTDIR`, `pops.py DIR` — σ6/σ2 blurred MAE per frame against the source, the 100-frame run,
  and render-vs-source frame-to-frame change (pops).

## Fix pass 2 — `trace/fix2/`

Measurement scripts from this pass. They read source frames and print numbers only; nothing here writes pixels into
the film. Evidence crops are in `snapshots/s04-fix2-cmp/measure/`.
- `plaster_fit.py` — the owl's plaster model on 23.04: a chamfer fit of two rounded strips to the outline lines, then
  corrected by hand.
- `plaster_track2.py` — the plaster per frame, 22.20–23.08: an ECC affine restricted to the plaster, which gives
  `s04/plasterdata.js`.
- `cup_track.py` — the near headphone cup as a circle per frame (Hough, nearest a hand-checked prediction), which gives
  `s04/cup.js`.
- `glide_eyes.py` — a check of his eye placement on the glide frames: ECC of 19.52's eye regions, which agrees with
  the pan-composed placement within 0.6 px.
- `hf.py DIR T x0 y0 x1 y1` — mid-tone fine-texture energy, render against source, in the source's σ6 value bands.
- `boil.py DIR T0 T1 x0 y0 x1 y1` — motion-compensated frame-to-frame change, render against source. It uses the
  source's own ECC affine on both.
- The end-on pencil and teeth (`s04/pencil3.js`) were read by hand off 3x crops on a 10 px grid.
