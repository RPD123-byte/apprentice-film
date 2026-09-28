# rays.py render.png T  -- measure the sun bands: ratio of source to render (both ungraded, luminance) on plain wall pixels
# of the render, projected on the coordinate across the rays for a range of angles; prints the best angle per region and
# the ratio profile along it.
import sys, cv2, numpy as np
from lib import src, ungrade
rp, t = sys.argv[1], float(sys.argv[2])
R = cv2.imread(rp).astype(np.float32) / 255
Ru = ungrade(cv2.GaussianBlur(R, (0, 0), 1.0), t)
Su = ungrade(cv2.GaussianBlur(src(t).astype(np.float32) / 255, (0, 0), 1.0), t)
# plain wall pixels: low local variance in the render
g = Ru.mean(2)
mu = cv2.blur(g, (9, 9)); var = cv2.blur(g * g, (9, 9)) - mu * mu
plain = (var < 2e-5) & (g > 0.7)
ratio = cv2.GaussianBlur(Su.mean(2), (0, 0), 3) / np.maximum(cv2.GaussianBlur(g, (0, 0), 3), 1e-3)
warm = cv2.GaussianBlur((Su[..., 2] - Su[..., 0]) - (Ru[..., 2] - Ru[..., 0]), (0, 0), 3)
H, W = g.shape
ys, xs = np.mgrid[0:H, 0:W]
regions = {'back_top': (400, 0, 1612, 260), 'window': (1650, 0, 2206, 470), 'back_mid': (380, 180, 1150, 420), 'cab': (1560, 560, 1890, 800)}
np.save('/tmp/s28d-ratio.npy', ratio)
for name, (x0, y0, x1, y1) in regions.items():
    m = np.zeros_like(plain); m[y0:y1, x0:x1] = True; m &= plain
    best = None
    for ang in np.arange(0, 80, 1.0):
        a = np.radians(ang)
        s = xs * np.sin(a) + ys * np.cos(a)          # constant along lines running down-left at 'ang' below horizontal
        sv = s[m]; v = ratio[m]
        bins = np.floor(sv / 6).astype(int); b0 = bins.min(); bins -= b0
        cnt = np.bincount(bins); tot = np.bincount(bins, v); tot2 = np.bincount(bins, v * v)
        ok = cnt > 15
        mean = tot[ok] / cnt[ok]; within = (tot2[ok] / cnt[ok] - mean ** 2)
        score = np.var(mean) / (np.mean(within) + 1e-6)
        if best is None or score > best[0]: best = (score, ang, (np.nonzero(ok)[0] + b0) * 6, mean)
    sc, ang, sgrid, prof = best
    print(f'{name}: best angle {ang:.0f} deg (score {sc:.2f}), pixels {m.sum()}')
    print('   s:', ' '.join(f'{int(s)}' for s in sgrid[::3]))
    print('   r:', ' '.join(f'{p:.2f}' for p in prof[::3]))
