# s02 hand-drawn rebuild (this pass)

`src/shots/s02.js` re-exports `shot` from `hand/shot.js`. Nothing in `src/shots/s02/*.js` outside `hand/` is loaded by
s02 any more. Those files are the previous pass's traced data. `s02/room.js` is still imported by `s04/world02.js`, so
they were left in place.

## Modules

| file | what |
|---|---|
| `shot.js` | Timing, camera and layer compositing. Holds the measured tables: eye scan, sweat slide, room gain, colour tint, owl softness. |
| `designer.js` | The designer, drawn with pen strokes, hatching and filled shapes. Control points were read off 2–4x grid crops of the stare and look averages. It builds three static layers: stare, look, and the pans' softer look. |
| `hairsil.js` | Outer silhouettes of his dark hair masses. **Measured**: thresholded outlines of the stare average, simplified to 2.5 px (`trace/hairsil.py`). The partings and flyaways on top are drawn. |
| `room.js` | The room, scratched white into black: wood grain, dot mesh, cables, boards, book spines, carton faces. Stare-view layout, pan world and carton stack were each read off grid crops (and a study mosaic of the pan frames for the world between). |
| `scratch.js`, `pen.js` | Stroke primitives: ribbons, field hatching, comb hatching, wood grain, dot mesh. |
| `owl.js` | The owl from the B&W kit (`src/lib/owlInk.js`): `perch` on the cartons, `flyFront` in flight. Wing tips are set per frame. |
| `owltrack.js` | Per-frame tracks: the owl's root, scale and bank; the wing tips measured on the source silhouette; per-frame tip lift fitted by silhouette IoU. |
| `tracks.js` | The camera (per-frame translation) and per-layer motion blur (smear, sigma), measured in the previous pass and re-checked in this one. |
| `tone.js`, `tonedata.js` | Value-study correction. Round Gaussians `[x, y, sigma, a]`, fitted offline (`trace/tone_fit.py`), are turned into a gain on the layer's own blurred value and baked once into each static layer. |

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
