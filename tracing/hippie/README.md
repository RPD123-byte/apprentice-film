# hippie

F2 — the colour site (retro hippie page and banner): src/lib/hippie.js

`src/lib/hippie.js` is **traced** (approved by the user for the colour ending). The pipeline, in `trace-scripts-f2k-tools/` (see its `README.txt`): `ungrade.py` inverts the source’s finish pass so a frame can be measured in pre-grade colours; `autopal.py` finds a k-means palette per region; `trace.py` turns a `spec-*.json` into `tr-*.json` — colour classes cleaned and smoothed, contours simplified to ~0.7 px with median colours, ink found as black-hat ridges → skeleton → variable-width strokes; `emit.py` writes each trace as a JS literal (`TR_*`) and `upd.py` splices them into `hippie.js`. The `snapshots-f2r-*` folders are an earlier traced-and-fitted rebuild (Shrikhand headline glyph fits, ribbons, clouds and leaves as primitives); `snapshots-hipR-final/` is the ending run’s restore of the traced page.

## Index of folders (12)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `trace-scripts-f2k-harness/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 3 files
Copy of the composition’s index.html (+ hyperframes.json/meta.json) used to render this shot on its own; at the time `src/` and `assets/` were symlinked next to it, so the shot code it loaded is not duplicated here.

- `index.html` — The Apprentice — drawn in code

### `trace-scripts-f2k-tools/` — tools, 19 files
F2 (hippie.js) measuring tools.

- `trace.py` — Trace flat-colour backdrop shapes (clouds, ribbons) from the SOURCE frame into simplified outline polygons (measurement only: the output is vector geometry + palette nam…
- `emit.py` — emit a traced patch as a compact JS literal
- `ungrade.py`
- `skel.py` — skeleton -> list of polylines with per-point half-widths

### `prev-builds-f2-drawn-prev/` — an earlier build of the shot that a later pass replaced (kept for reference), 2 files
The colour version of the sōko site ("Mixing down, late at night." in the groovy 1970s style), drawn in code.

- `hippie.drawn.js` — The colour version of the sōko site ("Mixing down, late at night." in the groovy 1970s style), drawn in code.

### `prev-builds-f2r-prev/` — an earlier build of the shot that a later pass replaced (kept for reference), 1 file

### `snapshots-f2r-film/` — the shot build after a pass (+ the scripts used in it), 1 file
Copy of the composition’s index.html (+ hyperframes.json/meta.json) used to render this shot on its own; at the time `src/` and `assets/` were symlinked next to it, so the shot code it loaded is not duplicated here.

- `index.html` — The Apprentice — drawn in code

### `snapshots-f2r-fit/` — tracing / fitting, 31 files
Fit each headline glyph (font glyph, affine: translate, scale, rotate, x-stretch, shared skew) to the source's headline face mask.

- `fit_hl.py` — Fit each headline glyph (font glyph, affine: translate, scale, rotate, x-stretch, shared skew) to the source's headline face mask.
- `fit_ext.py` — Measure the headline extrusion per glyph: the shift D (dx, dy) such that face swept along 0..D (dilated by the keyline) best matches the non-sky mask; and the orange par…
- `fit_hl2.py` — per-glyph skew refinement starting from fit-Shrikhand.json
- `mkrib.py`

### `snapshots-f2r-harness/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 1 file
Copy of the composition’s index.html (+ hyperframes.json/meta.json) used to render this shot on its own; at the time `src/` and `assets/` were symlinked next to it, so the shot code it loaded is not duplicated here.

- `index.html` — F2 harness

### `snapshots-f2r-tools/` — tools, 37 files
Heart leaves as primitives (measurement): green regions bounded by ink -> [cx, cy, length, width, tipAngle, ink] Usage: leaffit.py x0,y0,x1,y1 [--min 60] [--dbg out.png]

- `leaffit.py` — Heart leaves as primitives (measurement): green regions bounded by ink -> [cx, cy, length, width, tipAngle, ink] Usage: leaffit.py x0,y0,x1,y1 [--min 60] [--dbg out.png]
- `ribbuild.py` — Build ribbon band polygons from station scans (measurement -> sparse edge lists for hippie.js).
- `cloudfit.py` — Clouds as layered circle-unions (measurement -> primitives).
- `facefit.py` — Flat regions bounded by ink lines -> polygons of few vertices (corner measurement) + median ink.

### `snapshots-hipR-final/` — the shot build after a pass (+ the scripts used in it), 6 files
hipR (restore of the traced colour site, src/lib/hippie.js), final comparison.

- `extract.py`
- `metric.py` — ΔE (CIE76 on Gaussian-blurred frames) in the page/banner region and full frame, for several render sets vs source.
- `pair.py` — pair.py T dirA [dirB ...] out.jpg [x0,y0,x1,y1] [--w W] -> stacked: each dir's frame, then source (labelled)
- `pm.py` — page-harness metric: pm.py dir [dir ...] -> ΔE σ2/4/8/12 page@117.4 (owl corner masked), strip@92 (strip rect)

### `scratch-build/` — loose scripts from an agent scratchpad, 17 files
Trace the dark ink strokes inside the owl on a source frame into centre-line polylines with width + darkness.

- `trace.py` — Trace the dark ink strokes inside the owl on a source frame into centre-line polylines with width + darkness.
- `cloudtrace.py` — trace cloud layer tops. usage: cloudtrace.py img s tx ty xc0 xc1 step yc0 yc1 colour coords (xc,yc) -> frame (s*xc+tx, s*yc+ty). Prints per column the first y (colour co…
- `clouds.js` — clouds ---------- A cloud layer's top edge is a chain of scallops: cusps [[x, y], ...] and the peak height of each lobe between two cusps (tops[i] between cusps i and i+…
- `head.js` — raised forearm (sleeve rolled): elbow on the desk, fist under the chin

### `scratch-build-f2k/` — tracing / fitting, 19 files
The colour version of the sōko site ("Mixing down, late at night." in the groovy 1970s style), drawn in code.

- `hippie.v19.js` — The colour version of the sōko site ("Mixing down, late at night." in the groovy 1970s style), drawn in code.
- `tr-hl.js`
- `tr-top.js`
- `tr-dk.js`

### `scratch-ending/` — loose scripts from an agent scratchpad, 1 file

- `blank.html`
