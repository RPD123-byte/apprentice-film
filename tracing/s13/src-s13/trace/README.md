Measurement scripts for s13 (not loaded by the film). They read source frames and write control points only:
polygons/rings, stroke centre-lines (x, y, width, value per point), polynomial coefficients or 2x3 matrices. No pixels.
Reference drawings: pose C = per-pixel median of source frames 891–898 (the hold), front head D = mean of 901–902.

- `dump.mjs` — `node dump.mjs > geo.json`: flattens the rig's hand-fitted outlines (exported as `GEO` from s13.js).
- `feet.py C.png feet.json dbg.png` — talon outline rings (lit islands under the belly; the right foot cut along its
  measured top outline) and the flat mid-grey shading shapes → `../feetC.js`.
- `mask_c.py geo.json feet.json`, `mask_d.py geo.json` — keep-out regions (eyes, beak, plaster, drop, headphones, feet).
- `trace.py src.png mask.json dark|bright HI LO MINLEN SIGMA out.json dbg.png` — the s12 stroke tracer, generalised
  (Hessian ridge, hysteresis, skeleton, re-joined paths, RDP; width = ink mass / peak). Used: C `9 4.5 9 1.0`,
  D `5 2.5 8 1.0` (DMIN=4), feet `9 4.5 6 1.0`, far wings `9 4.5 8 1.0`, shell `10 5 8 1.0`.
- `outlines.py C.png geo.json silC.json dbg.png feet.json`, `outlines_d.py` — measured part silhouettes: the lit
  outline (blur 1, > 70) split between the rig's parts; each part keeps its lit pixels plus the nearest unclaimed ones.
- `farwing.py F silC.json ecc.json box out.json dbg.png` — the far wing of poses A (884) / B (886).
- `tojs.py`, `sil2js.py`, `tone2js.py` — JSON → the data modules in `..`.
- `fit_tone.py render.png source.png sil.json parts prev.json out.json [exclude.json]` — per-part cubic value study
  fitted to the blurred (sigma 6) source − render difference, through the grade's slope; iterated (render, refit).
- `ecc_all.py silC.json silD.json feet.json ecc.json` — affine ECC placement of every part on every frame 884–922.

Fix pass 1 (cel traces, `../celHP.js`, painted by `../cel.js`):
- `cel.py ref.png spec.json out.json` — a flat-shaded ("cel") trace of one region of a reference drawing: the region is
  posterised at 7–8 thresholds and each level becomes polygon groups (an outer ring and its holes, even-odd), each group
  with the median value of the pixels it covers, inverted through the whole global grade (halation at the shot's
  halo 0.42, S-curve, vignette) so it lands on the source after post.js. Options: plumage exclusion (`plume_seeds`,
  the white fur is left to the plumage layers; `grow_zones` let the trace reach 10–14 px into the fur where the fur
  outline leaves a gap, and that margin is feathered), `sil` (a zone restricted to one part's measured silhouette,
  feathered along the zone's own edge inside the fur), `keep`, `mesh` (hand-measured mesh faces: arm, plate ellipse,
  clamp, drawn as a ±45° line tile at the measured 12th/88th percentile values), `ink` (only strokes darker than the
  thresholds). Writes control points only.
- `cel2js.py out.js NAME a.json …` — merges traces into the data module.
- `cel/` — the specs (hand-drawn region polygons, thresholds) and `retrace.sh` (re-runs them all; needs WORK with the
  reference drawings and the silhouettes dumped as JSON, and the exact source frames at snapshots/s13-rev1-p3-src).
- `outlines_e.py f912.png out.json dbg.png` — pose E's own lit silhouette (the E strokes: `trace.py` with its mask,
  `5 2.5 8 1.0`, DMIN 4) → `../headE.js`. The fainter chest strokes: `trace.py` at `2.6 1.3 14 1.0`, DMIN 2, SIGS 2.0,
  minus those already in strokesC → `../chestC.js`.
