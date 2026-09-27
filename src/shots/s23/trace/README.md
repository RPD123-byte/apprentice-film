Measurement scripts for s23 (not loaded by the film). They read SOURCE frames and write vector data only (outlines,
centre lines, colours, poses) — no pixels. Run them from a working directory that holds:

- `src/%05d.png` — the source frames 2095–2432 (25 fps index = round(t·25)):
  `ffmpeg -i 01-13-FINISHED-v3-share.mp4 -vf "select=between(n\,2095\,2432)" -vsync 0 -start_number 2095 src/%05d.png`
- `f1940.png`, `f2250b.png` — `tools/refframe.sh 77.6` (intact header) and `tools/refframe.sh 90.0` (settled banner).

Pipeline (`skel.py` is F2's, copied from snapshots/f2k-tools):
1. `ug.py` — exact inverse of the finish grade (flicker, vignette, S-curve, halation); `glowtest.py` — F1's screen-margin
   glow model, subtracted so the room above the screen compares cleanly.
2. `plateH.py`, `plateB.py`, `plateB2.py` — clean plates (per-pixel medians): hole page with rim A / B / C, page with the
   banner (with and without its pale edge). `rim.py` traces the torn rims from them (-> data.js RIMS).
3. `striptrk.py`, `dissfit.py`, `exitfit.py` — strip poses (ORB; two-copy joint fit for the 85.60–85.76 dissolve; exit
   frames). `shake.py` — whole-frame shake by phase correlation on the static banner / page (-> data.js SHAKE).
4. `fgx.py` — per frame: ungrade, unshake, subtract the glow; predict the background (plate + strip / banner warped by
   their tracks, dissolves blended); foreground mask (clip-aware difference, anchored components, hole fill, growth
   into the faint dark greys next to the owl).
5. `cel.py` — nested level regions (flat colour each) of the foreground; `trace_alpha` for the motion-streak frames
   (light over the page as alpha levels); `lines.py` — bright cut lines as stroked centre lines; `core.py` — which
   fly-phase frames have a crisp owl; `plan.py` — per-frame settings and held drawings (`holds.py` statistics).
6. `batch.py FRAMES` (env CELDIR, NP) traces cels to json; `emit.py CELDIR ../cels.js holdref.json` writes cels.js.
7. `pair.py OUTDIR FRAMES` renders exact source frames through HyperFrames and pairs them (r/p files, blurred MAE);
   `crop.py`, `errmap.py` — crops and error maps.
