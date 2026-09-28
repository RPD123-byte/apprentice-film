#!/usr/bin/env python3
# fit.py render.png k x0 y0 x1 y1 out.jpg [plate=B|H] [thr]  silhouette check of a render (owl on black) against the
# source owl (difference from the clean plate): IoU, bboxes, centroids; overlay: source mask green, render red
import sys, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s23r-tools')
from m import src, SP
r = cv2.imread(sys.argv[1]); k = int(sys.argv[2]); x0, y0, x1, y1 = map(int, sys.argv[3:7]); out = sys.argv[7]
pl = sys.argv[8] if len(sys.argv) > 8 else 'B'; thr = float(sys.argv[9]) if len(sys.argv) > 9 else 40
P = cv2.imread(SP + ('/plateB.png' if pl == 'B' else '/plateH.png')).astype(np.float32)
s = src(k)
d = np.abs(s.astype(np.float32) - P).max(-1)[y0:y1, x0:x1]; d = cv2.GaussianBlur(d, (0, 0), 1.2)
ms = (d > thr).astype(np.uint8); ms = cv2.morphologyEx(ms, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
n, cc, st, _ = cv2.connectedComponentsWithStats(ms, 8)
if n > 1: i = 1 + np.argmax(st[1:, 4]); ms = (cc == i).astype(np.uint8)
from scipy import ndimage
ms = ndimage.binary_fill_holes(ms).astype(np.uint8)
import os
WH = float(os.environ.get('WHITE', '0'))
if WH: ms = ms & (cv2.cvtColor(s[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY) > WH).astype(np.uint8); ms = cv2.morphologyEx(ms, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
a = r[y0:y1, x0:x1]
mr = (cv2.cvtColor(a, cv2.COLOR_BGR2GRAY) > (WH or 25)).astype(np.uint8)
if not WH: mr = ndimage.binary_fill_holes(mr).astype(np.uint8)
else: mr = cv2.morphologyEx(mr, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
def info(m):
    ys, xs = np.nonzero(m)
    if not len(xs): return None
    return (xs.min() + x0, ys.min() + y0, xs.max() + x0, ys.max() + y0, xs.mean() + x0, ys.mean() + y0, len(xs))
I = (ms & mr).sum(); U = (ms | mr).sum()
print('IoU %.3f' % (I / max(1, U)))
print('src  bbox %d,%d-%d,%d  c %.1f,%.1f  area %d' % info(ms))
print('ours bbox %d,%d-%d,%d  c %.1f,%.1f  area %d' % info(mr))
o = s[y0:y1, x0:x1].copy()
for m, col in ((ms, (0, 255, 0)), (mr, (0, 0, 255))):
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); cv2.drawContours(o, cs, -1, col, 1)
sc = float(sys.argv[10]) if len(sys.argv) > 10 else 2
im = np.hstack([a, s[y0:y1, x0:x1], o]); im = cv2.resize(im, None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
cv2.imwrite(out, im, [cv2.IMWRITE_JPEG_QUALITY, 90])
