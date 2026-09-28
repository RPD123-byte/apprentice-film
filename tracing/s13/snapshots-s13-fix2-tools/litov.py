# litov.py DIR frame x0 y0 x1 y1 scale out.jpg [thr=70]: lit-mask overlay: both lit = grey (source value), source-only = green, render-only = magenta
import cv2, numpy as np, sys
S = '/Users/computer/rootline/apprentice-film/snapshots/s13-w3-src'
d, f = sys.argv[1], sys.argv[2]; x0, y0, x1, y1, sc = map(int, sys.argv[3:8]); out = sys.argv[8]; thr = float(sys.argv[9]) if len(sys.argv) > 9 else 70
r = cv2.imread(f'{d}/r{f}.png', 0).astype(np.float32); s = cv2.imread(f'{S}/f{f}.png', 0).astype(np.float32)
mr, ms = cv2.GaussianBlur(r, (0, 0), 1) > thr, cv2.GaussianBlur(s, (0, 0), 1) > thr
o = np.stack([s * 0.5] * 3, -1)
o[ms & ~mr] = (0, 220, 0); o[mr & ~ms] = (220, 0, 220)
c = o[y0:y1, x0:x1].astype(np.uint8); c = cv2.resize(c, None, fx=sc, fy=sc, interpolation=cv2.INTER_NEAREST)
for x in range((x0 // 20 + 1) * 20, x1, 20):
    X = (x - x0) * sc; cv2.line(c, (X, 0), (X, c.shape[0]), (0, 120, 200), 1); cv2.putText(c, str(x), (X + 2, 12), 0, 0.38, (0, 255, 255), 1)
for y in range((y0 // 20 + 1) * 20, y1, 20):
    Y = (y - y0) * sc; cv2.line(c, (0, Y), (c.shape[1], Y), (0, 120, 200), 1); cv2.putText(c, str(y), (2, Y - 2), 0, 0.38, (0, 255, 255), 1)
cv2.imwrite(out, c); print(out, 'src-only', int((ms & ~mr)[y0:y1, x0:x1].sum()), 'render-only', int((mr & ~ms)[y0:y1, x0:x1].sum()))
