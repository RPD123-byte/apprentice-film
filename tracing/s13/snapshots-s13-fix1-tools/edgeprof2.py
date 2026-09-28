# edgeprof2.py RENDERDIR FRAME : mean value (screen) vs signed distance to the source's lit silhouette edge, render vs source
import sys, numpy as np, cv2
from common import *
d, f = sys.argv[1], int(sys.argv[2])
R = cv2.imread(f'{d}/r{f}.png', 0).astype(np.float32); S = src(f)
lit = (cv2.GaussianBlur(S, (0, 0), 1) > 70).astype(np.uint8)
din = cv2.distanceTransform(lit, cv2.DIST_L2, 5); dout = cv2.distanceTransform(1 - lit, cv2.DIST_L2, 5)
sd = np.where(lit > 0, din, -dout)
sel = np.zeros_like(lit, bool); sel[:, 760:2150] = True
for a, b in [(-60, -30), (-30, -15), (-15, -10), (-10, -6), (-6, -3), (-3, -1), (-1, 0), (0, 1), (1, 3), (3, 6), (6, 10), (10, 15), (15, 25), (25, 40)]:
    m = sel & (sd >= a) & (sd < b)
    print(f'{a:4d}..{b:4d}  source {S[m].mean():6.1f}  render {R[m].mean():6.1f}  diff {R[m].mean() - S[m].mean():+6.1f}')
