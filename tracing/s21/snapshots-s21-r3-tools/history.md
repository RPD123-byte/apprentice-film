## Fix pass 1 (after review `snapshots/s21-rev1-n-*`): what changed and how it was measured

Files: `src/shots/s21.js`, `src/shots/s21/owl.js`, `src/shots/s21/poses.js`, `src/shots/s21/scissors.js`. Evidence is in
`snapshots/s21-fix1n-*`:
- `-final` (15 compare.sh pairs, `crop-*.jpg` owl crops) and `-final2` (72.4 / 72.6 / 72.64 / 73.08 after the last wing change).
- `-h`: a single-page render harness (shot + the film's grade, caches warm) that packs crops into mosaics and pairs them with the source frame at `round(t·25)`:
  - `out-full2`: 42 full frames at 0.12 s with `metrics-full2.txt` / `tone-full2.txt`.
  - `metrics-p2full.txt` / `tone-p2full.txt`: the pass-2 code (`p2/`) on the same frames.
  - `out-all/pairs-*.jpg`: every 25 fps frame of the shot (owl crops).
  - `out-r2`, `out-top`, `out-w2`, `out-d5`, `out-bl`, `out-legs`: close-ups.
- `-src`: the source measurements (feet `legs*.jpg`, `stop.jpg`; wing `wz-*.jpg`; face `head-*.jpg`, `beak*.jpg`, `lmk*.jpg`; silhouettes `sil-*.jpg`; scissors `sc-land.jpg`).
- `-tools`: the scripts (harness, `feetblob.py`, `fitbody.py`, `silov.py`, `lmksc.py`, `bladetrack.py`, `wext.mjs`, and the pass-2 tools) and `p2src/` (the pass-2 files).

Same 42 frames, pass 2 → this pass (owl-mask IoU / MAE σ1.5 over the owl, `metrics.py`):

| Phase | IoU | MAE |
|---|---|---|
| Walk-in 69.48–70.80 (12) | 0.78 → 0.79 | 30.1 → 27.7 |
| Stop / look / crouch 70.92–71.88 (9) | 0.78 → 0.77 | 31.3 → 30.8 |
| Flight 72.00–72.96 (9) | 0.74 → 0.73 | 36.6 → 37.0 |
| Landing 73.08 / 73.20 | 0.71 / 0.70 → 0.80 / 0.79 | 36.4 / 38.2 → 29.1 / 31.3 |
| Top edge 73.32–74.40 (10) | 0.81 → 0.79 | 25.6 → 25.4 |

The mask IoU mostly measures the silhouette; the drawing changes below are judged on the zoomed pairs, not by it. The
top edge lost 0.02 because the new fan wing's serrated edge differs from the mask's; 72.60 lost 0.06 in the mask (the
drawing there is unchanged apart from the wing chord; see gaps).

1. **The walk is a measured gait, not a shuffle** (reviewer defect 4).
   - Each foot's plants were read frame by frame from the toes' bright blob on the floor (σ1 grey > 125, y 878–889), and the swings from the lifted foot's blob (y 862–878). `feetblob.py` applies the same measure to the render.
   - The source's gait is hand-timed, not periodic: stances of 0.08–0.2 s, swings of 0.12–0.24 s, one foot in the air nearly always, landing 10–15 px ahead of the head.
   - Plants: near foot at x 5 / 116 / 208 / 283.5 / 354, far foot at −16 / 67 / 150 / 235 / 336 / 368, with their land and lift times, in `PLANTS`. The swing is front-loaded (1 − (1 − u)^2.4) and lifted 9 px with the toes raised.
   - Our planted toes now land within 1–3 px of the source's on every checked frame 69.60–70.88. The mid-swing toes lead or trail by up to ~10 px.
   - The legs are thinner (tarsus 13 units instead of 19), as the source draws them.
2. **Landing 73.00–73.30** (defect 5).
   - Body and tail are carried +70 units (≈ 24 px) right from 73.04 to 73.16, easing out by 73.32. Body x-extent at 73.08 is now 200–291; the review measured the source at 202–298.
   - Only the face turns up to the blades: eye.az −0.4 and el +0.3, beak az +0.4 / el +0.3 / dir −0.5, with the eye squeezed to a slit. The cups and band stay put. Eye (272, 87) and beak tip (293, 101) at 73.08 match the source's (272, 88) and ~(290–292, 97–100).
   - Rings during the swing-down: hole centres were read on 3x crops at 73.00–73.20. Frame-px corrections (`RING_FIX`) put the upper ring at (300, 108) / (301, 107) at 73.08 / 73.12; the source's are (300, 108) / (301, 106). Pass 2 had them 13–17 px low.
3. **Flight wings** (defect 6).
   - `WING_GROW` fades back to 1 by 72.72, and the feathers' chord is ×1.1.
   - Top-margin x-extent is 89–336 at 72.7 (source 96–333) and 87–353 at 72.8 (85–349).
   - The far wing folds to 0.75 over 72.94–73.02, reaching x 343 at 73.00 (source 347).
   - 72.64 is the deep down-stroke (far wing W_DEEP). The tips land at (78, 193) / (322, 226) against the source's (77, 185) / (317, 225). Its mask IoU is 0.61 → 0.64.
4. **Cutting** (defect 7).
   - From 73.26 the far (lower) blade is 0.86 L, opens 0.06 rad less, rides +0.025 rad, and is broad nearly to its tip. 74.20's tracked angle is 0.29.
   - Lower-blade tips: 73.8 (468, 194) vs the source's (470, 192.5); 74.2 (518, 190) vs (521, 189); 74.4 (548, 194) vs (547, 194).
   - The upper blade is at 10.5° / 11.1° at 73.8 / 74.4; the source's is at 10.4° / 11.8°.
5. **The owl redrawn toward the source** (defects 2 and 3). Each part was compared on 6–9x crops of 70.40, 70.80, 71.00, 71.20, 71.92, 72.40, 73.08 and 74.00.
   - **Eye.** The white is outlined and a little smaller, with a small dark iris in its front, sunk in a soft grey socket. Over it sits a scowling brow: it starts low behind the eye, peaks over its back third and falls heavily to the front corner. There is also a wrinkle, a short upright crease and a lower-lid crease. The walking eye is 2–4 px lower (lmk overlays).
     - In flight: a slit under a heavy brow in a dark socket.
     - On the top edge: a round white with a grey iris and a short diagonal brow.
   - **Beak.** A side-on hooked beak with a pale upper mandible, dark hooked tip, gape line and nostril (`paintBeakSide`).
     - Walking and flying it is ~11 × 10 px and drawn behind the scissors, which cross the lower face.
     - On the top edge it is ~10 × 16 px, hooked down onto the upper ring and drawn in front.
   - **Trunk.**
     - The grey keyline is down to alpha 0.22 (was 0.65).
     - There is a 0.72-value shade along the belly and a 0.78 shade on the back.
     - Sparse fine feather strokes follow the body's flow, with a few on the crown.
     - Mottle is 0.13 (0.15 on the top edge).
     - The walking body is re-fitted by silhouette (`fitbody.py`, IoU 0.681 → 0.703 over 69.8–70.8): more upright, reaching lower at the back. The look and crouch bodies were re-fitted too.
   - **Grip wing** (defect 3). It is no longer a glove. It is a serrated leaf (`fanGeom`/`paintFan`) with these parts:
     - a top edge from the shoulder to the hand tip on the rings;
     - a row of pointed tips sagging below the tip line;
     - secondaries pointing down-forward, primaries sweeping up to the hand and separated into long fingers by deep notches;
     - a grey line from each notch back along its feather;
     - no outline where it lies on the chest.
     - Each pose's shoulder, back tip, sag and feather angles were measured on 9x crops (70.40, 71.40, 71.92, 74.00).
     - On the top edge it is the source's row of long feathers pointing 35° down-forward from the chest to the lower ring.
   - The top-edge tail is three narrow spiky feathers. The bandage is hidden on the top edge, where the source doesn't show it.
6. **Scissors hardware** (low). The screw is a small dark oval with a thin highlight. The square flange is now a 2–3 px bump. The gap between the shanks is dark.
7. **Margins and light** (low).
   - Margin lifts: +1.2 top-right, +1 right, +2.5 lower-left (pre-grade), and +6 on the bottom strip.
   - While it walks in, the whole owl feeds an extra glow keyed per frame (`WALK_GLOW`). The lower-left box (x 20–120, y 700–900) was 6–15 levels dark at 69.84–70.44. It is now within ±2 at 69.48–70.68.
   - Post-grade margins now, render/source: top-right 7–8/7, right 11.5–12/11, bottom 5.5/5.8, left 27–31/26–29.
   - The top-edge owl `GAIN` is 1.16 (was 1.07), with a lighter cup shadow when lit. Body patches at 73.4–74.2 are 197–209 against the source's 201–219.
8. **Determinism.** Every canvas the shot reads back or composites is opened with `willReadFrequently` before its first draw: the owl sprite, MOT, NOISE, the glow canvases and LIFT.
   - Two compare.sh runs in different orders are bit-identical at 70.4, 72.6 and 74.0: max 0, 0 px differing (`-det1`, `-det2`).
   - Three harness orders are also bit-identical at 70.4, 72.36, 72.6 and 74.0.
   - Draw time is 46–102 ms per frame (`snapshots/s21-fix1n-perf`, 13 times, machine heavily loaded). All 127 frames of the shot render without errors.

## Known gaps (after fix pass 1)

- **The owl is still simpler than the source's**, though it no longer reads as a clean mascot:
  - The plumage is smoother. Patch std on the top edge is ~4–6 against 8–11. The source's feather texture is painterly and its edges are softer.
  - In the flight 72.1–72.5 the source's head reads darker at the back (cup, band and nape in shadow). Ours is white with a mid-grey cup.
  - The source's tail in the walk and hold is a longer wedge.
  - The source's grip-wing fingers reach further into the ring holes.
- **Silhouette.**
  - Weakest mask frames are the climb 72.24–72.36 (0.65–0.67; the source is smeared) and 72.60 (0.69). At 72.60 the mask differs mostly by a thin streak along the top margin, not by the drawing, which matches pass 2 there.
  - The stop at 70.92 is 0.73, and the walk at 70.20 is 0.72 (the far foot lifting).
- **Blades.**
  - At 74.20 our upper blade sits ~1–2° low and the 16th dash still shows beside the lower blade; the source hides it.
  - Mid-swing toes lead or trail the source's by up to ~10 px.
- **Not ours.**
  - **The page (F1, `sites.js`/`sokoIll.js`).** Behind the take-off and climb it has a keyboard and knob module where the source has boxes and a book. Its box stripes are uniform, the designer's trousers and face flatter, the floor planks too bright, and the right side sparser.
  - **The screen glow (F1).** Just inside the screen's left edge it is ~4 levels too bright (the margin x 125–140 reads 29–32 against 26–28).
  - **The grade's vignette** caps the whites in the top-left corner.
- **Continuity with s22 (74.52).** s22 forked `s21/owl.js`, `poses.js` and `scissors.js` at 2026-09-25T15:26Z, before most of this pass. After it re-forks, s22 will draw the pass-2 bird unless it picks up:
  - the scissors: far blade 0.86 L and broad, the SNIP − 0.06, the angle +0.025, 74.20 at 0.29, the screw oval;
  - the fan grip wing;
  - the side beak and the scowl eye;
  - `TOP` changes: beak, eye, tail, mottle, `bandage: null`;
  - `GAIN` 1.16.
  The re-fork is the s22 owner's call.
- **Boundary frames in compare.sh.** `tools/compare.sh` renders on a 30 fps grid, so 69.44 itself renders as s20. Review the boundaries at 69.47 and 74.48, as the reviewer did.

## Pass 2 (history): what changed and how it was measured

Files: `src/shots/s21.js`, `src/shots/s21/owl.js`, `src/shots/s21/poses.js`, `src/shots/s21/scissors.js` (new), `src/shots/s21/soft.js` (new). Evidence is in `snapshots/s21-p2-*`:
- `-final` has the 10 fps pairs, `sheet.jpg`, `metrics.txt`, `masks.txt/jpg` and `margins.txt`.
- `-final12b` holds the 12 before/after frames.
- `-base` is the first pass rendered with the current F1 page.
- `-tools` holds the measuring scripts: `metrics.py`, `lmk.py` (s21's landmarks overlaid on source crops), `wingfit.py`/`bodyfit.py` (silhouette fits), `sctrack.py` (rotated-template screw tracker), `blades.py` (blade opening), `probe.mjs`/`fit.mjs` (node probes of the shot's geometry), and `hz.py`/`zoom.py`/`ascii.py`.

**Result on the same 12 frames** (69.48–74.48), first pass → pass 2, both with the current F1 page:
- Owl-mask IoU: 0.72 → 0.77.
- Mean abs error over the owl region (σ1.5): 36.8 → 32.5.
- Fine-band energy inside the owl, relative to the source: 1.35 → 0.92.

**10 fps over the whole shot** (49 frames, `-final`, measured before the final σ 0.7 → 0.6 softening tweak, which leaves IoU and error unchanged on the 12 frames):

| Phase | IoU mean | IoU range | Error |
|---|---|---|---|
| Walk-in | 0.77 | 0.68–0.82 | 30.0 |
| Stop, look up, crouch | 0.77 | 0.71–0.82 | 31.3 |
| Flight | 0.72 | 0.59–0.80 | 37.6 |
| Top edge | 0.79 | 0.72–0.82 | 27.8 |

1. **Scissors screw on the top edge (73.24–74.48) is now the true screw.** It is tracked frame by frame with a rotated template (score 0.91–1.0). The first pass had tracked the flange about 13 px behind the screw.
   - During the swing down (73.00–73.20) the template slides along the blades, so those frames were read on 2.5x crops and value maps: the handles' neck, the screw about 12 px up the blades, and the tips. At 73.04 the screw was 25 px off before.
   - The blades are 89 px long from the screw, not 100.
   - The walk, hold and flight tracks were re-checked against the screw tracker and are within 0–4 px. The hold is now 4 px closer.
2. **Scissors redrawn** to the source's structure (`s21/scissors.js`).
   - Blades run on past the screw to a heel. Curved shanks lead to thick loops (about 5 px), with a small flange on one shank.
   - The rings' offsets from the screw come from ellipse fits of the ring holes at 73.60, 74.00, 74.20 and 74.48. They hold still to within 1 px: upper (−38.2, −29.3), lower (−53.4, −1.7).
   - At 72.88 the rings were read in the vertical swing pose.
   - The rings keep their pixel distance from the screw while the blades' apparent length changes.
   - Ring 0 stays on one side through the turn. This is an in-plane rotation, which removes the first pass's crossing.
3. **The snip is measured.**
   - The angle between the blades comes from their centres 60 px out along the axis, frame by frame.
   - It is a slow cut, about 0.52 s per cycle: closed at 73.56–73.64 and 74.08–74.16, wide open (0.41 rad) at 73.84 and 74.34.
   - The first pass used a stylised 0.24 s open/close.
4. **The dash count per frame is read from the source.** It is 11 at 73.56, 13 at 73.68, 14 at 73.88, 15 at 74.04, 16 at 74.16, 17 at 74.40 and 18 at 74.48. The spacing is s22's measured 20.706 px, so the line continues at the cut.
5. **Head landmarks fitted to the source.**
   - `probe()` overlays s21's cup, eye, beak, head-top and band-apex positions on source crops (`lmk.py`).
   - Walk: the cup is about 3 px lower and smaller, the eye 5 px higher.
   - Look-up at 71.20: the cup stays low at the back. It was 6 px too high.
   - Corner turn at 72.92: the cup drops 7 px (time-keyed).
   - Top edge: cup, eye, beak tip, head top and face front were fitted at 74.00 by coordinate descent, and the band apex at (345, 47). This moved the head centre (+6.5, +4.9) px; the body is carried back so the silhouette stays.
   - The walking head is squashed to 0.8 height. The source's crown sits 5–9 px under ours over 69.5–71.9 while eye and cup line up.
   - A 4 px head dip was added at the stop (70.84–70.96).
6. **Face and headphones redrawn.**
   - The eye is now a fully outlined almond with the pupil pushed into the front corner (rolled up when it looks up), under one heavy brow-and-lid stroke, redrawn from 9x crops.
   - The beak is bigger, drawn over the scissors, and hooked down to the upper ring on the top edge.
   - The band is a thick grey loop standing up off the back of the head while it walks, instead of a thin dark arc over the crown.
   - The cup is a flat dark grey in the walk and a soft mid-grey with a faint rim on the top edge; there are no black rings.
   - Two short ear tufts either side of the band (flight and top edge); the head top is a little flatter.
7. **Flight wings fitted by silhouette.** For each source frame from 72.00 to 73.00, the wing states were fitted by IoU:
   - Each candidate state was rasterised together with s21's own head, body, tail, legs and scissors polygons and compared with the source's owl mask.
   - Room margins demand brighter pixels in the mask, so the owl's halo there is not counted as owl.
   - 18 keys changed where they gained ≥ 0.02.
   - The wings grow to 1.12× from 72.40 to 72.68, fitted the same way.
   - A deeper down-stroke state exists but was not chosen.
8. **The flying body is much plumper**, fitted the same way: ×1.3 long, ×1.44 wide, 28 units lower. Legs in flight are shorter and thicker, with the feet tucked about 10 px higher. On landing the body and tail settle within 0.1 s (73.00–73.10) and the grip wing follows the rings while the scissors swing down.
9. **Grip wings.**
   - Top edge: long primaries fanned to the right along the lower ring, with explicit shoulder, wrist and hand.
   - Walk: the feathers sweep forward and down to the rings, replacing the first pass's comb of long vertical secondaries. The legs are thicker with bigger feet.
10. **Walking bob re-fitted** to the tracked screw: period 0.170 s, lowest at 69.649, ±2 px. The rms is 1.2 px, against 1.7 px for the first pass's 0.165 s, which drifted out of phase.
11. **Held source frames.** Several source frames repeat the one before apart from the grain: 69.48 = 69.44, 69.96 = 69.92, 70.96 = 70.92, 72.96 = 72.92, 73.40 = 73.44 = 73.36, and 73.96 = 73.92. These now draw the same state.
12. **Owl brightness keyed per frame** to the source/render ratio of the median owl value inside both masks (`GAIN`):
    - ×1.13 walking in along the dark lower-left edge (was 18–22 levels dark, now within about 5);
    - ×1.03–1.07 elsewhere;
    - ×1.15–1.2 in the vignetted top-left corner.
13. **Softness.** A σ 0.6 px premultiplied gaussian is applied to the finished sprite (`s21/soft.js`). The source's owl is soft; fine-band energy inside the owl went from 1.35× to 0.92× the source's.

**Draw time** is 47–72 ms per frame, measured headless in a scratch harness (`snapshots/s21-p2-perf`, not part of the film). Renders are deterministic: 70.40, 72.52 and 74.00 rendered in two different orders came out bit-identical. `camtrack` 69.48–74.48 gives s = 1.0000, tx = ty = 0.

## Measured beats

- **69.44–69.48:** cut in, the first drawing held for two frames. The shot cuts out at 74.52, where the source's camera settles and s22 takes over.
- **69.48–70.84:** walk in at about 246 px/s, with a bob every 0.170 s and a step pair of 0.33 s.
- **70.84–71.66:** stop (the head dips 70.84–70.96), then look up from 70.96, holding 71.08–71.64.
- **71.66–71.98:** crouch, held 71.84–71.96.
- **72.00:** take-off.
- **72.00–72.72:** climb up the left side into the top margin. Wing states are fitted per frame.
- **72.72–73.00:** hover at the top left, with the scissors swinging to vertical by 72.88.
- **73.00:** land on the header's top edge.
- **73.04–73.32:** the scissors swing down to horizontal.
- **73.36–74.48:** walk right, snipping. Closed at 73.56–73.64 and 74.08–74.16; dashes from 73.56.

## Known gaps at the end of pass 2 (superseded above)

- **Still a simpler owl than the source's.**
  - The source plumage is painterly: mottled white, many fine grey feather edges, a sculpted brow ridge and face disc.
  - Ours is clean vector shapes with sparse strokes, and the grip wings still read as rows of separate "fingers".
  - The walking body is still a little too round and the source's tail longer. In flight the source's head reads more to the front and its legs are stubbier.
- **Silhouette overlap.**
  - Weakest frames: take-off and early climb 72.14–72.34 (IoU 0.66–0.70, where the source is smeared), 72.64 (0.59: the source's near wing hangs lower than any of our fitted states), the stop 70.74–70.84 (0.68) and the landing 73.04–73.14 (0.72–0.73).
  - The mask metric counts the busy page behind the owl, so its absolute values are pessimistic.
- **Owl brightness is capped in the top-left corner.** The grade's vignette (post.js, not ours) caps the whites there. Our p75/p90 on the top edge stay 6–8 levels under the source's (p50 matches), and 73.14–73.24 stay about 10 levels dark.
- **Scissors keys read by eye.** The 72.80–73.00 keys and the 73.00–73.20 swing-down keys are read by eye on crops (±5 px), not tracked. The rings in flight sit about 6 px further from the screw than the source's.
- **Not ours.**
  - The sōko page illustration (sites.js/F1) differs visibly from the source, most visibly behind the flight (72.0–72.4: keyboard and knob module where the source has the guitar case and a rack).
  - The global grade (post.js) has the vignette cap above.
- **Continuity with s22 (74.52).** The source does not cut here; the owl keeps walking. s22 draws its own fork of the first-pass owl (`s22/owl21.js`, `s22/sc21.js`), so the cut pops from this drawing to that one. Pass 2 changed several things that affect that cut:
  - the top-edge head placement (+6.5, +4.9 px);
  - the cup, band, beak and ear tufts;
  - the scissors screw: 74.48 is at (488, 160), L 89, the blades opening 0.17 and closing;
  - the snip phase;
  - the grip wing;
  - 18 dashes at 74.48.
  
  s22 can re-fork `s21/owl.js`, `s21/poses.js` (`TOP`) and `s21/scissors.js`. That is s22's owner's call.
- **Boundary frames in compare.sh.** `tools/compare.sh` renders on a 30 fps grid, so 69.44 itself renders as 69.4333 (s20). The film renders at 25 fps, where frame 1736 is s21 and draws the held first drawing.
