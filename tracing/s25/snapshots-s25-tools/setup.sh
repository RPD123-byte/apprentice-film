#!/bin/sh
# s25 measuring scripts (scratch; not loaded by the film). They read source frames extracted to ../s25-src/fNNNNN.png
# (NNNNN = t·25) and the clean chaos plate ../s25-meas/chaos-p30.png (30th percentile of frames 2516–2565), both deleted
# after this run to save disk. Recreate them with this script, then e.g.:
#   python3 extract3.py NAME FRAME HULLKEY '{json opts}' && python3 tojs3.py NAME && python3 mkindex.py   (owl drawings)
#   python3 smoke3.py F0 F1 && python3 mksmoke.py        (chaos smoke puffs)
#   python3 crackfit.py A|B                              (crack refinement)
#   node render.mjs OUTDIR F0 F1 [STEP] && python3 score.py OUTDIR --pairs   (exact-frame render + score)
cd "$(dirname "$0")/.." || exit 1
mkdir -p s25-src s25-meas
ffmpeg -v error -ss 100.40 -i /Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4 -t 10.3 -start_number 2510 s25-src/f%05d.png
python3 - <<'PY'
import cv2, numpy as np
st = np.stack([cv2.imread(f's25-src/f{f:05d}.png', 0) for f in range(2516, 2566)])
cv2.imwrite('s25-meas/chaos-p30.png', np.percentile(st, 30, axis=0).astype(np.uint8))
PY
