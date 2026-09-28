# lidcol.py -- the lid face's colour (pre-grade), bilinear over the lid quad (TL, TR, BL, BR corner colours at u,v in
# [0.1,0.9]), least-squares from the ungraded source inside the measured quad, every 2nd frame 129.28-131.40 + locked.
import re, json, cv2, numpy as np
from lib import src, ungrade
js = open('../../src/shots/s28/drawn/measure.js').read()
L = eval(re.search(r'export const LIDQ = (\[\[.*?\]\]);', js, re.S).group(1))
rows = []
for r in L[::2] + [[131.8] + L[-1][1:], [133.0] + L[-1][1:], [134.4] + L[-1][1:], [135.6] + L[-1][1:]]:
    t = r[0]; q = np.array(r[1:9]).reshape(4, 2)
    g = src(t).astype(np.float32) / 255
    p = ungrade(cv2.GaussianBlur(g, (0, 0), 1.5), t) * 255
    A = []; Y = []
    for u in np.linspace(0.08, 0.92, 12):
        for v in np.linspace(0.06, 0.94, 12):
            top = q[0] + (q[1] - q[0]) * u; bot = q[3] + (q[2] - q[3]) * u
            x, y = top + (bot - top) * v
            if not (4 <= x < 2202 and 4 <= y < 942): continue
            c = np.median(p[int(y) - 3:int(y) + 4, int(x) - 3:int(x) + 4].reshape(-1, 3), 0)
            A.append([(1 - u) * (1 - v), u * (1 - v), (1 - u) * v, u * v]); Y.append(c)
    A = np.array(A); Y = np.array(Y)
    C, *_ = np.linalg.lstsq(A, Y, rcond=None)
    res = np.abs(A @ C - Y).mean()
    rows.append([round(t, 2)] + [int(round(v)) for v in np.clip(C, 0, 255)[:, ::-1].ravel()])
    print(t, np.clip(C, 0, 255)[:, ::-1].round().astype(int).tolist(), 'res %.1f' % res)
json.dump(rows, open('../s28d-meas/lidcol.json', 'w'))
