Measurement scripts for s22's traced owl drawings (not loaded by the film). They read the SOURCE film only to
measure and write control points only — silhouette rings, tone-region rings with one grey each, a 6-coefficient base
field — which `../owlData.js` stores delta-encoded; `../traced.js` redraws them. No pixels are stored.

Pipeline (work dir `$S22_WORK`, default `/tmp/s22-work`):

1. `prep.py frames|top|late|walk` — frame cache; the grade inverse (`common.ungrade`: flicker, vignette, S-curve and
   halation of `src/lib/post.js` undone, grain removed by the medians); the top-edge drawing aligned by phase
   correlation and median'd (42 frames); grade-inverted late frames and clean plates; the walking drawing fitted with
   a Euclidean ECC per pose and median'd in drawing coordinates (27 poses).
2. `trace_edge2.py` — the edge drawing: silhouette from the top-side median = owl brighter than its own halo by 0.2
   (halo = normalised convolution of the pixels outside a rough mask), 4× supersampled contours, RDP 0.35 px; values
   from the bottom-side median (inside the screen, where no margin light lifts the owl's darks); tone regions =
   contours of (base − value) at 0.06/0.14/0.24/0.36/0.5/0.66, one median grey per connected region.
   (`trace_edge.py` = the first version, values from the top-side median with the margin light baked in.)
3. `trace_all.py` — every other drawing (flight 79.80–80.04, the held brandish, the swing 80.56–80.76, the throw,
   facing and reach poses, 81.60, the walk, the haul at 83.96) with per-frame plates / keep / exclude polygons.
4. `build_data.py ../owlData.js` — writes the module.
5. `tonefit.py <compare dir>` — per-drawing mid-tone check inside each drawing's footprint (render | source).

Pass 4:

6. `trace_lines.py SRC_MED RENDER_MED out.json dbg.jpg [X0 Y0 S HI LO MINLEN [hp]]` — the fine dark lines a drawing's
   tone regions lose: thin dark ridges of (render − source) on the two grain-free medians of the drawing in its own
   anchor-local coordinates (Hessian σ 3 / 5 at 4×, inside the eroded owl, hysteresis, skeleton, chains, RDP), each
   point with a width (FWHM of the residual across the line) and a multiply factor (source core / render, both taken
   back through the grade's S-curve). `hp` uses the local residual (for drawings whose whites sit at the margin's
   white cap). The medians are built by the pass-4 scratch harness (`snapshots/s22-p4-h`: `med_edge.py`,
   `rmed.py`, `walkmed.py`, `latelines.py`); the result is `../lines.js`, drawn by `../traced.js` (`lines`).
7. `measure_rim.py > rim ring` — the hole's torn rim, measured on 82.64–84.00 (`../rim.js`).

Fix pass 2:

8. `resid_lines.py RENDER_DIR SRC_DIR BOXES.json OUT.json [names]`: residual fine lines of every late drawing, traced with
   `trace_lines.py` on medians in each drawing's anchor-local px (walk through its per-pose fit). **Tried and not used**:
   on single grainy frames they were noise (σ0.7 error −0.02…+0.09, energy < +0.01).
9. `write_lines2.py`: writes `../lines2.js` (a second multiplied line layer). It holds the walk's face-disc contour, chin
   mark and wing edge (median ridge positions over its 56 frames) and the brandish's blade edge lines (ridge centres on
   its still frames 2010–2013).
10. The haul drawing's feet outline and cup tone levels (in `../detail.js`) were measured with the scratch harness
    (`snapshots/s22-fix2-final/harness/`): 95-level contour of frames 2099–2100 below y 232.5; cup contours at 0 / 45 /
    60 / 75 / 90 / 105 inside the cup's ellipse. Its silhouette's two chest slits were closed in `../owlData.js`.
    Measure with that harness, not the swiftshader ones: it runs the film's own browser (Chrome 131, ANGLE Metal, GPU
    raster) and matches `tools/compare.sh`.
