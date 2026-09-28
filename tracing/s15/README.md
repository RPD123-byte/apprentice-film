# s15 — 40.72–45.72 s: Corridor run through boxes and gear

Status **approx**, method **mixed** (see `docs/FIDELITY.md` and `docs/fidelity/s15.md`). The render code is `src/shots/s15.js` and `src/shots/s15/`.

## How the data in `src/shots/s15/` was made

The data files the render loads name the script that generated them in their header comment. Those scripts, at their new paths:

| producer script (in `tracing/`) | runtime files it produced |
|---|---|
| [`s15/trace-scripts-s15-ov/facelight2.py`](trace-scripts-s15-ov/facelight2.py) | `src/shots/s15/` (9 files: lightsB.js, lightsB2.js, lightsC.js, …) |
| [`s15/trace-scripts-s15-ov/corners.py`](trace-scripts-s15-ov/corners.py) | `src/shots/s15/defsB.js`, `src/shots/s15/defsD.js`, `src/shots/s15/defsH.js` |
| [`s15/trace-scripts-s15-sfm/seed.py`](trace-scripts-s15-sfm/seed.py) | `src/shots/s15/keyed.js` |
| [`s15/trace-scripts-s15-study/meas/owltrack.py`](trace-scripts-s15-study/meas/owltrack.py) | `src/shots/s15/track.js` |

Scripts whose code writes into `src/shots/s15/` (found from the output paths in their source; `{…}` = a name filled in at run time):

| script (in `tracing/`) | writes |
|---|---|
| [`s15/snapshots-s15-fix1/mkdecals.py`](snapshots-s15-fix1/mkdecals.py) | `src/shots/s15/decals.js` |
| [`s15/snapshots-s15-fix1/mkdecals2.py`](snapshots-s15-fix1/mkdecals2.py) | `src/shots/s15/decals.js` |
| [`s15/snapshots-s15-p4/tools/build.py`](snapshots-s15-p4/tools/build.py) | `src/shots/s15/roto`, `src/shots/s15/roto{NAME}.js` |
| [`s15/trace-scripts-s15-sfm/export_tracks.py`](trace-scripts-s15-sfm/export_tracks.py) | `src/shots/s15/tracks`, `src/shots/s15/tracks{pfx}.js` |

## Index of folders (15)

Each folder keeps the relative layout it had where it was found, so scripts that import each other still sit side by side. Folder names say where the files came from: `src-*` = the shot’s own trace folder in `src/`, `trace-scripts-*` = `tools/trace-scripts/`, `prev-builds-*` = `archive/prev-builds/`, `snapshots-*` = the per-pass scratch folder of that name, `scratch-build*` / `scratch-ending*` = the agents’ temporary scratchpads (see `../README.md`).

### `src-s15/` — trace / measurement scripts that lived next to the shot data in src/ (not loaded by the render), 1 file
s15 take A (40.72–40.88): the source is one continuous push from s14 into the same corridor (40.64/40.68 held, then 40.72, 40.76 ...

- `takeA.js` — s15 take A (40.72–40.88): the source is one continuous push from s14 into the same corridor (40.64/40.68 held, then 40.72, 40.76 ...

### `trace-scripts-s15-fix1-proj/` — tracing / fitting, 4 files
snap.sh TIMES outdir (run from the project root)

- `index.html` — s15 scratch
- `snap.sh` — snap.sh TIMES outdir (run from the project root)
- `loopB.sh` — render take frames, calibrate, re-export: loopB.sh TAKE TIMES OUT

### `trace-scripts-s15-ov/` — measurement / study, 12 files
measured face values, bilinear per face: for every visible face of a set, fit corner values (u,v = 00, 10, 11, 01) to the source frame's brightness over the face (owl ma…

**Produced runtime data:** `src/shots/s15/` (12 files: defsB.js, defsD.js, defsH.js, …)

- `facelight2.py` — measured face values, bilinear per face: for every visible face of a set, fit corner values (u,v = 00, 10, 11, 01) to the source frame's brightness over the face (owl ma…
- `corners.py` — numbered corner candidates on a source frame (for picking seeds by number): corners.py T out.jpg [N]
- `facelight.py` — measured face values for keyed boxes: the mean brightness of each visible keyed face in the SOURCE frame (owl masked), taken back through the global grade (vignette, S-c…
- `camfit.py` — per-frame camera nudge: with a set's geometry fixed, find the eye/yaw/pitch/roll that best fits the source edges

### `trace-scripts-s15-sfm/` — measurement / study, 28 files
landmark tracking by chained dense flow from a seed frame (both directions, corner-snapped), with a verification sheet of crops around each tracked point.

**Produced runtime data:** `src/shots/s15/keyed.js`

- `seed.py` — landmark tracking by chained dense flow from a seed frame (both directions, corner-snapped), with a verification sheet of crops around each tracked point.
- `export_tracks.py` — export tracked corner files tr<PFX>*.json -> src/shots/s15/tracks<PFX>.js (measured positions only)
- `fitboxes.py` — fit keyed boxes (world units) to tracked face corners, through the set's camera at each frame.
- `rigfit.py` — joint fit of a take: per-frame camera (x, z, yaw, pitch, roll; eye height fixed 0.33, fov 60) and STATIC boxes (footprint front edge X0,Z0 -> X1,Z1 and height h; stacked…

### `trace-scripts-s15-study/` — measurement / study, 7 files
prefer compact blobs near previous center

**Produced runtime data:** `src/shots/s15/track.js`

- `meas/owltrack.py` — prefer compact blobs near previous center
- `meas/pairflow.py` — pairwise motion between consecutive source frames: similarity fit (s, rot, tx, ty) + fixed point, and median flow per region
- `meas/floorflow.py` — vertical flow of the floor near the bottom of frame, away from the owl -> forward speed estimate
- `meas/wire.mjs` — dump projected face outlines of the s15 set at times t (for a quick wireframe-over-source check)

### `snapshots-s15-fix1/` — work folder, 45 files
the matched centres wander on flat faces: fit a straight drift through the reference position (robust:

**Writes into:** `src/shots/s15/decals.js`

- `mkdecals2.py` — the matched centres wander on flat faces: fit a straight drift through the reference position (robust:
- `mkdecals.py` — fill single-frame holes between kept frames
- `orig/s15/rotoD.js` — s15 roto faces, take D (pass 4): screen quads measured on the source frames (corners: bl, br, tr, tl, frame px) and their brightness (four corner values), numbers only; …
- `orig/s15/rotoB.js` — s15 roto faces, take B (pass 4): screen quads measured on the source frames (corners: bl, br, tr, tl, frame px) and their brightness (four corner values), numbers only; …

### `snapshots-s15-fix1c/` — work folder, 4 files
sil.py F rootx rooty s [renderpng]: owl silhouette rows in owl units (source vs render)

- `m/sil.py` — sil.py F rootx rooty s [renderpng]: owl silhouette rows in owl units (source vs render)
- `m/crops.py`
- `m/pstat.py` — pstat.py dirs... : luma percentiles + high-pass std in given patches, render dirs vs source
- `m/tri.py` — tri.py OUT F x0 y0 x1 y1 [dirs...]: crops of renders (r<F>.png in each dir) + the source, stacked vertically

### `snapshots-s15-fix2/` — work folder, 8 files
owlm.py OUT.jpg F1,F2,... : render only s15's owl (no grade) at those frames; print the render silhouette's extents vs the source's (bright bird connected near the track…

- `h/owlm.py` — owlm.py OUT.jpg F1,F2,... : render only s15's owl (no grade) at those frames; print the render silhouette's extents vs the source's (bright bird connected near the track…
- `h/common.py` — s15 pass-4 measuring helpers (scratch; numbers only ever leave these scripts)
- `t/redit.py` — redit.py: edit rows of a roto*.js file (text-level, keeps everything else as is)
- `t/dpos.py` — dpos.py TAKE rotoX.js frame: screen positions of the take's decals (slot centres) on that frame

### `snapshots-s15-p4/` — work folder, 151 files
build.py NAME F0 F1 : quads roto/<f>.txt (f in F0..F1) -> fitted corner values -> src/shots/s15/roto<NAME>.js Corner values: bilinear least-squares fit (over the face's …

**Writes into:** `src/shots/s15/roto`, `src/shots/s15/roto{NAME}.js`

- `tools/build.py` — build.py NAME F0 F1 : quads roto/<f>.txt (f in F0..F1) -> fitted corner values -> src/shots/s15/roto<NAME>.js Corner values: bilinear least-squares fit (over the face's …
- `orig/s15/rotoB.js` — s15 take B: roto faces measured on the source (roto.js).
- `orig/s15/rotoA.js` — s15 take A: roto faces measured on the source (roto.js).
- `orig/s15/roto.js` — s15 roto faces (fix pass 3).

### `snapshots-s15-rev2-final/` — the shot build after a pass (+ the scripts used in it), 9 files
pick largest comp in central band

- `owl.py` — pick largest comp in central band
- `metrics.py` — best matching frame
- `pair.py` — usage: pair.py compare_dir outdir frame1 frame2 ...
- `blobs.py`

### `scratch-build/` — loose scripts from an agent scratchpad, 6 files
prefer renders whose quantized time is closest to the frame

- `camcmp.py` — owl track
- `collate.py` — prefer renders whose quantized time is closest to the frame
- `chain.py` — chained camera track: frame-to-frame similarity (ORB+RANSAC on CLAHE-enhanced frames), accumulated.
- `g.py` — g.py img out x0 y0 x1 y1 [scale] [step] -- crop an image, upscale, overlay grid labelled in image px

### `scratch-build-fx/` — work folder, 9 files
s15 scene building: boxes, props and floor tiles -> engraved faces for the GL renderer.

- `s15_orig/build.js` — s15 scene building: boxes, props and floor tiles -> engraved faces for the GL renderer.
- `rmeas.py` — rmeas.py TAKE [TAKE...] : roto/TAKE.txt -> roto/TAKE.json (corners + measured values); writes rotoTAKE.js
- `s15_orig/track.js` — s15 measured owl track (source frames): [t, bbox centre x, centre y, w, h] of the white bird (wings included, headphones and feet excluded) — snapshots/s15-study/meas/ow…
- `s15_orig/sets.js` — s15 sets: one corridor layout + camera path per source take (the source joins short takes on held frames).

### `scratch-build-s15/` — scripts, 17 files
synthetic pair fits for the render geometry: visible surface samples (coarse z-buffer, lit range only, owl masked) projected at t and t+dt, similarity fit (robust).

- `expfit.py`
- `syn.mjs` — synthetic pair fits for the render geometry: visible surface samples (coarse z-buffer, lit range only, owl masked) projected at t and t+dt, similarity fit (robust).
- `zr.mjs` — z-buffered flat preview of the s15 set at times t (half res): writes zr_<t>.raw (RGB) + prints JSON meta
- `h/render.mjs` — Headless renders of film frames (no server: requests are answered from disk by interception).

### `scratch-build-s15rev1/` — comparison / review evidence scripts, 2 files

- `pairfit.py`
- `owlpos.py`

### `scratch-ending/` — loose scripts from an agent scratchpad, 4 files
s15 corridor renderer: a small WebGL2 engine that draws the box corridor as engraved 3D geometry.

- `gl.cur.js` — s15 corridor renderer: a small WebGL2 engine that draws the box corridor as engraved 3D geometry.
- `sets.cur.js` — s15 sets: one corridor layout + camera path per source take (the source joins short takes on held frames).
- `owlFront.cur.js` — s15 owl facing the camera (44.44–45.12).
