# Pre-grade colour of the laptop lid per source frame on a COLS x ROWS grid in the lid quad's own (u,v) coordinates
# (cells inset from the keyline); lid quads from LIDQ (orbit) and the locked quad after 131.40.
import sys, json; sys.path.insert(0, '.'); 
from geo import *
import grade28 as GR
COLS, ROWS = 6, 5
def quadpt(q, u, v):
    TL, TR, BR, BL = q
    return (1 - u) * (1 - v) * TL + u * (1 - v) * TR + u * v * BR + (1 - u) * v * BL
def measure(t):
    k = round(t * 25)
    f = frame(k)[..., ::-1].astype(np.float32) / 255
    f = cv2.GaussianBlur(f, (0, 0), 2.0)
    pre = GR.ungrade(f, t)
    q = lidQuad(min(t, 131.40))
    out = np.zeros((ROWS, COLS, 3)); ok = np.zeros((ROWS, COLS), bool)
    ys, xs = np.mgrid[0:H, 0:W]
    for j in range(ROWS):
        for i in range(COLS):
            u0, u1 = 0.04 + 0.92 * i / COLS, 0.04 + 0.92 * (i + 1) / COLS
            v0, v1 = 0.05 + 0.90 * j / ROWS, 0.05 + 0.90 * (j + 1) / ROWS
            poly = np.array([quadpt(q, u0, v0), quadpt(q, u1, v0), quadpt(q, u1, v1), quadpt(q, u0, v1)])
            x0, y0 = np.floor(poly.min(0)).astype(int); x1, y1 = np.ceil(poly.max(0)).astype(int)
            x0, y0 = max(0, x0), max(0, y0); x1, y1 = min(W, x1 + 1), min(H - 8, y1 + 1)
            if x1 <= x0 or y1 <= y0: continue
            m = np.zeros((y1 - y0, x1 - x0), np.uint8); cv2.fillPoly(m, [np.int32(poly - [x0, y0])], 1)
            if m.sum() > 400:
                out[j, i] = np.median(pre[y0:y1, x0:x1][m > 0], axis=0); ok[j, i] = True
    # fill cells below the frame from the lowest measured cell of each column
    for i in range(COLS):
        last = None
        for j in range(ROWS):
            if ok[j, i]: last = out[j, i]
            elif last is not None: out[j, i] = last
    return out
import os
old = json.load(open('lidcol.json')) if os.path.exists('lidcol.json') else None
res = []
times = [round(129.32 + 0.04 * i, 2) for i in range(0, 53)]  # to 131.40
ONLY = [float(a) for a in sys.argv[1:]]
if old and ONLY:
    res = old['orbit']
    for t in ONLY:
        c = measure(t); r = [t] + [int(round(v * 255)) for v in c.reshape(-1)]
        res = [r if abs(x[0] - t) < 1e-6 else x for x in res]
        print(t, c.reshape(-1, 3).mean(0).round(3), flush=True)
    old['orbit'] = res; json.dump(old, open('lidcol.json', 'w')); sys.exit(0)
for t in times:
    c = measure(t)
    res.append([t] + [int(round(v * 255)) for v in c.reshape(-1)])
    print(t, c.reshape(-1, 3).mean(0).round(3), flush=True)
# locked: median over the lock
L = np.median([measure(t) for t in np.arange(131.6, 135.8, 0.4)], axis=0)
json.dump({'cols': COLS, 'rows': ROWS, 'orbit': res, 'lock': [int(round(v * 255)) for v in L.reshape(-1)]}, open('lidcol.json', 'w'))
print('lock', L.reshape(ROWS, COLS, 3)[..., 0].round(3))
