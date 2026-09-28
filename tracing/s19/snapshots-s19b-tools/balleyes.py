import sys; sys.path.insert(0, '.')
from lab import src
import numpy as np, cv2
C = {57.48: (2215, 695), 57.52: (2135, 695), 57.56: (2060, 722), 57.60: (1990, 705), 57.64: (1916, 696), 57.68: (1845, 692), 57.72: (1780, 690),
     57.76: (1717, 697), 57.80: (1676, 708), 57.84: (1634, 702), 57.88: (1565, 688), 57.92: (1492, 712), 57.96: (1450, 710)}
yy, xx = np.mgrid[0:946, 0:2206]
for t, (cx, cy) in C.items():
    f = cv2.GaussianBlur(src(t, True).astype(np.float32), (0, 0), 1.2)
    r = np.hypot(xx - cx, yy - cy)
    m = (r > 20) & (r < 118) & (f < 105) & (xx < 2205)
    ys, xs = np.nonzero(m)
    if len(xs) < 20: print(t, 'few'); continue
    # cluster by angle histogram
    ang = np.degrees(np.arctan2(ys - cy, xs - cx))
    h, e = np.histogram(ang, bins=36, range=(-180, 180))
    top = np.argsort(h)[::-1][:3]
    print(f'{t:.2f} n {len(xs):5d} mean-vec angle {np.degrees(np.arctan2((ys-cy).mean(), (xs-cx).mean())):7.1f}  top bins {[int(e[i]+5) for i in top]} {[int(h[i]) for i in top]}  rad {np.hypot(xs-cx, ys-cy).mean():.0f}')
