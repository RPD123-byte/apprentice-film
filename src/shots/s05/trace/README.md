# s05 trace: how ../data/*.js are made

Measurement scripts only: the film never loads them. They read source frames and write vector data to `../data/`:

- value studies as nested iso-value outlines (polygons);
- ink strokes as centre-lines with a width per point and one value per stroke chunk;
- per-frame motion grids and tables.

No pixels are stored. `../ink.js` draws a layer from this data: it fills the outlines, softens them with a gaussian, draws the tapered strokes over them, tints the result and cuts it to the layer's outline.

Requirements: Python 3 with numpy, opencv (cv2), scipy and scikit-image. Cached frames and intermediate results go to `S05_CACHE` (default `snapshots/s05-p2-study/cache`), and tracks go to `S05_TRACKS` (default `snapshots/s05-p2-study/tracks`).

## Order

```sh
. ./params.sh                 # the tracer settings used for ../data
python3 masks.py              # layer masks of the settled frame (CACHE/masks.npz + masks.jpg overlay)
python3 settle_track.py lapbase 380 520 1240 910 lapbase   # rigid-part tracks through the settle (after writing
python3 settle_track.py face 1270 240 1440 520 fig          #   CACHE/masks_lap.npz, see settle_track.py)
python3 settle_track.py pencil 1150 390 1400 490 fig
python3 settle_fit.py         # camera-settle motion grids per layer (CACHE/settle_fields.json)
python3 export_settle.py      # -> ../data/settle.js
python3 settle_fill.py        # what the settle uncovers behind the figure / under the hands (CACHE/settle_fill.npz)
python3 build.py              # every layer: strokes + value study (CACHE/layer_<name>.pkl)
python3 export.py             # -> ../data/<layer>.js
python3 track.py ...          # hand tracks for ../../s05.js (HAND_*), printed per frame
```

## Scripts

- `grade.py`: a model of `src/lib/post.js` and its inverse. All measuring is done on the un-graded source; the model reproduces the grade to about 1 level.
- `frames.py`: reads and un-grades source frames and builds the targets:
  - the settled frame: 24.16–25.12, exposure matched, with the right hand at rest at 24.88–25.00;
  - pose B of the hand: 25.48–26.68, without the owl's dip;
  - the dip's bottom: 26.00–26.08;
  - the dip's head motion.
- `seg.py`, `masks.py`: layer masks, built three ways:
  - flood fills bounded by ink lines;
  - the owl head's own motion, 25.00 against 26.04;
  - hand-placed polygons, including fix pass 1's (`old_masks.json`).
- `ridges.py`: the stroke tracer.
  1. Hessian ridge strength at σ 1.0, 1.6 and 2.4, for dark and for white lines.
  2. Hysteresis threshold, then skeletonise, re-join the paths and smooth them.
  3. Simplify with RDP.
  4. Take width and value from the line's cross profile (FWHM).
- `strokefit.py`, `sim.py`: the drawing model in Python, matching `../ink.js`.
  - The value study is fitted under the strokes (base = (I − strokes) / coverage).
  - Each stroke's width scale is fitted on its own.
  - All stroke values are then fitted together by sparse least squares, which accounts for overlaps and the final softening.
- `build.py`: builds every layer (room, desk, lh, rh/rhB, arm/armB, fig, owl/owlD). Each layer is traced where it is visible; where it is hidden it is filled from other frames:
  - under the sliding hand: the pose-B frames, then 24.24;
  - behind the figure: the settle frames;
  - behind the owl's head: the dip frames.

  Anything still unseen is filled smoothly.
- `export.py`, `export_settle.py`: pack the numbers in the `encoded polyline` style: zig-zag integers in 5-bit groups, one ASCII character each.
- `track.py`, `settle_track.py`: ECC tracks (translation, or affine) of a settled-frame region through the source frames.
- `settle_fit.py`: builds the settle grids.
  1. Warp each layer by its similarity model, then measure the rest with DIS optical flow against each source frame.
  2. Take a weighted median per grid node over the layer's own textured pixels.
  3. Fill the empty nodes from the model.
  4. Use the rigid-part tracks for the laptop base, the face and the pencil.
- `settle_eval.py`: checks the grids against the source by warping the settled frame.

## Pass 3 additions

- `build_clipA.py [owl,fig,desk]`: the source's first clip (up to 24.00; it dissolves into the second at 24.00-24.12)
  draws the designer, the owl and the desk's left part differently from the settled frame. This traces them on the
  mean of 23.52-23.96 (each frame divided by s05.js's LIGHT gain), reusing the second clip's masks, extents and hidden
  fills from `CACHE/layer_<name>.pkl` -> `CACHE/layer_<name>A.pkl`. Then `tone.py <name>A` and `export.py <name>A`.
- `build_keys.py 578,...`: one flattened tracing of a whole source frame (the laptop screen left out: the page is drawn
  over it), for the settle's fastest frames -> `CACHE/layer_key<k>.pkl`, then `tone.py key<k>`, `export.py key<k>`.
  s05/layers.js `KEYS` lists the frames drawn this way.

