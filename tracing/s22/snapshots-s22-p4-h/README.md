s22 pass-4 scratch harness (not part of the film). Renders s22 headless (esbuild bundle of src/shots/s22.js +
src/lib/post.js, Playwright chromium headless shell, ANGLE/SwiftShader), ~0.3 s a frame on a quiet machine; its
graded frames agree with tools/compare.sh within 0.1 /255 bias (snapshots/s22-p4-cal*).

- Source frames: `ffmpeg -ss 74.40 -i SOURCE.mp4 -t 9.8 -start_number 1860 DIR/f%04d.png`, then `S22SRC=DIR`.
- `python3 run.py OUTDIR 1863:2100:2 [--entry entry_x.js] [--raw] [--nopair]` renders frames F at t = F/25 → rF.png (+ pairs).
- `regions.py DIR` / `phase.py DIR/regions.txt`: σ3 MAE/bias per region (margins, strip, page) and per phase.
- `edgecmp.py`, `sharp.py`, `walksf.py`: owl-footprint metrics for the cut drawing (cup-aligned medians) and the walk.
- `roomfit.py DIR F0 F1`: margin light ratio (source / render) at the ROOM_G knots.
- `med_edge.py`, `rmed.py`, `walkmed.py`, `latelines.py`: the medians for s22/trace/trace_lines.py.
- Measuring knobs: an entry that imports a flag file setting `globalThis.__S22DBG = {...}` before ./entry.js
  (keys used by s22.js: edgeOwn, ownGlow, noGain, noLines, lineGain, edgeBlur, keyline, dashSoft, hole).
