#!/bin/sh
# usage: wordvar.sh name 'EXTLINE'
cd /Users/computer/rootline/apprentice-film
python3 - "$2" <<'PY'
import sys
p='src/shots/s40/card.js'; s=open('snapshots/s40-fix2p-h/card.js.bak').read()
old='const EXT = [[46, 54, "extDark"], [29, 43, "ext2"], [21, 25, "ext1"]];'
assert old in s; s=s.replace(old,sys.argv[1]); open(p,'w').write(s)
PY
cd snapshots/s40-fix2p-h
node runh.mjs v_$1 138.000,138.160,138.320 2>&1 | grep -iE "error|TIMEOUT"
python3 -c "
import cv2,numpy as np
s=np.mean([cv2.imread(f'src/f{n}.png').astype(np.float32) for n in (3450,3454,3458)],0)
r=np.mean([cv2.imread(f'v_$1/r-{t:.3f}.png').astype(np.float32) for t in (138.0,138.16,138.32)],0)
for sig in (3,6):
  d=np.abs(cv2.GaussianBlur(r,(0,0),sig)-cv2.GaussianBlur(s,(0,0),sig))[290:640,480:1490].mean()
  print('$1 sigma',sig,round(float(d),3))
"
