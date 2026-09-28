Measurement scripts for s16 (never loaded by the film). They read source frames (pre-grade luminance: `grade.py`
inverts the film's grade; the cache is `snapshots/s16-h1-src/p{n}.npy`, made by `snapshots/s16-h1-tools/h16.py pre()`
- it was removed after this pass to free disk: rebuild it with
`cd snapshots/s16-h1-tools && python3 -c "import h16; [h16.pre(n) for n in range(1140, 1197)]"` before re-measuring)
and write GEOMETRY only: outlines with a value, centre-lines with a width and a value, direction bins, ellipse
parameters, a few numbers. No pixels.

Measurement base: `build_plate.py` -> `snapshots/s16-h1-work/plateE.npy` (the clean static plate: frame 1175 with the
owl's place taken from 1153, iris-free eyes, the steam blacked out, margins from the jolt / pull-back frames) and the
camera table (`data/cams.js`, ECC affine per frame; re-running it this pass reproduced data/cams.js exactly).

## Fix pass 2 (this run)

Harness and helpers: `snapshots/s16-fix2-final/tools/` (`run.py` renders exact frames through the real grade,
`crop.py`, `parterr.py`, `ab.py`, `gridcrop.py`, `owljson.mjs`). The source-frame cache (`h16.py`, dir `s16-fix2-src`)
is rebuilt on demand. `band.py` and `feet.py` read the owl drawings exported to JSON first:
`mkdir -p snapshots/s16-fix2-w && cd snapshots/s16-fix2-final/tools && node owljson.mjs ../../s16-fix2-w/owl.json $(seq 1143 1163) 1175`
(delete `snapshots/s16-fix2-w` afterwards).

- `band.py OWLJSON` -> `data/band.js`: BAND, the flying owl's headphone band as pale centre-lines (tr.strokes, bright
  polarity inside the dark headphone shape minus the cups, within 10 px of the silhouette's outer edge), a width and
  a value per point; CUPM, the source's mean inside each cup's ellipse (the cup model is scaled to it); HLKEEP, which
  of the fix-1 `HP.hl` lines follow the head's lit top edge (kept) rather than the band (dropped).
- `feet.py OWLJSON` -> `data/feet.js`: FEET, per drawing the foot boxes (thin parts of the silhouette below / right of
  the body) and the toes' pale centre-lines traced inside them, base -> tip, at most four per foot.
- Read off grids of the source (numbers in the code, not scripts): the bandage per frame (`owlparts.js PLASTER`), the
  near foot's knuckle and middle-toe apex per frame (`owl.js NEARFOOT`), the lids / crease / bags and eye corners
  (`eyes.js LIDS`, `CORNERS`), the collar and fold (`room.js COLLAR`, `FOLD`), the cables (`room.js CABLES`), the
  seated owl's wing line (`owl.js softSlash`), the mug's handle and rim.

## Fix pass 1

Source cache: `snapshots/s16-fix1-src/p{n}.npy` (the scripts below set `m16.PRE` to it). It is removed at the end of
the pass; rebuild with `cd snapshots/s16-fix1-tools && python3 -c "import h16; [h16.pre(n) for n in range(1141, 1197)]"`.

- `owl3.py` -> `data/owl.js` (replaces `owl2.py`'s format; **do not re-run `owl.py` / `owl2.py`**, they would write
  the old dense cel format that `owl.js` no longer reads). Input: the previous drawings exported once to
  `snapshots/s16-fix1-work/owl2_data.json` (silhouettes, ink lines, eyes, dark regions) plus the source frames for
  a few numbers per part. Per drawing: the silhouette (dense 3-point smoothing; the dark gaps between feathers and
  toes that open onto the dark room are cut out of it), `G` a coarse value study (8 px grid, <= 8 levels by k-means),
  `HP` the headphones (one dark outline, the band as a strip of measured width along the outline with its measured
  pale edge lines, each cup as fitted-ellipse parameters with three measured tones), `N` the small dark parts as
  medial-axis strokes, the feet's toe lines as medial axes, the near wing's feather lines over his face re-measured
  on 1143-1147; the seated owl's parts (cup, cushion, band underside) are authored in `s16/owlparts.js` from 5x / 6x
  grids and its zones' ink lines measured (s12 method). `owl3.py cal RAWDIR gain` light-matches `G`, the band and
  the cups against raw harness renders (`snapshots/s16-fix1-tools/owlcal.sh ROUNDS GAIN`; corrections persist in
  `snapshots/s16-fix1-work/owl3_fix.npz`; about 20 rounds over the pass, with re-measurements between them; mean |diff| inside the owls, pre-grade, sigma 6: 0.019 after the first round, 0.012 at the end).
- `shirt.py` -> `data/shirt.js`: the knit T-shirt's light as a coarse grid (sigma 4, 8 px) that sizes the cells of the
  procedural hex lattice in `room.js`.
- `hair.py` -> `data/hair.js`: pale centre-lines of the loose strands on his right (s12 method, on the plate).
- `cel2.py` -> `data/cel.js` (NOT in use; running it switches `room.js paintCel` to it): the neck headphones as one
  dark base + a coarse value study (sigma 3, 8 levels) + measured centre-lines. It is the prepared replacement for
  `cel.py`'s 12 fine levels at sigma 0.9 if those are ruled a copy of the source; measured worse (the headphones'
  sigma-2 error at 47.00: 6.3 with cel.py, 10.4-10.8 with cel2.py variants).
- Harness (scratch, not loaded by the film): `snapshots/s16-fix1-tools/` (`run.py`, `tunetest.py`, `seg.py`,
  `owlcal.sh`, ...). The before/after numbers in fidelity/s16.md came from the same harness run on a copy of the
  pre-pass code (removed afterwards; the backups are in `snapshots/s16-fix1-orig/`).

## Build pass (s16 build, previous run)

- `owl2.py` -> `data/owl.js` (replaces `owl.py`'s output; `owl.py` is kept for reference only and must not be re-run,
  it would overwrite the data with the old format). One drawing per source frame where the drawing changes:
  - `sil` silhouette (difference from the film's own room + irises + steam under that frame's camera);
  - `L` smooth plumage shading: the frame with its ink, parts and gaps inpainted / grey-closed (5 px flight, 9 px
    seated), blurred sigma 3 (flight) or 6 (seated), 17 levels;
  - `D` dark cel levels: the wide dark parts (< 0.64 on a sigma-1.2 blur, opened 5 px: headphone band and cups,
    pupils, the black notches between feathers); on the seated owl 11 fine levels (sigma 0.9) inside hand-read zones
    (headphones, both feet, far wing, tuft), on the flying owl inside its feet (thin parts of the silhouette);
  - `S` thin ink lines (s12 method), `KL` small light shapes, `C` the headphone cable;
  - `E` the eyes from `snapshots/s16-h1-work/eyes_fit.json` (`eyefit.py`: automatic fits of the iris blob, the thin
    ring round the white and the catchlight, 1148–1161; `seatedeyes.py`: the dazed rings and pin pupils of 1162,
    1163, 1175, far eye hand-set from 5x grids);
  - `O` the seated owl's outline value.
  - `owl2.py cal RAWDIR gain` is the light matching (raw harness renders `r{f}.png`, pre-grade grey); the per-drawing
    corrections persist in `snapshots/s16-h1-work/owl2_fix.npz`; `snapshots/s16-h1-tools/owlcal.sh N gain` runs N
    rounds (8 rounds were run: mean |diff| inside the owl 0.04 -> 0.008).
- `desk.py` -> `data/desk.js`: the desk's front plank. Its edges column by column; its grain as dark lines traced
  column by column (local minima >= 0.1 prominence, >= 0.2 on the smooth left end, linked across columns, width at
  half depth capped 2.4 px); the fine pale lines under the desk; where cables cross it (dark vertical runs >= 13 px).
  Its light between the lines (`BASE`, 40 x 4 px grid) is light-matched: `desk.py cal RAW.png gain`
  (`snapshots/s16-h1-tools/deskcal.sh`), kept in `snapshots/s16-h1-work/desk_base.npy`; 7 rounds, mean |diff| 0.11 -> 0.036
  (the rest is line-level).
- `cel.py` -> `data/cel.js`: the two headphone cups round his neck as 12 fine cel levels (sigma 0.9) inside hand-read
  zones (the engraving + traced lines read as a tangle there); the base under the lowest level is the mean below it
  (the minimum made the zones 0.012 too dark).
- `roomfix.py RAW.png gain` -> `data/roomfix.js`: additive value-study corrections (16 px cells) inside the knit
  T-shirt, whose traced tangle this pass replaced by a mesh engraving; 6 rounds, mean |diff| 0.11 -> 0.014.
- `mug.py` -> `data/mug.js`: the mug's enamel light as a 4 x 10 px grid, light-matched (`mug.py cal RAW.png gain`
  on raw renders of 1153, where nothing covers the mug; 4 rounds, mean |diff| 0.069 -> 0.024).
- The mug's outline, speckles and dashes, the laptop lid's rim and the T-shirt outline are authored in `room.js` from
  numbers read off grids and row / column profiles of 46.12 / 47.00 (listed there).

## Earlier pass (kept, unchanged)

- `room.py all` -> `data/room.js`: the room plate. DARK / PALE: the drawing's major ink lines (s12 method: Hessian
  ridge, hysteresis, skeleton, re-joined, smoothed, RDP; width at half the peak, the line's extreme value), regular
  hatching dropped (`m16.hatch_filter`). LEVELS: the value study, 22 levels of the plate with its traced lines
  inpainted away, blurred sigma 3.5, light-matched with `room.py cal`. DIRS: hatch direction regions (structure
  tensor, 12 bins) with class outlines (`room_polys.json`). Its work files (`room_vt.npy`, `room_strokes.json`,
  `room_dirs.json`) are gone, so `room.py cal` cannot be continued; `room.py all` would re-measure from scratch and
  lose that calibration.
- `steam.py` -> `data/steam.js`: the steam's pale centre-lines per frame where it changes, in plate px.
- `irises.py`: his irises' extent per frame (numbers for `s16/eyes.js`).
- `blurfit_dir.py`: the source's own softness per jolt / pull-back frame (numbers for `s16.js` BLUR).
- `owl_offsets.py`: the seated owl's drift against the room camera in the pull-back (numbers for `owl.js` OFF).
- `tr.py`, `m16.py`, `grade.py`: shared helpers.
