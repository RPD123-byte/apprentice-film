Measurement scripts for s18 (not loaded by the film). They read source frames, or owl-free medians built from them, and write INK DRAWINGS in the s12 manner: measured shapes and centre-lines. No pixels are stored. The film redraws every drawing with Canvas2D (`../inkdraw.js`), then the global grade runs as it does for every shot.

## The drawing (`inktrace.py`)

A drawing is made of five kinds of mark:

- **base.** An owl's silhouette, filled with its own dark value, plus the owl's dark parts (pupils, headphone shells and so on), each with its own measured value field.
- **masses.** The lit faces. Each is ONE threshold of the lightly blurred image, closed and opened so that anything thinner than a few px is left to the strokes. Each face has an outline with holes (filled even-odd) and one smooth measured value field:
  - constant, plane or quadratic;
  - for large owl faces, quadratic plus a set of soft Gaussian shading blobs (a greedy fit of the residual, sigma 5–26 px);
  - a rim term k·exp(−depth/λ), for the darkening toward the outline.
- **dark / bright.** Stroke centre-lines, Steger-style:
  - a multi-scale Hessian response, non-maximum suppression across the line, anisotropy weighting and hysteresis;
  - then a skeleton, pruned of spurs, with ends re-joined when they line up, smoothed and RDP-simplified.
  - Each point gets a width, measured as the stroke's share of the ink (profile integral out to where it stops falling, divided by its peak), and each stroke gets one tone. The film redraws them as tapered polygons.
- **specks.** Small marks the strokes missed (at most 25–150 px²), each filled with its median value.
- **dots.** Isolated round white marks.

Rules:

- There are no stacked threshold levels. The only level is lit against dark.
- Whole-frame traces are made only of the static plates, from one owl-free median each.

## Scripts

- `common.py` reads source frames, undoes the grade (`grade.py`, a port of `src/lib/post.js`), and holds the shot-B tip transforms and the keyboard canvas mapping.
- `trace_plate2.py in.npy out.pkl [--crop ...] [--allowed mask.npy] [--p key=val ...]` traces a static plate. Parameters used:
  - room A: `nms=1 sigd=sigb=0.8,1.3,2.0 HIb=HId=12 LOb=LOd=5`.
  - shot B background and keyboard: the same.
  - Inputs: the owl-free plates (scratch):
    - `bgA_P.npy`: the median of 1331–1381 with the owl removed.
    - `bgB_full.npy`: the pre-tip median, with the part revealed only while the synth tips (1424–1432) filled from those frames wherever the tipped keyboard, dilated 15 px, and the wing do not cover it. This is what gives the slats down to y ≈ 800.
    - `kbB_full.npy`: the keyboard canvas, smoothed 1.2 px right of canvas x 2400 (plate x 2140), where it was assembled from warped tip frames.
- `trace_owlA2.py owlphase3.npz owlstack.npz out.pkl` handles the shot A owl:
  - one drawing per wing phase, from the median of the standing frames registered on PATH_A, inside its silhouette (dark gaps inside the consensus silhouette removed);
  - the legs and feet per frame: what that frame's own silhouette adds under the body.
- `fitscale.py` gives the per-frame head and body affine of the fly-in and landing (ECC). `FLY_W` in `../shotA.js` is its inverse.
- The fly-in motion blur (`SMEAR` in `../shotA.js`) is matched to the source's horizontal/vertical gradient ratio inside the head and body. `fitsmear.py` (a blurred-MAE fit) is kept for reference. It prefers too much blur because it also rewards hiding misregistration.
- `trace_owlB2.py SP out.pkl [rigid|parts|keys|fly]` handles the shot B owl:
  - the belly is traced from frame 1382, one drawing, because the median of the redrawn frames loses half its fine strokes; the median is used only outside 1382's view;
  - the far wing in 3 flap states (medians);
  - the tail, with its per-frame affine;
  - per frame, the parts that change (legs, feet, the near wing) and the dark marks of the keys pressed next to them;
  - 1417–1432, the leaping and flying owl per frame, from the lightly smoothed frame. The film softens it again inside its own silhouette. `fitfly.py` fits that blur.
- `tojs.py` encodes drawings as compact JS. Coordinates are delta-coded varints at 1/4 px, widths at 1/8 px, and value fields are coefficients.
- `preview.py`, `zoom.py`, `pair.py`, `owlprev.py`, `owlerr.py` and `bellyerr.py` are the preview renderer and error numbers. `fa.py` does frame-accurate comparisons of harness renders.

The scratch inputs are in the session scratchpad (`p2/`, `f18/`). They are the earlier pass's owl-free medians and registered stacks (`../traced_v2/trace/prep/`) plus `plateB2` assembly in `f18/`.

## Value-study corrections (build pass, this run)

The ink drawings above get the source's broad light only approximately (their lit faces carry smooth fields, and the
redraw loses a little ink in dense hatching). Each static drawing is therefore corrected once, at build time, by a
small set of soft gaussian blobs of light and shade, `[x, y, sigma, a]` with `v' = v (1 + a g)` (so black stays black),
applied per pixel by `../tone.js` to the cached canvas. The blobs are fitted greedily (`fit_tone.py`, matching pursuit
on the sigma-6 blurred difference, sigma 10-48 px, at half resolution) against:

| data file | drawing | target (pre-grade, blurred) | blobs |
|---|---|---|---|
| `../data/toneA.js` | room A plate | owl-free median of 1331-1381 (`tone_plateA.py`) | 250 |
| `../data/toneB.js` `still` | shot B plate, untipped | owl-free median of 1382-1417 (`tone_plateB.py`) | 250 |
| `../data/toneB.js` `bg` | shot B background layer (tip frames) | the pre-tip median plus what 1424-1432 reveal (`tone_plateBtip.py`) | 150 |
| `../data/toneB.js` `kb` | shot B keyboard layer (tip frames) | the pre-tip median inside the keyboard | 200 |
| `../data/toneOwlA.js` | the three owl A wing-phase drawings | PATH_A-registered mean of the standing frames per phase (`tone_owlA.py`) | 60 each |
| `../data/toneOwlB.js` | owl B belly and far-wing drawings | TRACK_B-registered mean of 1382-1416 (`tone_owlB.py`) | 60 |

Nothing per frame is corrected this way. The scripts read renders of the harness `snapshots/s18-h/layers.js`
(mode 1 plate, 2/3 owl on black / white for its alpha, 4/5 keyboard, 6 background, 7/8 tipped keyboard) and raw
harness renders (`node snapshots/s18-h/render.mjs OUT FRAMES 1`); `S18SRC` points at extracted source frames and
`S18WORK` at a scratch directory. If a drawing is re-traced, its blobs must be re-fitted.

Fit numbers (blurred MAE on the pre-grade values x255, inside the fit mask): plate A 4.11 -> 2.46, B still
3.79 -> 1.74, B bg 2.33 -> 1.38, B kb 3.29 -> 1.62, owl A phases 7.9-8.2 -> 2.7-3.5, owl B 3.94 -> 1.80.

## Fix pass 4 (review 1)

- `fit_bands.py` handles the pressed-key stripe wedges the trace missed (1383, 1384, 1394 and 1400).
  - The polygons were read by eye off 3× gridded source crops.
  - Inside each polygon, the script fits the stripe angle, pitch and phase on the pre-grade frame by maximising the stripes' Fourier contrast, then the two tones and the line width.
  - The result is written into `BANDS_FIX` in `../shotB.js`.
- Everything else in this pass was measured with the harness `snapshots/s18-fix1-h`:
  - `feetdiff.py` makes source crops registered on PATH_A, overlaid with the difference from the owl-free plate median, on a 10-px grid. The foot rigs in `../data/feetA.js` were read off these crops and checked with `feetover.py`, which overlays the drawn rig.
  - `flyfit.py` and `flyaniso2.py` fit the per-frame blur of the take-off. The owl layer is rendered raw on black and on white, and the plate separately, then composited in Python. The fit matches the gradient structure tensor inside the owl, with the σ2 error held.
  - The dome outlines of the knob caps are the slats' lower ends per column on the median of 1395–1416.
  - The beak coordinates were read off 1356 and 1370 at 8× and corrected against the PATH_A-registered mean.

- `fit_tone_box.py` (fix pass 1b): `fit_tone.py` limited to a box: blob centres inside the box, error scored over everything the blobs reach inside the drawn owl. Used for the take-off cup correction (`data/cupTone.js`, 1421 and 1422). The shot-A tail (`tailA.js`) was measured by hand from a per-pixel value table of frame 1356, and its per-frame pose by OpenCV ECC (euclidean, masked to the tail) of each PATH_A-registered source frame against 1356. That one-off script was not kept; the poses are in `TAIL_POSE`.
