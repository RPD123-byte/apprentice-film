# s08 — 30.56–32.6 s: Screen close-up: red selection, the note card types 'This is really good'

Status **close**, method **traced** (see `docs/FIDELITY.md` and `docs/fidelity/s08.md`). The render code is `src/shots/s08.js` and `src/shots/s08/`.

## How the data in `src/shots/s08/` was made

Scripts whose code writes into `src/shots/s08/` (found from the output paths in their source; `{…}` = a name filled in at run time):

| script (in `tracing/`) | writes |
|---|---|
| [`s08/trace-scripts-s08-fix1-tools/genorn.py`](trace-scripts-s08-fix1-tools/genorn.py) | `src/shots/s08/ornaments.js` |

## Index of folders (11)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `trace-scripts-s08-dev/` — work folder, 14 files

- `build.py`
- `fonts.built.html`
- `pure.built.html`
- `card.built.html`

### `trace-scripts-s08-f3-tools/` — tools, 29 files
camfit2.py RENDERDIR [apply]: ECC similarity residual per frame -> corrected CAM table [u, s, tx, ty, rot(deg)]

- `camfit2.py` — camfit2.py RENDERDIR [apply]: ECC similarity residual per frame -> corrected CAM table [u, s, tx, ty, rot(deg)]
- `camfit.py` — camfit.py RENDERDIR : per-frame residual similarity between render and source (ECC affine on blurred luma), expressed as a corrected camera (s, tx, ty) per frame.
- `textfit.py` — src(x) ~ ren(sc*x+sh): render position of a source feature at x is sc*x+sh
- `snap_poly.py` — snap_poly.py RENDER.png BLOCK [apply] [densify] -- register traced polygons (ORN or CLOUD) onto the source frame 764

### `trace-scripts-s08-fix1-tools/` — tools, 38 files
the fan of straight wedges above the u and r (hand-placed on a 3x zoom of the first frame, F0 px)

**Writes into:** `src/shots/s08/ornaments.js`

- `genorn.py` — the fan of straight wedges above the u and r (hand-placed on a 3x zoom of the first frame, F0 px)
- `gfit.py` — Fit a smooth pre-grade light correction G(x,y) (bilinear over a control grid) for STATIC, from frame 765.
- `extract.py` — Trace the lower-left ornament regions of the source close-up (frame 764/765 average, F0 coords) into simplified polygons + a target flat colour per region (as the F0 col…
- `lightfit.py` — erode to avoid edges

### `trace-scripts-s08-fix1x-tools/` — tools, 10 files
inner edge (paper->dark) half level

- `nubtrace.py` — inner edge (paper->dark) half level
- `cam.py`
- `cells.py`
- `h.html`

### `trace-scripts-s08-ref/` — measurement / study, 8 files
Warp a close-up source frame into page units (1600x1000 page), with vignette/S-curve undone, plus grid.

- `pageref.py` — Warp a close-up source frame into page units (1600x1000 page), with vignette/S-curve undone, plus grid.
- `rectify.py` — page -> frame t : Hm @ inv(H0)
- `cardref.py` — Warp a close-up frame into card-local coords: card top-left (1450,182) at t0, card width 465 frame px -> out scale K per t0-px
- `typestrip.py` — map t0 box to frame t

### `trace-scripts-s08-rev2n-tools/` — tools, 5 files
node r.mjs outdir frame1,frame2,...

- `cam.py`
- `h.html`
- `r.mjs` — node r.mjs outdir frame1,frame2,...
- `c2.py` — c2.py nm x0 y0 x1 y1 scale out [h]

### `snapshots-s08-fix1r-tools/` — tools, 18 files
Edge softness by region: erf fits of profiles across strong source edges, the same points in the render.

- `edgefit.py` — Edge softness by region: erf fits of profiles across strong source edges, the same points in the render.
- `trace.py` — Half-level tracing of flat colour regions on the source's first frames (F0, average of frames 764-767).
- `cam.py`
- `h.html`

### `snapshots-s08-fix2-tools/` — tools, 16 files
Edge softness by region: erf fits of profiles across strong source edges, the same points in the render.

- `edgefit.py` — Edge softness by region: erf fits of profiles across strong source edges, the same points in the render.
- `keycore.py` — keycore.py RDIR frames : dark keyline core minima per region, source vs render (F0).
- `cam.py`
- `corner.py` — corner.py RDIR frames : paper-edge (level 150) crossings round the card's corners, source vs render (F0), and circle fits

### `snapshots-s08-p4-tools/` — tools, 18 files
source-to-source camera: ECC affine of every source frame k against frame 764 (card text masked), composed with the table's M(764) (F0 -> frame 764), projected to a simi…

- `camfit.py` — source-to-source camera: ECC affine of every source frame k against frame 764 (card text masked), composed with the table's M(764) (F0 -> frame 764), projected to a simi…
- `cam.py`
- `ink.py`
- `libtest.html` — page at laptop size and a close-up region

### `scratch-build-s08rev/` — comparison / review evidence scripts, 2 files
usage: crop.py render.png ref.png x0 y0 x1 y1 out.jpg [scale] [mode: v\|h] [diff]

- `cam.py`
- `crop.py` — usage: crop.py render.png ref.png x0 y0 x1 y1 out.jpg [scale] [mode: v\|h] [diff]

### `scratch-build-s08rev2/` — comparison / review evidence scripts, 5 files
card column profile: median luma over y 560-700 (empty text area interior) and y 220-300

- `ink.py`
- `card.py` — card column profile: median luma over y 560-700 (empty text area interior) and y 220-300
- `an2.py` — signed luma diff: red=render brighter, blue = render darker
- `an1.py` — global shift via phase correlation on luma
