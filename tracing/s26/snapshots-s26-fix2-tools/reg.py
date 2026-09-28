#!/usr/bin/env python3
# region stats of harness renders vs source: saturated-pixel % (HSV S>0.35, V>0.2), mean luma, black % (Y<16),
# sigma-8 dE, thin-bright-line % (pixel > its 5x5 mean + 40 and > 150). Usage: reg.py DIR x0 y0 x1 y1 [F...]
import cv2, numpy as np, sys, glob, re
d = sys.argv[1]; x0, y0, x1, y1 = map(int, sys.argv[2:6]); only = set(map(int, sys.argv[6:]))
SRC = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas/src'
def st(im):
    c = im[y0:y1, x0:x1]; h = cv2.cvtColor(c, cv2.COLOR_BGR2HSV)
    sat = ((h[..., 1] > 89) & (h[..., 2] > 51)).mean() * 100
    Y = cv2.cvtColor(c, cv2.COLOR_BGR2GRAY).astype(np.float32)
    line = ((Y - cv2.blur(Y, (5, 5)) > 40) & (Y > 150)).mean() * 100
    return sat, Y.mean(), (Y < 16).mean() * 100, line
def lab(im): return cv2.cvtColor(cv2.GaussianBlur(im.astype(np.float32) / 255, (0, 0), 8), cv2.COLOR_BGR2LAB)
print('F       sat r/s      Y r/s      blk r/s    line r/s   dE8')
for p in sorted(glob.glob(d + '/r*.png'), key=lambda p: int(re.search(r'r(\d+)\.png', p).group(1))):
    F = int(re.search(r'r(\d+)\.png', p).group(1))
    if only and F not in only: continue
    r = cv2.imread(p); s = cv2.imread(f'{SRC}/{F}.png')
    a, b = st(r), st(s)
    dE = np.sqrt(((lab(r) - lab(s)) ** 2).sum(2))[y0:y1, x0:x1].mean()
    print(f'{F} {a[0]:5.1f}/{b[0]:5.1f}  {a[1]:5.1f}/{b[1]:5.1f}  {a[2]:4.1f}/{b[2]:4.1f}  {a[3]:4.1f}/{b[3]:4.1f}  {dE:5.2f}')
