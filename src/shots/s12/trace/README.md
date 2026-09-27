Measurement scripts for the s12 hero (not loaded by the film). They read ONE source frame (34.0 s) and write control
points only (centre-lines with width/value, or simplified contours) — no pixels.

- `trace_strokes.py src.png geo.json out.json dbg.png HI LO MINLEN SIGMA` — dark ink strokes inside the lit silhouette:
  Hessian ridge measure (sigma 1.0), hysteresis threshold, skeleton, junction-split paths re-joined when their ends
  line up, smoothed, RDP-simplified; width = integral / peak of the perpendicular darkness profile (ink mass).
  Used: `9 4.5 9 1.0` → strokes.js (via `tojs.py`). The parts drawn separately (eyes, beak, plaster, headphones, feet)
  are masked from geo.json.
- `trace_box.py` — the same restricted to a box with its own lit mask (env BOX, MBLUR, MTHR, MER): tail and talon lines.
- `trace_cup.py src.png polys.json dark|bright HI LO MINLEN SIGMA GROW out.json` — lines inside a polygon (headphone
  cushion folds = bright, shell engraving = dark).
- `contour.py src.png x0 y0 x1 y1 THR EPS BLUR MINAREA` — lit-region outlines with holes (tail feathers, talons).

Fix pass 1 (after review rev1):
- `degrade.py` — inverse of the shared finish (post.js: halation screen-blend of blurred highlights, S-curve, vignette,
  flicker) so tracers work in the layer's PRE-finish values (thin dark ink on white comes out of the finish ~40 levels
  lighter; tracing the finished frame directly left the drawn ink too pale).
- `trace_hp.py src850.png out.json dbg.png` + `hp_tojs.py out.json ../hp.js` — the near headphone cup: evenly spaced
  streamlines (Jobard–Lefer) of the measured engraving flow (structure tensor) over the metal shell / yoke / plate rim
  and over the lit cushion fold wedges; each point stores the width of a white line cut into black (local line
  spacing x local pre-finish value). Plus the pale cushion dots (local maxima), the wedge outlines and a quadratic fit
  of the plate's halftone tone. Polygons (mask, halftone arm, plate, ring) are measured by hand from grid crops.
- `trace_eyes.py s850 s880 s882 geo.json out.json dbg.png` + `eyes_tojs.py out.json ../eyes.js` — the eyes and beak of
  each drawing (stare 850, glare 880, shut 882): outline rings of the black (< 70) and of 2–3 soft-ink levels, filled
  even-odd with the level's mean value, inside the complement of the stroke tracer's eye/beak mask (mapped through the
  pop's head rig).
- The source frames used are `n0850.png`, `n0880.png`, `n0882.png` (exact frames 850/880/882, extracted with ffmpeg);
  geo.json is geo.js without the `export const GEO =` wrapper.

F4c pass:
- `tone_fit.py render.png src850.png geo.json prev.json|- out.json dbg.jpg [N]` — the plumage value correction
  (`../tone.js`): both frames taken back to pre-finish values (degrade.py), blurred σ 6 normalised inside the lit
  plumage (eyes, beak, plaster, headphones, tail, feet masked), differenced (source − render), and the difference fitted
  by greedy matching pursuit with round Gaussians (σ 14 / 24 / 40), N per call, appended to prev.json. Writes
  `[x, y, σ, amplitude]` control points only. Used twice: 40 blobs on the render with no correction, then 30 more on the
  corrected render (`tone.js` = 70 blobs). `geo.json` = geo.js without the `export const GEO =` wrapper.
- `trace_rings.py src850.png src880.png geo.json ../rings.js` — the black ring round each eye (stare, glare) as a
  measured centre-line: per degree round geo.js's ring ellipse (mapped through the glare rig), the outermost dark run
  (< 110 pre-finish) with the white crescent inside it; middle + ink-core width, smoothed, split where the lid hides
  the ring. hero.js inks these over the traced soft levels (clean rings instead of grey patches at close zoom).

Fix pass 2 (review of F4c):
- `trace_cup2.py src850.png ../hpx.js dbg.jpg HI LO` (used `16 8`) + `tone_fit_cup.py raw_render.png src850.png ../hpx.js N` (25) —
  the headphone cup's METAL as light metal crossed by dark ink: dark ridge centre-lines (Hessian, sigma 0.8/1.4/2.4,
  hysteresis, skeleton, chains, pieces running across the streak flow dropped unless darker than 0.25) inside the
  metal polygon minus the arm / J-strip / crescent halftones and the plate ring zone (the ring is drawn from a
  per-angle width table in hero.js); base tone = round Gaussians fitted to the grey closing, then 25 more fitted to
  the source-minus-render residual of the raw layer.
- `trace_snap.py src.png t guides.json out.json dbg.jpg` — snaps hand-placed guide polylines (`guides/*.json`, read off
  5–9x grid crops) onto the ink they follow (darkest point along the normal, smoothed) and measures width (FWHM) and
  core value. Used for the beak of each drawing (`guides/beak_*.json` -> `beak_tojs.py` -> `../beak.js`, with
  least-squares shading planes and the gape's fill), the tuft fringe (`../tuft.js`), the plaster keylines
  (`../plaster.js`), the tail separations and the wing-tip hook (`../tailx.js`).
- `trace_region.py src.png t poly.json HI LO MINLEN out.json dbg.jpg [sigmas] [flowsigma] [link]` — dark ink centre-lines
  inside one region (as trace_cup2's ink step, ends joined across `link` px): the flank (`guides/flank_poly.json`,
  `12 6 14`, link 16) and wing tip (`guides/wtip_poly.json`) -> `../flank.js`, the crown hairlines
  (`guides/crown_poly.json`) -> `../crown.js`.
- parts.js FEET_R_RINGS re-traced from the pre-finish frame (threshold 80, blur 1.2, box 1275-1455 x 893-946).
- tone.js: 14 more blobs appended by `tone_fit.py` on the fix-pass-2 render.
All outputs are control points (centre-lines, polygons, blob / plane parameters); no pixels are stored.

Fix pass 3 (review #2):
- `trace_shell.py src850.png out.json dbg.jpg [Y0 | cush | poly:guides/x.json] [prev.json raw_render.png N]` — dark (and
  lit) centre-lines followed ALONG the measured streak flow (structure tensor, sigma FLOWSIG, default 5): each seeded at a
  local extreme across the flow (contrast > CSEED), stepped 1 px along the flow and re-snapped to the extreme across it
  while the dip is deeper than CMIN; [x, y, w, v] with w = FWHM capped by ink mass / contrast. Default mode: the lower
  headphone shell below Y0 (296) plus a base tone (median, round Gaussians) and, with prev/raw, N more base blobs fitted
  to the source-minus-render residual -> `shell_tojs.py` -> `../shell.js`. `poly:` mode: any region -> the strokes
  under the cushion and along the shoulder (`../under.js`, guides/under_poly.json, shoul_poly.json), the tuft's third
  lobe (`../tuft.js` LOBE3_INK, guides/lobe3_poly.json), the crown hairlines (`../crown.js` CROWN3, guides/crown3_poly.json).
- `trace_cush.py src850.png ../cush.js dbg.jpg [T1 T2 T1_low]` (used 0.42 0.72 0.3) — the cushion's lit fold wedges as
  outline rings at two pre-finish levels (4x upsampled, simplified), each region filled with its mean tone.
All outputs are control points (centre-lines, rings, blob parameters); no pixels are stored.
