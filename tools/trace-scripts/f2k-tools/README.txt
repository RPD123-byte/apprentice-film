F2 (hippie.js) measuring tools. Scratch, not part of the film. Run from a working dir holding the source frames
(tools/refframe.sh 117.4 ref-117.4.png, 115.6 ref-115.6.png) and, for the strip ends, strip-pre.png (the median of the
91/92/93/94 s frames, un-graded, warped into colour-page coords with BANNER_MAP's frame mapping, page x shifted +500;
see docs/hippie.md).
  ungrade.py   exact inverse of the source's finish pass (flicker, vignette, S-curve, halation) -> pre-grade frame
  autopal.py   k-means palette of a region of the pre-grade frame
  trace.py     spec.json -> tr-*.json: colour classes, cleaned, smoothed; contours simplified to ~0.6-0.8 px; per-region
               median colours; ink = black-hat ridges -> skeleton -> variable-width strokes; zones/masks/exclusions
  emit.py      tr-*.json -> JS literal (TR_* in hippie.js); upd.py splices them into src/lib/hippie.js
  rast.py      quick raster preview of a trace; errmap.py blurred CIE76 dE grid (render vs source)
Specs: spec-top/sl2/mid/dk/sr2/owl/xl/xr/des/hl.json (TR_TOP, TR_SL, TR_MID, TR_DK, TR_SR, TR_OWL, TR_XL, TR_XR, TR_DES,
TR_HL). The upd.py paths point at the session scratch dir; edit D before reuse.
