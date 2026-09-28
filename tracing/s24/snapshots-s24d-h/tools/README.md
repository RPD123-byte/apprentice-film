# s24 (drawn pass) measuring scripts

Scratch tools used to measure the source for `src/shots/s24.js` and `src/shots/s24/d/*`. They are not loaded by
the film. They read source frames extracted to a working directory (`src/fNNNN.png`, frame index NNNN = round(t·25),
extracted with ffmpeg from the source film) and write JSON measurements; the `emit_*` scripts turn those into the
coordinate-only JS modules (`silF/H/J/W/B.js`, `lineData.js`, `scdata.js`). No source pixels are written into the
project. Paths inside the scripts point at this session's scratchpad; edit them to re-run.

- `sil2.py` — silhouette polygon (threshold, RDP 1.5 px) + notch / tip points of a figure on a plate or frame.
- `setmed.py` — per speed-line set, the median of that set's frames with the owl / scissors masked (measuring aid).
- `bars.py`, `bars2.py` — straight bars on a line-set plate: [u0, u1, v, width, 3 values], ungraded (inverse S-curve
  and vignette of post.js); `bars2` merges collinear fragments and adds wide soft bars.
- `holes.py`, `scA.py`, `anno.py` — scissors finger-hole ellipses and hand-read landmarks per frame.
- `smoke.py` — gaussian-blob fit of the hold smoke (tried; the final smoke is hand-placed puffs).
- `cmp.py`, `beats.py`, `diffmap.py`, `lcal.py` — render vs source errors (σ1 / σ8 ¼-size), per-beat means, signed
  blurred difference maps, speed-line statistics.
- `../shoot.mjs` renders harness frames by source frame index (headless Chrome, file://); `../index.html` is the harness
  (film time 97.08 + u, through post.js).
- `linefill.py` (fix pass 1) — repairs for the line sets A/B/C: drops the stub clusters and fat capsules left where the F owl was masked
  out, adds seeded filler bars where the density falls below a target × median; writes `src/shots/s24/d/lineFill.js`.
