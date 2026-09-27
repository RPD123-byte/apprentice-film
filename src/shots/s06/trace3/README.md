# s06 round-3 measurement scripts (trace3)

These scripts measure the source and write the r3 data modules in `src/shots/s06/data/r3_*.js`. The film never
loads the scripts, the source or any image. The data modules hold only numbers: nested value outlines, pen-stroke
centre-lines with widths and tones, line-relative stroke coordinates, and motion samples.

Run from the project root. Scratch output goes to `snapshots/s06-r3-out/`.

## What is measured

Every layer of the frame is described in the same way (`region.py`):

- **ground**: the soft value under the strokes. This is a morphological closing of the ungraded source, or an
  opening for dark layers such as the hair and the laptop. Anything masked out is filled in from the ground-like
  pixels around it. It is written as nested outlines at 0.02 value steps. The film draws these crisp into a scratch
  layer and composites the layer blurred by 0.5 px. If each outline were blurred on its own, outlines meeting at one
  sharp edge would compound.
- **solids**: the thick darks, such as lash lines and pupils. These are outlines at 2 or 3 dark levels, after an
  opening.
- **ink**: dark pen strokes traced on whatever the ground and solids still lack.
  - `trace3.py` traces them with a scale-normalised Hessian ridge. Non-maximum suppression is applied across each
    line's own normal, so hatching 3 to 4 px apart stays separate. Centres are refined to sub-pixel accuracy, and
    chains are joined by end direction.
  - The strokes are traced in 1 to 3 passes.
  - `fit.py` calibrates them by analysis-by-synthesis. Each stroke's tone follows the fine-scale error (σ 0.7) and
    each point's width follows the coarse error (σ 2).
- **light**: pale strokes on dark areas, such as hair strands and the room's edges. They are traced and calibrated
  the same way.

`raster.py` is a numpy model of the film's own drawing calls (`ink.js` drawInk, `face3.js` massLayer). Its coverage
model supersamples 8 × 8 and insets by half a sample, because cv2's own anti-aliased fill is about 0.6 px too fat.
It agrees with the browser to about 1.6/255 at σ 1.5 on the face (grain included). All measured coordinates are pixel
centres, so the film draws the data +0.5 px.

## Inputs

`prep3.py` builds the inputs from the frames and means that `trace/prep.py` made. In each case it divides out the
film finish's exposure flicker (`src/lib/post.js`, which matches the source to about 0.3 %) before undoing the
grade:

- `neutral_pre3.npy`: frames 26.76–27.04.
- `smile_pre3.npy`: the held smile, frames 28.44–28.96.
- `owl_post_pre3.npy`: frames 28.56–29.00.
- `blink_<t>_pre3.npy`: the 13 blink frames, each denoised with non-local means.

## Scripts

1. `node polys.mjs` (called by `layers_r3.py`) dumps the silhouettes from `head.js`, `face.js` and `body.js`.
2. `layers_r3.py NAME... [--smile | --src FILE --sfx SFX --state TEXT] [--export]` traces the layers, or with
   `--export` re-encodes them from `snapshots/s06-r3-out/NAME.json`.
   - The layers are room, body, face, brow, mouth, nape, hair, beanie, hand, pencil, laptop, owl and owlhead.
   - brow and mouth are traced against the face layer's own render.
   - The mouth leaves out the mouth line and the bristle comb above it.
   - The output encoding is enc 2: integer deltas, decoded by `face3.js decodeR3`.
3. `mline_fit.py` calibrates the drawing of the per-frame mouth line (`motion3.js` MLINE). The line itself was fitted on
   every frame in round 2 (`data/mouth.js`).
4. `comb_r3.py` traces the lip comb above the line. Each point is stored as (u, d) relative to the line
   (`lineframe.py`), so the film re-attaches the comb to each frame's line.

Full re-trace: `snapshots/s06-r3-tools/retrace_all.sh` (about 30 min on 16 cores; the layers' own settings — stroke
softness 0.8 for the owl, owl heads, beanie and hoodie, 0.4 for the hair, 3 ink passes and dark solids for the face
and fist — are in `layers_r3.py layer_cfg`).

## Tried and dropped

- Greedy stroke fitting (strokes laid on the residual one at a time) was blotchier than the tracer.
- A procedural iris (two-circle gradient with traced polar streaks) scored 8.5–18/255 against 4.6–6.7 for the traced face
  layer.

Both were deleted.
