#!/usr/bin/env python3
# s16: measure his irises per source frame in plate px, inside the measured eye openings: the iris's left/right
# extent (columns whose inner part is mostly dark), its vertical centre, and the highlight (bright pixels inside it).
# Frames under a camera (data/cams.js) are mapped back to plate px first. Output: JSON numbers only.
import sys, os, json, re
sys.path.insert(0, os.path.dirname(__file__))
import m16, cv2, numpy as np
z = np.load(m16.ROOT + '/snapshots/s16-h1-work/eyes.npz')
BOX = {'L': (1276, 198, 1366, 238), 'R': (1448, 194, 1546, 238)}
cams = {}
for m in re.finditer(r'(\d+): \[([^\]]+)\]', open(os.path.join(os.path.dirname(__file__), '..', 'data', 'cams.js')).read()):
    cams[int(m.group(1))] = [float(v) for v in m.group(2).split(',')]
def plateview(f):
    Y = m16.pre(f)
    if f in cams:
        a, b, tx, c, d, ty = cams[f]
        Y = cv2.warpAffine(Y, np.array([[a, b, tx], [c, d, ty]], np.float32), (m16.W, m16.H), flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP)
    return Y
res = {}
for f in range(1143, 1193):
    Y = plateview(f); row = {}
    for k, (x0, y0, x1, y1) in BOX.items():
        op = z[k + '_open_mask']; p = Y[y0:y1, x0:x1]
        inner = cv2.erode(op, np.ones((7, 7), np.uint8))       # 3 px inside the opening (off the lash line and lid)
        cols = inner.sum(0)
        dk = ((p < 0.45) & (inner > 0)).sum(0) / np.maximum(1, cols)
        good = cols >= 4
        iris = good & (dk > 0.5)
        if iris.sum() < 3: row[k] = None; continue
        xs = np.nonzero(iris)[0]
        # the largest run of iris columns
        runs = np.split(xs, np.nonzero(np.diff(xs) > 2)[0] + 1); run = max(runs, key=len)
        xl, xr = run[0], run[-1]
        sub = (p < 0.45) & (inner > 0); sub[:, :xl] = 0; sub[:, xr + 1:] = 0
        ys = np.nonzero(sub.any(1))[0]
        hl = (p > 0.6) & (op > 0); hl[:, :max(0, xl - 1)] = 0; hl[:, xr + 2:] = 0
        # a highlight must sit inside the iris rows
        hl[:ys.min(), :] = 0; hl[ys.max() + 1:, :] = 0
        hs = [int(hl.sum())]
        if hl.sum() > 0:
            hy, hx = np.nonzero(hl); hs += [round(float(hx.mean() + x0), 1), round(float(hy.mean() + y0), 1)]
        row[k] = dict(xl=int(xl + x0), xr=int(xr + x0), cx=round((xl + xr) / 2 + x0, 1), yt=int(ys.min() + y0), yb=int(ys.max() + y0),
                      hl=hs, mean=round(float(p[sub].mean()), 3))
    res[f] = row
    print(f, {k: (v and (v['xl'], v['xr'], v['cx'], v['yt'], v['yb'], v['hl'], v['mean'])) for k, v in row.items()})
json.dump(res, open(m16.ROOT + '/snapshots/s16-h1-work/irises.json', 'w'), indent=0)
