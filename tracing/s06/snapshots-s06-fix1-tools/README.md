# s06 fix pass 1 tools (measurement only; the film never loads these)

- `render.mjs OUT 668-725` : headless Chrome, files served by request interception (no server), the real `main.js`
  pipeline (shot + post.js grade) at exact 25 fps frames -> OUT/f-<frame>.png.
- `../s06-fix1-src/s-<n>.png` : source frames 666-727 (decoded by index, measurement only).
- `m2.py DIR [regions] [--defects]` : per-frame, per-region blurred MAE (sigma 5 / 1.5) and SSIM against the exact frame.
- `crop.py`, `shift.py`, `motion.py`, `f2f.py`, `ear.py`, `lidprof.py`, `rimprof.py`, `blob.py`, `catch.py`, `hf.py`,
  `gain.py` : the defect-specific checks quoted in fidelity/s06.md.
- `layer.mjs OUT.png r3_a,r3_b [bg]` : draws single r3 layers (to see which layer draws what).
- `liftfield.py` : writes `src/shots/s06/data/lift.js` (smile displacement fields R, F, FACE, Z2) from `inputs/`
  (nm.npy / sm.npy = neutral 668-677 and held-smile 712-725 source means, L-over.png = the over layer's coverage,
  faceclip.json = the face outline).
- `expo.py DIR [--init]` : folds the measured per-frame channel gains into `src/shots/s06/data/expo.js` (run on a
  render made with the current table; three passes were used).
- `inputs/ear_ecc.json` : the earcup's per-frame Euclidean transforms (ECC), pasted into s06.js EAR_W.
