import sys, json; sys.path.insert(0, '.')
from common import *
k = int(sys.argv[1]); u = U(k)
m = (cv2.GaussianBlur(u, (0, 0), 0.8) > 40).astype(np.uint8)
n, lab, st, cen = cv2.connectedComponentsWithStats(m, connectivity=4)
rows = []
for i in range(1, n):
    if st[i, 4] < 150: continue
    ys, xs = np.nonzero(lab[st[i, 1]:st[i, 1] + st[i, 3], st[i, 0]:st[i, 0] + st[i, 2]] == i)
    pts = np.stack([xs, ys], 1).astype(np.float64)
    c = pts.mean(0); C = np.cov((pts - c).T)
    ev, evec = np.linalg.eigh(C)
    L = np.sqrt(12 * ev[1]); Wd = np.sqrt(12 * max(ev[0], 1e-9))
    if L < 120 or Wd > 14 or L / Wd < 12: continue
    d = evec[:, 1]; ang = np.degrees(np.arctan2(d[1], d[0])) % 180
    rows.append([c[0] + st[i, 0], c[1] + st[i, 1], ang, L, Wd])
R = np.array(rows)
print(len(R), 'angle pct', np.percentile(R[:, 2], [5, 25, 50, 75, 95]))
# linear model: angle = a + b x + c y
A = np.c_[np.ones(len(R)), R[:, 0], R[:, 1]]
co, *_ = np.linalg.lstsq(A, R[:, 2], rcond=None)
res = R[:, 2] - A @ co
print('model a %.3f b %.5f/px c %.5f/px  resid std %.3f' % (co[0], co[1], co[2], res.std()))
for x0, x1 in [(0, 700), (700, 1400), (1400, 2206)]:
    s = (R[:, 0] >= x0) & (R[:, 0] < x1); print(x0, x1, s.sum(), np.median(R[s, 2]) if s.any() else None)
for y0, y1 in [(0, 300), (300, 600), (600, 946)]:
    s = (R[:, 1] >= y0) & (R[:, 1] < y1); print('y', y0, y1, s.sum(), np.median(R[s, 2]) if s.any() else None)
