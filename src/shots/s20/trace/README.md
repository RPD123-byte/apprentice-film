Measurement scripts for s20. The film never loads them. They read source frames and write control points only (packed
value-band rings and ink centre-lines) to `src/shots/s20/data/`. No pixels are stored.

They run from the project root.
- They expect the extracted source frames in `snapshots/s20-rev1-src/n<frame>.png`.
- Intermediates go to `snapshots/s20-f2-trace/`.
- The dev harness is in `snapshots/s20-f2-dev/`: `dev.mjs` plus the `shot` / `rawroom` pages, which are used to redraw a
  trace with the film's own painter.

- `grade_inv.py` inverts `src/lib/post.js`: halation, S-curve, vignette and flicker. Traced values are pre-grade.
- `composite2.py [A card full behind grimy B2 B2full]` builds robust temporal medians of the static layers in the A frame
  (setup B warped back by the measured camera, with B1 normalised by its tone curve). The owl is excluded per frame by its
  own traced silhouette, read from `data/owlframes.js` plus the key masks.
- `trace_room.py` holds the tracer:
  - Surfaces: a 5 px closing, then posterised value bands, outlined with holes.
  - Ink lines: Hessian ridges with hysteresis, skeleton, and re-joined paths. Each point carries its width, its ink
    value and the surface value under it.
- `trace_all.py [room behind grimy b2 hold]` traces the layers, writes the data modules, and makes two residual passes
  (`finalize`): redraw, trace the missed lines, add them. It applies the band calibration from `calib.py`.
- `calib.py` compares a raw redraw with its composite for each value band and writes the corrections.
- `owlkeys.py` handles the owl:
  - `build <key>` makes a held key (the median of the frames that hold the drawing, its silhouette, the trace).
  - `fit <key> <frames>` fits an ECC affine of the key to each frame.
  - `frame <n,...>` makes single-frame traces against the film's own owl-less render.
  - `framedust <n,...>` makes the same traces including the dust (the render is made with `nodust`).
  - `haze <key> <n,...>` traces the haze as an additive lift layer under a held key.
- `select_frames.py` picks the drawing for each frame and writes `data/owlframes.js`, `data/owlkeys_index.js` and
  `data/haze_index.js`.
- `pack.py` packs the CSV integer strings as base64 zigzag varints (decoded in `s20/tracedata.js`).
