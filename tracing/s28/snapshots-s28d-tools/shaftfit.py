# shaftfit.py render.png T x0,y0,x1,y1 [angmin angmax] -- best stripe angle of the residual (source - render, ungraded
# luminance, sigma 3) inside a box, and its 1D profile across the stripes (s = x*sin(a) + y*cos(a); lines of equal s run
# down-left at 'a' below horizontal). Prints the profile with the (x at y=0) intercept of each s.
import sys, cv2, numpy as np
from lib import src, ungrade
r = cv2.imread(sys.argv[1]).astype(np.float32) / 255; t = float(sys.argv[2])
x0, y0, x1, y1 = map(int, sys.argv[3].split(','))
a0, a1 = (float(sys.argv[4]), float(sys.argv[5])) if len(sys.argv) > 5 else (5, 80)
Ru = ungrade(cv2.GaussianBlur(r, (0, 0), 1), t); Su = ungrade(cv2.GaussianBlur(src(t).astype(np.float32) / 255, (0, 0), 1), t)
d = cv2.GaussianBlur((Su - Ru).mean(2), (0, 0), 3) * 255
ys, xs = np.mgrid[y0:y1, x0:x1]; D = d[y0:y1, x0:x1]
best = None
for ang in np.arange(a0, a1, 0.5):
    a = np.radians(ang); s = xs * np.sin(a) + ys * np.cos(a)
    b = np.floor(s / 4).astype(int); bmin = b.min(); b -= bmin
    cnt = np.bincount(b.ravel()); tot = np.bincount(b.ravel(), D.ravel())
    ok = cnt > 30; prof = tot[ok] / cnt[ok]
    sc = np.var(prof)
    if best is None or sc > best[0]: best = (sc, ang, (np.nonzero(ok)[0] + bmin) * 4, prof)
sc, ang, sg, prof = best
a = np.radians(ang)
print(f'best angle {ang:.1f} deg (var {sc:.1f})')
for s_, p in list(zip(sg, prof))[::2]:
    print(f'  s {s_:6.0f}  x@y0 {s_ / np.sin(a):7.0f}  resid {p:6.1f}  ' + ('#' * int(max(0, p) / 2)) + ('-' * int(max(0, -p) / 2)))
