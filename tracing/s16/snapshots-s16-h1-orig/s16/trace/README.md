Measurement scripts for s16 (never loaded by the film). They read source frames (pre-grade luminance: `grade.py`
inverts the film's grade, `tr.py pre()`, cached by `snapshots/s16-p2-tools/cachepre.py`) and write GEOMETRY only:
smooth outlines with a value, centre-lines with a width and a value, direction bins, a few numbers. No pixels.

What is measured, and what the film does with it:
- `room.py all` -> `data/room.js`: the room plate (the designer at his desk, steady framing).
  - DARK / PALE: the drawing's major ink lines, the s12 method (`m16.strokes`: Hessian ridge, hysteresis, skeleton,
    re-joined, smoothed, RDP; width at half the peak, the line's extreme value). Regular hatching is dropped
    (`m16.hatch_filter`), edges (ground on one side only) are dropped, the beanie's ribs and the mug's glaze are left
    to the engraver. About 770 dark and 240 pale lines.
  - LEVELS: the value study, i.e. outlines of the light measured on the plate with its traced lines inpainted away and
    blurred at sigma 3.5 px (nothing under ~8 px survives), 22 levels simplified to 2 px. The film paints it soft and
    the engraver (`s16/engrave16.js`) cuts its own lines from it.
  - DIRS: hatch direction regions (structure tensor, coherence-weighted votes, 12 bins), with rough class outlines
    (`room_polys.json`) that set line spacing / style / contrast.
  - `room.py cal raw.png gain`: light matching. A raw render of the room (`VIEW=roomonly`, harness) is compared with
    the plate at sigma 4 and the value study moves by the difference (STYLE.md: match the source's light blurred).
    `snapshots/s16-fix1-tools/cal.sh N gain` runs N rounds.
- `owl.py` -> `data/owl.js`: one owl drawing per source frame where the drawing changes (the s12/s13 method):
  silhouette (where the frame differs from the film's own room + irises + steam under that frame's camera), soft
  shading (13 levels of the frame with its ink inpainted away, blurred sigma 3.5, inside the silhouette), solid ink
  shapes (dark < 0.3, grey 0.3-0.58, opened so thin lines stay lines), small light shapes enclosed by ink (eye
  whites), ink lines (s12 method), the headphone cable (pale lines just outside the silhouette, flight frames only).
  `owl.py cal RAWDIR gain` is the same light matching per drawing (`snapshots/s16-fix1-tools/owlcal.sh`).
- `steam.py` -> `data/steam.js`: the steam's pale centre-lines per frame where it changes, in plate px.
- `irises.py`: his irises' extent per frame (numbers for `s16/eyes.js`).
- `blurfit_dir.py`: the source's own softness per jolt / pull-back frame as an anisotropic Gaussian (numbers for
  `s16.js` BLUR); `blurfit_src.py` the same per region, isotropic.
- `owl_offsets.py`: the seated owl's drift against the room camera in the pull-back (numbers for `owl.js` OFF).
- `build_plate.py` (unchanged from the previous pass): the clean plate used as the room's measurement base
  (`snapshots/s16-p2-tools/plateE.npy`: frame 1175 with the owl's place from 1153, iris-free eyes, steam removed,
  margins from the jolt / pull-back frames) and the camera table `data/cams.js`.

The previous pass's full-frame tracer (32 tone levels at half-pixel precision, per-pixel fitted stroke strengths,
per-frame full-frame traces of the jolt) is archived in `snapshots/s16-fix1-trace-archive/` and is not used.
