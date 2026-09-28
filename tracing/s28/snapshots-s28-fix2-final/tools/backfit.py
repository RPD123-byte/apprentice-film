# fit the (dx, dy) shift that maps the render's hood back contour (top of the hood per column) onto the source's.
# Usage: backfit.py DIR [x0 x1]
import cv2, numpy as np, sys, glob, re
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s28d-tools')
from lib import src
d = sys.argv[1]; X0, X1 = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (460, 900)
def mask(im):
    sm = cv2.bilateralFilter(im, 9, 30, 5); lab = cv2.cvtColor(sm, cv2.COLOR_BGR2LAB).astype(int)
    L, A, B = lab[..., 0] * 100 // 255, lab[..., 1] - 128, lab[..., 2] - 128
    m = ((A < 1) & (L > 30) & (L < 85) & (B < 25)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
    return cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
def top(m, xs):
    out = []
    for x in xs:
        a = np.where(m[180:700, x])[0]; out.append(a[0] + 180 if len(a) else np.nan)
    return np.array(out, float)
for p in sorted(glob.glob(d + '/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1))):
    t = float(re.search(r'at-([\d.]+)s', p).group(1))
    mr, ms = mask(cv2.imread(p)), mask(src(t))
    xs = np.arange(X0, X1, 4); tr = top(mr, xs); best = None
    for dx in range(-100, 101, 4):
        ts = top(ms, np.clip(xs + dx, 0, 2205))
        dd = ts - tr; dd = dd[np.isfinite(dd)]
        if len(dd) < 20: continue
        dy = np.median(dd); e = np.mean(np.abs(dd - dy))
        if best is None or e < best[0]: best = (e, dx, dy)
    print(f'{t:7.2f}  dx {best[1]:+4d}  dy {best[2]:+6.1f}  resid {best[0]:5.1f}')
