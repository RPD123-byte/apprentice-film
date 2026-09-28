#!/bin/sh
# pc.sh TAG : render frame 745 (graded), rectify the screen, page-space error vs the source mean (727-763)
cd /Users/computer/rootline/apprentice-film
D=snapshots/s07-bp; mkdir -p $D
node snapshots/s07-bt/multi.mjs $D/$1 745 "$2" 2>&1 | grep -v "^rendered" | grep -v "^    at" | head -5; [ -f $D/$1/r0745.png ] || node snapshots/s07-bt/multi.mjs $D/$1 745 2>&1 | head -3
python3 - "$1" <<'PY'
import sys, cv2, numpy as np
sys.path.insert(0, 'snapshots/s07-bt')
from rect import rect
t = sys.argv[1]; D = 'snapshots/s07-bp'
a = rect(cv2.imread(f'{D}/{t}/r0745.png')); cv2.imwrite(f'{D}/{t}/rect.png', a)
b = cv2.imread('snapshots/s07-bt/src_screen_mean.png')
bl = lambda x: cv2.GaussianBlur(x.astype(np.float32), (0, 0), 24)
e = np.abs(bl(a) - bl(b)).mean(2)
m = np.ones((1000, 1600), bool); m[760:900, 620:980] = False   # ticket text differs from the mean
print(t, 'page err %.3f' % e[m].mean())
R = dict(pure=(470, 320, 1130, 515), fan=(450, 150, 1000, 520), cloudR=(1260, 380, 1600, 580), lowL=(0, 380, 700, 1000), top=(0, 0, 1600, 60), logo=(700, 60, 900, 190), imag=(360, 520, 1260, 690), robot=(150, 720, 320, 900), plume=(120, 450, 280, 640))
print('  ' + '  '.join('%s %.2f' % (k, e[y0:y1, x0:x1].mean()) for k, (x0, y0, x1, y1) in R.items()))
PY
