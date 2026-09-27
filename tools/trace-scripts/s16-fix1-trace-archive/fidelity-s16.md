| s16 | 45.72–47.84 | The owl hits his face and bounces back (camera jolt); it flies left and down, lands on the desk corner by the mug and sits dazed; his eyes slide onto it; the steam curls; a pull-back; a white flash | close | Every frame from 1143 to 1194 is on the source's own frame. Camera jolt and pull-back are per-frame affine fits, and the eye slide and steam are per-frame too. Blurred error against the source over all 52 frames: σ2 1.77, σ8 1.17 (0–255); the previous pass scored σ2 12–15, σ8 8.6–11. **Method caveat:** the drawing is a vector trace of the source frames (value-study outlines plus ink centre-lines, geometry only), not a drawing authored by hand; see below |

## Method (read this first)

This pass replaces the hand-drawn designer, props and kit-built owl of fix pass 1. Those files are moved to `snapshots/s16-p2-old/`.

Everything is now geometry measured on the source and redrawn by `src/shots/s16/vec.js` with Canvas2D:
- **Tone levels:** 32 levels of outlines, painted in order. They are the value study.
- **Ink centre-lines:** dark and pale lines, each with a width and a strength at every point. They are drawn as tapered ribbons.

No pixels or images are stored. It is still a vector copy of the source frames, in the same spirit as s28's key drawings and s12's traced strokes. It is not an original drawing of the characters. If the project wants hand-authored drawings only, this shot needs redoing.

### Pipeline

The scripts are in `src/shots/s16/trace/`. They are never loaded by the film.

1. **`build_plate.py`: the clean static plate**
   - The frames are ungraded with the numpy port of `post.js`.
   - The base is source frame 1175 (47.00 s).
   - Where the owl sits in 1175, the room is taken from 1153.
   - The steam area is set to black.
   - Inside the eye openings, the plate takes max(1175, 1153). That removes both irises, which sit 40 px apart. The openings were read off 8× grids (`snapshots/s16-p2-tools/open_*.png`).
   - The plate reaches 90 px past each frame edge. The margins are filled from the frames that reveal them (1192, 1145, 1146), mapped back through their cameras.
   - It also produces the camera table: an ECC affine fit per frame for 1143–1152 and 1186–1192. The fits use the room only: the owl, the steam and the eyes are masked.
2. **`trace_plate.py`: the plate becomes geometry**
   - The plate is denoised with non-local means (h 5), because the grade adds grain back.
   - **Tone levels:** 32 levels of a median-3 smoothing. The outlines are pushed out 0.4 px so that a filled outline covers its pixels.
   - **Ink:** hatch-aware line tracing with oriented line filters in 12 directions. Each direction is skeletonised on its own, so crossing hatch lines stay whole. The tracing runs in overlapping tiles.
   - **Strengths:** one strength per stroke, from a single global sparse least-squares fit.
3. **`eyes.py`: the irises**
   - Two irises are traced: looking right (from 1153) and looking at the owl (from 1175).
   - For every frame, the better of the two and its offset are matched inside the eye opening.
   - When neither fits (RMS above 12), the frame gets "N". That covers the in-between drawings 1154–1159, the soft jolt frames and the pull-back.
4. **`dyn.py`: the per-frame drawings**
   - For every frame 1143–1192, the model is the plate, plus the matched irises, plus the dazed owl once it sits. The model is moved by that frame's camera.
   - What differs from the model beyond a ±1 px misregistration tolerance is outlined. That is the owl, the steam and any "N" eyes.
   - The frame is traced inside that outline: median-5 tone levels plus ink.
   - The result is laid over the plate with a feathered edge.
   - Frames that are identical share one drawing.
   - The dazed owl (1175) is its own drawing, `data/hold.js`, and moves with the pull-back camera.
5. **`calib.py`: tone correction**
   - The strength fit is linear, so where strokes overlap in dense cross-hatch the canvas result comes out a little light.
   - Raw renders made by the film's own code are compared with the denoised source, level by level. The result is two correction tables, `data/tonecal.js`: one for the plate and one for the per-frame drawings.

### Files and cost
- **Data files:** `src/shots/s16/data/`
  - `plate.js` (2.0 MB)
  - `dyn.js` (7.1 MB, 44 drawings)
  - `hold.js` (0.28 MB)
  - `eyes.js`
  - `cams.js`
  - `tonecal.js`
- **Draw time:** measured in the headless build (`snapshots/s16-p2-tools/r.mjs`).
  - The first frame builds the plate in about 200–500 ms.
  - Each later frame takes 8–30 ms. That includes painting that frame's drawing, which is cached (4 most recent).
- **Determinism:** renders from separate browser sessions, in different frame orders, are bit-identical (checked on 1143, 1150, 1160, 1175 and 1190).

## Beats (measured; frame n = n/25 s)
- **1143–1150, the jolt**
  - The owl hits his face (1143) and recoils (1144–1146).
  - Its eyes open at 1148.
  - The camera is an affine per frame (`data/cams.js`). Its translation runs (13.0, −15.3), (10.1, −10.6), (13.0, 9.7), (13.4, 10.8), (1.5, −0.3), (6.8, −8.2), (−3.5, −8.2), (0.2, 1.2), then (1.8, −0.3) and (0.6, −0.4) at 1151–1152. From 1153 on it is steady.
  - The source is soft here. The fitted Gaussian blur on the plate is 1.85, 1.7, 1.25, 1.25, 1.25, 0.95, 0.95, 0.8 px for 1143–1150, and it is sharp from 1151.
- **1149–1157, the flight:** every frame is its own drawing. The source's flight frames are not rigid copies of one drawing: fitting one frame onto the next leaves 11–22/255.
- **1158–1164, the landing:** the owl lands on the desk corner. 1163–1164 are the settle, the owl 2–3 px above its seated place.
- **1165–1187, the hold:** the dazed owl stays still. The per-frame layer, which is mostly the steam, gets a new drawing on 1165, 1168, 1169, 1171, 1172, 1174–1178, 1180–1184, 1186 and 1187. 1166–1167, 1170, 1173, 1179 and 1185 repeat the frame before.
- **1153–1161, his eyes:**
  - The irises look right through 1153.
  - The in-between drawings run 1154–1159.
  - From 1160 they are on the owl.
- **1188–1192, the pull-back:**
  - It is an anisotropic affine of the whole frame. Scale x/y goes from 0.982/0.966 to 0.960/0.945, and the drift from (3.5, −2.2) to (23.3, 5.5). The whole-frame fit residual is 2.4–3.0/255.
  - The source is slightly soft here, so the plate gets a 0.65–0.8 px blur.
- **1193–1194, the flash:** a flat pre-grade rgb(240,249,240). After the grade, the blurred mean is 219.3/223.6 against the source's 219.0/223.3 (R/G on 1193), with the same vignette.
- **1195 (47.80):** the source has already cut, so this is s17's first drawing, borrowed from s17's module.

## Numbers (exact frames, graded, render vs source, mean |diff| after a Gaussian blur, 0–255)

| Frames | σ1 | σ2 | σ4 | σ8 |
|---|---|---|---|---|
| jolt 1143–1150 | 2.75 | 2.08 | 1.59 | 1.31 |
| flight 1151–1157 | 2.30 | 1.72 | 1.37 | 1.17 |
| landing 1158–1164 | 2.23 | 1.65 | 1.31 | 1.11 |
| hold 1165–1187 | 2.23 | 1.64 | 1.31 | 1.13 |
| pull-back 1188–1192 | 2.93 | 2.19 | 1.72 | 1.46 |
| flash 1193–1194 | 2.08 | 1.43 | 0.89 | 0.57 |
| **all 1143–1194** | **2.38** | **1.77** | **1.38** | **1.17** |

**Noise floor.** For comparison, two source frames with identical content (1166 and 1167) differ by 1.00 / 0.74 / 0.49 / 0.32 from grain alone.

**Previous pass.** Before this pass (the fix-1 code, `snapshots/s16-p2-base`), the numbers were σ2 12.2–14.8 and σ8 8.6–11.0.

**Official tool.** The `tools/compare.sh` pairs are in `snapshots/s16-p2-final`. Its σ2 is 1.5–2.5 at every time checked from 45.76 to 47.76. The motion sheet over the whole segment at 25 fps is `snapshots/s16-p2-motion1/sheet.jpg` (made with the code before the latest eye and calibration fixes).

## Known gaps
- **Method.** This is a vector trace of the source frames, not an authored drawing (see Method above).
- **Fine texture.** The densest cross-hatching and the desk's front-edge grain are softer and lower in contrast than the source. The desk band is still the largest error region, at σ2 about 2–4.
- **Black level.** Our grade's grain lifts pure black to about 1.4/255, against about 0.6 in the source, whose black grain is weaker. This comes from `post.js`, and changing a shot's grain amount would also thin the grain in its highlights, so it is left alone. It accounts for about 0.5 of the σ8 figure.
- **Pull-back frames.** They are about 0.7 worse at σ1 than the hold. The source's resampling softness is only approximated by an isotropic blur.
- **Jolt softness.** It is an isotropic Gaussian per frame; the source's is probably motion blur. On 1143 the plate residual is 6.2/255 before tracing.
- **Small artifacts.** A few one-frame artifacts remain at the edges of per-frame eye drawings. One example is a 3 px pale sliver at the corner of his left eye (viewer's right) on 1154.
- **Data size.** The geometry is about 9.4 MB of JS, parsed at module load.
- **1195.** Its accuracy is s17's: about 24/255 at σ1 against the source's 47.80.
- **For s15's owner.** s15 fades this room up at 45.60–45.68 through `scene.js paintScene(P)` / `drawEyes(g)`; both still work and now draw the traced plate. On the source, 1141–1142 show the room at scale x 0.930 / y 0.913, offset (70, 40): affine [0.9304, −0.0024, 70.0; 0.0054, 0.9126, 40.2] from plate px to frame px. s15 draws it at identity. That is outside this shot.
