# s26 — 110.52–117.52 s: The shards blow out into colour: the finished site

Status **close**, method **traced** (see `docs/FIDELITY.md` and `docs/fidelity/s26.md`). The render code is `src/shots/s26.js` and `src/shots/s26/`.

## How the data in `src/shots/s26/` was made

The data files the render loads name the script that generated them in their header comment. Those scripts, at their new paths:

| producer script (in `tracing/`) | runtime files it produced |
|---|---|
| [`s26/snapshots-end-s26-fix1-tools/codec.py`](snapshots-end-s26-fix1-tools/codec.py) | `src/shots/s26/codec.js` |
| [`s26/snapshots-end-s26-fix1-tools/export_js.py`](snapshots-end-s26-fix1-tools/export_js.py) | `src/shots/s26/scissorsTrace.js` |
| [`s26/snapshots-end-s26-fix1-tools/ztrace.py`](snapshots-end-s26-fix1-tools/ztrace.py) | `src/shots/s26/scissorsTrace.js` |

Scripts whose code writes into `src/shots/s26/` (found from the output paths in their source; `{…}` = a name filled in at run time):

| script (in `tracing/`) | writes |
|---|---|
| [`s26/snapshots-s26-fix1-tools/crackwrite.py`](snapshots-s26-fix1-tools/crackwrite.py) | `src/shots/s26/cracksA2.js` |
| [`s26/snapshots-s26-fix1-tools/writeCD.py`](snapshots-s26-fix1-tools/writeCD.py) | `src/shots/s26/owlCDfit.js` |
| [`s26/snapshots-s26-fix1-tools/writefield.py`](snapshots-s26-fix1-tools/writefield.py) | `src/shots/s26/fieldC2.js` |
| [`s26/snapshots-s26-fix1-tools/writering.py`](snapshots-s26-fix1-tools/writering.py) | `src/shots/s26/ringD2.js` |
| [`s26/snapshots-s26-fix2-tools/fieldfix.py`](snapshots-s26-fix2-tools/fieldfix.py) | `src/shots/s26/fieldC2.js` |
| [`s26/snapshots-s26-fix2-tools/writeclear.py`](snapshots-s26-fix2-tools/writeclear.py) | `src/shots/s26/ringClear.js` |
| [`s26/snapshots-s26c-tools/smoothF.py`](snapshots-s26c-tools/smoothF.py) | `src/shots/s26/featF.js` |
| [`s26/trace-scripts-s26b-meas/shards/exportC.py`](trace-scripts-s26b-meas/shards/exportC.py) | `src/shots/s26/fieldC.js` |

## Index of folders (20)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `trace-scripts-s26-study/` — measurement / study, 7 files
cowl.py dir clean_time t1 t2 ...

- `cowl.py` — cowl.py dir clean_time t1 t2 ...
- `owlmask.py` — owlmask.py dir [x0 y0 x1 y1]: bright low-saturation blob (the white owl) in render vs source: bbox, centroid, IoU
- `gcrop.py` — gcrop.py out.jpg img1:cx:cy:R [img2:cx:cy:R ...] -> 500px tiles with a 20px frame-coordinate grid
- `match.py`

### `trace-scripts-s26b-harness/` — render harness (a trimmed copy of the composition that renders one shot / exact frames), 1 file
Copy of the composition’s index.html (+ hyperframes.json/meta.json) used to render this shot on its own; at the time `src/` and `assets/` were symlinked next to it, so the shot code it loaded is not duplicated here.

- `index.html` — The Apprentice — drawn in code

### `trace-scripts-s26b-meas/` — measurement / study, 48 files
fit.mjs — fit the s26 owl rig to the source owl silhouette, frame by frame (pattern search on IoU at 1/2 res).

**Writes into:** `src/shots/s26/fieldC.js`

- `shards/exportC.py`
- `fit/fit.mjs` — fit.mjs — fit the s26 owl rig to the source owl silhouette, frame by frame (pattern search on IoU at 1/2 res).
- `shards/cells.py` — cells.py Fref tag : shard cells of the rigid blast field in frame Fref coordinates outline mask (presence P + Hough segments) -> cells (complement components) -> per cel…
- `shards/cells2.py` — cells2.py Fref tag F0 F1 : shard cells of the rigid blast field (frame Fref coords) with labels bw / col / black

### `trace-scripts-s26b-rigview/` — work folder, 1 file
s26 rig preview (scratch): tau -> frame F = 2700 + round(tau); draws only the owl rig of that frame on grey

- `index.html` — s26 rig preview (scratch): tau -> frame F = 2700 + round(tau); draws only the owl rig of that frame on grey

### `trace-scripts-s26b-tools/` — tools, 8 files
srcmask.py: source colour-owl masks for F (t >= 114.08) = \|frame - warped clean page\|

- `srcmask.py` — srcmask.py: source colour-owl masks for F (t >= 114.08) = \|frame - warped clean page\|
- `pair.py` — pair.py outdir : renders frame-*.png -> r-F.jpg + ref-F.jpg (q95) + pair-F.jpg, σ8 ΔE printed; PNGs removed (disk)
- `rv.sh` — rig preview: rv.sh "F,F,..." outdir x0 y0 x1 y1 -> outdir/rv-F.jpg (rig \| source crop)
- `aff.py` — aff.py F0 F1 [x0 y0 x1 y1]: full affine of frame F1 relative to F0 (ORB + RANSAC)

### `prev-builds-s26-end1-prev/` — an earlier build of the shot that a later pass replaced (kept for reference), 16 files
s26 C/D owl: per source frame, the kit owl's egg body, two layered spread wings (S, Wr, T, trail, len, spread) and tail, in frame px, fitted to the source owl silhouette…

- `s26/owlCDfit.js` — s26 C/D owl: per source frame, the kit owl's egg body, two layered spread wings (S, Wr, T, trail, len, spread) and tail, in frame px, fitted to the source owl silhouette…
- `s26/fieldC2.js` — s26 beat C: the shard field rebuilt as straight-edged shards, in field coordinates (= the 112.00 frame).
- `s26/rig.js` — s26 — the owl in flight, as a posable rig drawn in code (B&W "ink" style for the blast, colour style for the finished page).
- `s26/owlColour.js` — s26 — the colour owl of beat F (and the cream/grey owl it becomes behind the lens shard), drawn in code.

### `prev-builds-s26-fix1-prev/` — an earlier build of the shot that a later pass replaced (kept for reference), 13 files
s26 beat D (112.72–113.88): the ring of shards round the colour window, measured on the source at 112.72 (coordinates only): cells between the shard outlines (outline pr…

- `s26/ringD.js` — s26 beat D (112.72–113.88): the ring of shards round the colour window, measured on the source at 112.72 (coordinates only): cells between the shard outlines (outline pr…
- `s26/rig.js` — s26 — the owl in flight, as a posable rig drawn in code (B&W "ink" style for the blast, colour style for the finished page).
- `s26/owlColour.js` — s26 — the colour owl of beat F (and the cream/grey owl it becomes behind the lens shard), drawn in code.
- `s26.js` — s26 (110.52–117.52) — the shattered page blows out into colour and the finished colour site is revealed.

### `prev-builds-s26-fix2-prev/` — an earlier build of the shot that a later pass replaced (kept for reference), 5 files
s26 beat C: the shard field rebuilt as straight-edged shards, in field coordinates (= the 112.00 frame).

- `fieldC2.js` — s26 beat C: the shard field rebuilt as straight-edged shards, in field coordinates (= the 112.00 frame).
- `s26.js` — s26 (110.52–117.52) — the shattered page blows out into colour and the finished colour site is revealed.
- `owlColour.js` — s26 — the colour owl of beat F (and the cream/grey owl it becomes behind the lens shard), drawn in code.
- `owlCD.js` — s26 beats C and D (111.64–113.88): the white owl in flight, drawn with the shared B&W owl kit (src/lib/owlInk.js: the same soft white plumage, layered wing feathers with…

### `prev-builds-s26c-prev/` — an earlier build of the shot that a later pass replaced (kept for reference), 4 files
s26 — the owl in flight, as a posable rig drawn in code (B&W "ink" style for the blast, colour style for the finished page).

- `s26/rig.js` — s26 — the owl in flight, as a posable rig drawn in code (B&W "ink" style for the blast, colour style for the finished page).
- `s26/ringD.js` — s26 beat D (112.72–113.88): the ring of shards round the colour window, measured on the source at 112.72 (coordinates only): cells between the shard outlines (outline pr…
- `s26.js` — s26 (110.52–117.52) — the shattered page blows out into colour and the finished colour site is revealed.

### `snapshots-end-s26-fix1-tools/` — tools, 25 files
ztrace.py MODE OUT.json F0 F1 [K] [params-json]: per-frame zone traces with a shared palette (measurement -> vectors) MODE cd: the white owl's generous zone (C/D); f: th…

**Produced runtime data:** `src/shots/s26/codec.js`, `src/shots/s26/scissorsTrace.js`

- `ztrace.py` — ztrace.py MODE OUT.json F0 F1 [K] [params-json]: per-frame zone traces with a shared palette (measurement -> vectors) MODE cd: the white owl's generous zone (C/D); f: th…
- `codec.py` — compact polygon codec (matches src/shots/s27/codec.js): an int list [x0,y0,x1,y1,...] -> a string of delta-coded, zigzag, 5-bit varint chunks (chars 63..126), as in the …
- `export_js.py` — export_js.py IN.json OUT.js NAME "comment": write a traced-frames data module (strings via codec.deep)
- `vtrace.py` — vtrace.py — vector trace of a source frame region (measurement -> vector data only).

### `snapshots-end-s26-fix2-tools/` — tools, 21 files
fitlut.py: tone-curve fit for s26's traced colours (measurement only).

- `fitlut.py` — fitlut.py: tone-curve fit for s26's traced colours (measurement only).
- `ztrace2.py` — ztrace2.py OUT.json F0 F1 'zone-json' 'params-json' [K]: per-frame colour-owl traces (round 2 zone, shared palette)
- `tone.py` — tone.py DIR PREFIX [F0-F1] [--box x0 y0 x1 y1]: tone comparison render vs source on sigma-4 blurred frames (per-channel medians, mean L*, mean chroma), per beat
- `mkvar.py` — mkvar.py TAG [--owlF data.json] [--owlCD data.json] [--sub 'old=>new' ...]: a scratch copy of src/shots/s26.js (absolute imports) with some data modules swapped for test…

### `snapshots-end-s26-fix3-tools/` — tools, 18 files
pagetrace.py OUT.js [params-json]: end fix round 3 — trace the settled colour page as the source shows it (the clean page: end-s26-fix1-meas/cleanpage.png, the median of…

- `pagetrace.py` — pagetrace.py OUT.js [params-json]: end fix round 3 — trace the settled colour page as the source shows it (the clean page: end-s26-fix1-meas/cleanpage.png, the median of…
- `ptrace.py` — ptrace.py OUT.json F0 F1 [params-json]: end fix round 3 — re-trace the colour owl (s26 beat F) on a 2x-upsampled crop (measurement -> vectors only; nothing here is loade…
- `atrace.py` — atrace.py OUT.js [params-json]: end fix round 3 — re-trace beat A's standing owl (the box round it in the A key end-s26-fix1-meas/akey/kA.png, the pre-grade median of th…
- `mkvar.py` — mkvar.py TAG [name=/abs/path.js ...]: a scratch copy of src/shots/s26.js for the harness (absolute imports), with the named s26/ data modules swapped for variants (e.g.

### `snapshots-end-s26-rev1-final/` — the shot build after a pass (+ the scripts used in it), 4 files
s26 (110.52–117.52) — the shattered page blows out into colour and the finished colour site is revealed.

- `tools/s26alt.js` — s26 (110.52–117.52) — the shattered page blows out into colour and the finished colour site is revealed.
- `tools/comp.mjs` — end-s26-rev1 (review scratch): load the FULL composition (index.html) headless without a server (request interception) and time window.__film.renderAt(t) per frame; save…
- `tools/score.py`
- `tools/motion.py`

### `snapshots-end-s26-rev2-tools/` — tools, 8 files
s26 (110.52–117.52) — the shattered page blows out into colour and the finished colour site is revealed.

- `s26_edgeF.js` — s26 (110.52–117.52) — the shattered page blows out into colour and the finished colour site is revealed.
- `s26_noA.js` — s26 (110.52–117.52) — the shattered page blows out into colour and the finished colour site is revealed.
- `s26_cur.js` — s26 (110.52–117.52) — the shattered page blows out into colour and the finished colour site is revealed.
- `harness.html` — s26 scratch harness (not part of the film): renders only s26 through the film's grade, frame-exact.

### `snapshots-s26-fix1-meas/` — measurement / study, 1 file
s26 beats C and D (111.64–113.88): the white owl in flight, drawn with the shared B&W owl kit (src/lib/owlInk.js: the same soft white plumage, layered wing feathers with…

- `c/owlCD.prev.js` — s26 beats C and D (111.64–113.88): the white owl in flight, drawn with the shared B&W owl kit (src/lib/owlInk.js: the same soft white plumage, layered wing feathers with…

### `snapshots-s26-fix1-tools/` — tools, 18 files
cdfit.json -> src/shots/s26/owlCDfit.js, with a 3-tap temporal smoothing of every parameter inside each beat

**Writes into:** `src/shots/s26/cracksA2.js`, `src/shots/s26/fieldC2.js`, `src/shots/s26/owlCDfit.js`, `src/shots/s26/ringD2.js`

- `writeCD.py` — cdfit.json -> src/shots/s26/owlCDfit.js, with a 3-tap temporal smoothing of every parameter inside each beat
- `crackwrite.py` — Filter the connected crack polylines (drop short isolated pieces = page hatching the 90 s page did not mask) and write src/shots/s26/cracksA2.js.
- `writefield.py` — write src/shots/s26/fieldC2.js from field2.json + streaks.json (fieldnet.py)
- `writering.py` — write src/shots/s26/ringD2.js from ring2.json (ringnet.py)

### `snapshots-s26-fix2-tools/` — tools, 19 files
s26 fix #2, beat C: re-pick the content of the lower-half field shards (field coords = the 112.00 frame): * shards showing headline letters or the nav labels (a piece of…

**Writes into:** `src/shots/s26/fieldC2.js`, `src/shots/s26/ringClear.js`

- `fieldfix.py` — s26 fix #2, beat C: re-pick the content of the lower-half field shards (field coords = the 112.00 frame): * shards showing headline letters or the nav labels (a piece of…
- `writeclear.py` — write src/shots/s26/ringClear.js from s26-fix2-meas/ringfit.json (ringfit.py)
- `fitBody.mjs` — s26 fix #2: fit the C/D owl's body egg per source frame to the source owl silhouette (half-res masks snapshots/s26b-meas/fit/m/F.bin), with the head placed from the trac…
- `ringfit.py` — s26 fix #2, beat D: per ring shard, the source frame from which it no longer covers the arriving colour page (clear glass or flown off): the switch frame Fc minimising s…

### `snapshots-s26c-tools/` — tools, 27 files
Beat F (2853-2937): temporally cleaned head / body poses and the face features in head units, written to src/shots/s26/featF.js.

**Writes into:** `src/shots/s26/featF.js`

- `smoothF.py` — Beat F (2853-2937): temporally cleaned head / body poses and the face features in head units, written to src/shots/s26/featF.js.
- `fitF.mjs` — Per-frame refit of the colour owl's body, skull size and feet against the source owl masks (beat F), eyes pinned.
- `slabfit.py` — keep components touching the lower-left..right path of the slab (exclude the owl region in 2841-2843 / 2854+)
- `silCD.mjs` — IoU of the painter silhouette in C/D for a range of skull scales rk (scratch)

### `scratch-build/` — loose scripts from an agent scratchpad, 12 files

- `mockrig.mjs`
- `cowl.py`
- `owlmask.py`
- `wowlC.py`

### `scratch-ending/` — loose scripts from an agent scratchpad, 3 files
crop.py DIR TIME x0 y0 x1 y1 out.jpg [width] -> render crop above/left of reference crop

- `metrics.py` — third splits
- `crop.py` — crop.py DIR TIME x0 y0 x1 y1 out.jpg [width] -> render crop above/left of reference crop
- `hpairs.py` — harness frames rF.png -> add sF.png (source frame by index) + pairF.jpg + metrics
