# s02 hand-drawn rebuild (this pass)

`src/shots/s02.js` re-exports `shot` from `hand/shot.js`. Only `hand/` is loaded. Fix pass 2 moved the earlier passes'
unused modules (traced source data: `roomInk.js`, `panInk.js`, `faceInk.js`, `retInk.js`, `owlInk.js`, `wings.js`, and the
old `designer*.js`, `room.js`, `owl.js`, `cam.js`, `track.js`, `wingDraw.js`, `hairShapes.js`) out of `src/` to
`snapshots/s02-legacy-traced/`. No other shot imports them (checked by grep; the earlier note that `s04/world02.js`
imported `s02/room.js` was no longer true).

## Modules

| file | what |
|---|---|
| `shot.js` | Timing, camera and layer compositing. Holds the measured tables: eye scan, sweat slide, room gain, colour tint, owl softness. |
| `designer.js` | The designer, drawn with pen strokes, hatching and filled shapes. Control points were read off 2–4x grid crops of the stare and look averages. It builds three static layers: stare, look, and the pans' softer look. |
| `hairsil.js` | Outer silhouettes of his dark hair masses as **sparse control points** (53 + 80, one every ~20-40 px where the outline turns), drawn as smooth closed curves. Fix pass 1 replaced the dense thresholded trace of the first pass with these points (read off that measured outline at 7 px tolerance). The partings and flyaways on top are drawn. |
| `room.js` | The room, scratched white into black: wood grain, woven panels, ribbed cables, boards, book spines. Stare-view layout and pan world were read off grid crops (and a study mosaic of the pan frames for the world between). |
| `cartons.js` | The carton stack the pan stops on and the room behind it (fix pass 1), in hold-frame px: ~40 face polygons read off 2-2.4x grid crops of the hold average and a mosaic of the flight frames in hold coords. Lit faces are flat with fine dark streaks, ink edges and a light rim; faces turned away are near black with pale grain and light edge lines. Each face's value is calibrated against the hold average (`FACE_K`), so there is no airbrushed tone on the stack. |
| `scratch.js`, `pen.js` | Stroke primitives: ribbons, field hatching, comb hatching, wood grain, the woven line grid (`mesh`, fix pass 1; it was a dot halftone), ribbed cables. |
| `owl.js` | The owl from the B&W kit (`src/lib/owlInk.js`): `perch` on the cartons, `flyFront` in flight. Wing tips are set per frame. |
| `owltrack.js` | Per-frame tracks: the owl's root, scale and bank; the wing tips measured on the source silhouette; per-frame tip lift fitted by silhouette IoU. |
| `tracks.js` | The camera (per-frame translation) and per-layer motion blur (smear, sigma), measured in the previous pass and re-checked in this one. |
| `tone.js`, `tonedata.js` | Value-study correction. Round Gaussians `[x, y, sigma, a]`, fitted offline (`trace/tone_fit.py`), are turned into a gain on the layer's own blurred value and baked once into each static layer. Fix pass 1 refitted them after the redraws: `DES_TONE` 360, `CROWN_TONE` 50, `SOFT_TONE` 160, `ROOM_TONE` 80 (now windowed to the stare frame + 60 px so it cannot spill onto the pan world), `OWL_TONE` 25. `HOLD_TONE` is empty (the cartons are calibrated per face). |

## Fix pass 2 changes

- `wing2.js` (new): the flying owl's spread wing, drawn by this shot. A smooth leading-edge band, two rows of rounded
  coverts, and long flight feathers (6 secondaries, 6 primaries), each a soft white blade separated by a grey shade.
  `owl.js` builds it per frame and scales its span onto the measured tip (`wing2At`). The chord and primary length per
  wing come from the `CHORD` table, fitted by silhouette IoU (`trace/fix2/fitchord.py`). The kit's own wings are no
  longer drawn.
- `owl.js`: flight body x1.12 wider with the belly ~20 units lower; the head moved −20 px at f432–440; the left foot
  moved in 50 px from f436. The tuft is one curved plume (`plume`) for both poses. Sitting: cups r 58 → 47, eyes lower,
  faint V chest marks, and open eyes with a ~20 % lid at f392.
- `designer.js`:
  - The beanie is redrawn. The cuff is a curvilinear rib-knit grid with ~18 px ribs, course hatches, and side
    cross-hatch. The crown has soft ribs and a scribbled top rim. The value falls off to the sides, per layer.
  - The rim sliver is gone. `CROWN_TONE` is no longer applied.
  - The eye rings are finer and lighter, with one lower-lid line. There is socket, inner-corner and outer-corner
    hatching.
  - The forelock is rebuilt on the source's dark-run structure. There are more strand gaps in the lower side hair.
  - The hoodie strokes are shorter, with a cross-hatch band under the shoulder outline.
  - f219 has a new iris. The look irises have catchlights.
- `tone.js` `exclude`: the fitted blobs are dropped over the beanie and inside `FACE_OVAL`. `DES_TONE` and `SOFT_TONE`
  were refitted with both areas masked out (`trace/fix2/refit.py`).
- `scratch.js` `mesh`: grey, wider lines (a dense grid round dark cells). Column-brightness runs are capped at 1.15x.
  An option turns off the tall dark strips. The stare's lower-right panel was rebuilt on the source's row profile.
- `cartons.js`:
  - Hold: the back-room panels are dimmed ~50 %, and the board and top board fade out.
  - Lit-face streaks have half the density and contrast.
  - The box under the owl gets a soft lift, and the left step is brighter.
  - The chair is raised 30 px.
  - The row tops at hold y 1250 are darker.
  - `FB_FACES` / `paintFlightBack`: dim boxes behind the flight on their own layer, drawn only at f405–452.
- `room.js`: book spines with lit edges and label bands.
- `shot.js`: `BOOK_GAIN` is a regional gain on the bookshelf, fitted per frame; it only helps at 336–349. `TINT` was
  retuned.

## Fix pass 2 scripts (`trace/fix2/`, not loaded by the film)

They run from a lab folder under `snapshots/` with `src` and `assets` symlinks, next to `snapshots/s02-fix1h-src/`.
- `run.py` renders exact frames and supports `PRE` (JS to run before the first frame).
- Region metrics: `reg.py`, `box.py`, `errmap.py`, `dmap.py`, `cr.py`.
- Tone refit with the face and beanie masked out: `refit.py` (uses `entry_des2.js`).
- Wing chord / primary fit: `fitchord.py`. Silhouettes: `owlsil.py`.
- Pan world against the source mosaic: `worldcmp.py` (`entry_world.js`).
- Room gain: `gainfit.py`. Bookshelf gain: `bookfit.py`. Section means: `sections.py`.

## Fix pass 1 scripts (`trace/fix1/`, not loaded by the film)

They run from a lab folder under `snapshots/` holding `src` and `assets` symlinks, with the source frames extracted to
`snapshots/s02-fix1h-src/NNNN.png` (`run.py` builds `entry.js` with esbuild and renders exact frames through `post.js`).

- `carton_cal.py`, `carton_cal2.py`: per-face calibration of the carton stack (hold f370; the row under it on flight
  frames 424/428).
- `refit_des.py`, `softonly.py`, `refit_room.py`, `refit_owl.py`: refits of `DES_TONE` + `CROWN_TONE` + `SOFT_TONE`,
  `ROOM_TONE` and `OWL_TONE` after a redraw (each fit runs on the layer drawn without its own list).
- `desb.py`: designer Sobel edge energy vs the source in the pans (the `DESB` 0.6 scale). `desmean.py`, `split.py`,
  `desshift.py`: designer brightness, error split (designer / owl / room), designer offset.
- `owlsil.py`, `wingsweep.py`, `flyv.py`, `lift.py`, `gaink.py`: flying-owl silhouette and pose checks, face-lift and room
  gain sweeps.
- `mosaic_hold.py`, `holdcrop.py`, `cmpz.py`, `crop.py`, `zc.py`, `sheet.py`: study crops and mosaics.

## Trace and lab scripts (`trace/`, not loaded by the film)

- **Lab driver: `run.py` + `entry*.js` + `h.html`.** Bundles an entry with esbuild and renders exact frames in headless Chromium through the film's own `post.js`. Prints the σ8 blurred MAE against the extracted source frames.
  - The scripts are run from `snapshots/s02-r3-lab/`.
  - `src` and `assets` there are symlinks.
  - Source frames go to `snapshots/s02-r3-src/NNNN.png` (see `common.py`, or extract them with ffmpeg / cv2).
- **`tone_fit.py`.** Greedy matching pursuit of round Gaussians (σ 28/48/80, |a| ≤ 60). It compares the blurred pre-grade render with the blurred, grade-inverted source average inside a mask. It writes control points only.
  - `tone_round.py`: designer, stare room, carton stack and sitting owl.
  - `crown_fit.py`: the beanie crown, against the pan study mosaic.
  - `soft_fit.py`: the pans' soft face.
- **`gainfit.py`.** Per-frame room exposure: the gain on the room layer that minimises the whole frame's blurred error.
- **`liftfit.py`, `wingfit.py`, `flyfit.py`.** Flying-owl wing lift and parameters, fitted by silhouette IoU.
- **`owlfit.py`, `owlfit2.py`.** Sitting-owl placement and proportions, fitted by silhouette IoU.
- **`wingtips.py`.** Wing-tip extremes per frame, in kit units.
- **`hairsil.py`.** The hair silhouettes.
- **`track.py`, `track_ret.py`, `reg.py`.** Camera checks: chained phase correlation, and ORB registration against the stare frame.
- **`roomgain.py`.** Room mean ratio, used for a first gain table before `gainfit.py` replaced it.
- **`mosaic2.py`.** A study mosaic of the pan frames on the measured camera. It was used for reading the room layout by eye and as the target for `crown_fit.py`.
