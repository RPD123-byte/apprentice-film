Round-3 measurement scripts for s14 (not loaded by the film). They read source frames only to measure and write
numbers (polygon vertices are traced by hand on labelled grids; everything else is fitted scalars). Frames are
cached in snapshots/s14-r3-meas/src<T>.png (identical to tools/compare.sh's reference frames).

- `common.py`: frame access, the grade's inverse (S-curve, vignette, flicker; no halation) for pre-grade values,
  geo3.js loader, overlay drawing.
- `ov.py x0 y0 x1 y1 scale out.jpg [t] [grid]`: geo3.js polygons over a labelled source crop (tracing aid).
- `ovt.py t out.jpg [layers]`: the same polygons mapped through the dolly model onto a later frame.
- `sbs.py render.png t x0 y0 x1 y1 scale out.jpg`: render/source crop pair.
- `tone3.py fit|fix T,T,... [renders] [k] [kt]`: per face of geo3.js, a linear value ramp (pre-grade) over the
  face's visible part (later faces and layers removed, owl masked), fitted over many dolly frames (each face's
  pixels mapped back to R40 through its layer's plane; frames weighted by R40 area, magnified frames down-weighted);
  `fix` adds (source fit - render fit) and scales each face's fine-texture gain (high-pass energy) and brush gain
  (band-pass 2.5-12 px contrast) toward the source's. -> ../tone3.js
- `light3.py renderdir [k]`: per layer and per dolly frame, a gain and a screen-space linear ramp. -> ../light3.js
- `jointfit.py track | fit2`: tracks ~560 points on all layers 40.00 -> 40.64 (chained, scale-compensated template
  matching) and fits every layer's inverse-depth plane jointly with a per-frame camera side-shift. -> planes in
  ../room3.js LAYERS3, EOFF in ../../s14.js.
- `planefit.py`, `track.py`, `trackpts.py`: single-layer versions used while checking the fits.
- `gapratio.py`: the gap view's light, source(t) / source(40.00) warped by the zoom similarity.
- `gaplight.py renderdir [k]`: per-layer gains in the gap view. -> ../gaplight3.js
- `gapfix.py`: an overall gain for the GAP table (superseded by gaplight.py; kept for reference).
- `iterate.sh NFIX NLIGHT [fit]`: one fitting pass (renders the dolly with tools/compare.sh into
  snapshots/s14-r3-dolly and runs the fits).
- The desk plank's edges per frame (magnification, focus of expansion; s14.js DESK_CY) were measured inline with
  a short script: left end = first column above 0.42 luma in the plank's middle band, top/bottom = strongest
  vertical gradients.
