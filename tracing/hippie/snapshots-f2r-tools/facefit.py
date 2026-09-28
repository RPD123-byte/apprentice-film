# Flat regions bounded by ink lines -> polygons of few vertices (corner measurement) + median ink.
# Usage: facefit.py x0,y0,x1,y1 [--min 400] [--ink 70] [--eps 0.02] [--hull] [--dbg out.png]
import sys, json, numpy as np, cv2
a = sys.argv
x0, y0, x1, y1 = [int(v) for v in a[1].split(',')]
opt = lambda k, d: type(d)(a[a.index(k) + 1]) if k in a else d
amin = opt('--min', 400); inkT = opt('--ink', 70.0); eps = opt('--eps', 0.02)
im = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/f2r-meas/page-pre.png')
c = im[y0:y1, x0:x1]
lab = cv2.cvtColor(c, cv2.COLOR_BGR2Lab).astype(np.float32)
L = lab[..., 0] * 100 / 255
ink = (L < inkT * 100 / 255 * 1.0).astype(np.uint8) if False else (c.max(2) < inkT).astype(np.uint8)
ink = cv2.dilate(ink, np.ones((2, 2), np.uint8))
# also split on strong colour edges
g = cv2.GaussianBlur(lab, (0, 0), 1.2)
gx = cv2.Sobel(g, cv2.CV_32F, 1, 0); gy = cv2.Sobel(g, cv2.CV_32F, 0, 1)
edge = (np.sqrt((gx ** 2 + gy ** 2).sum(2)) > opt('--edge', 60.0)).astype(np.uint8)
bar = np.maximum(ink, edge)
n, lb, st, cen = cv2.connectedComponentsWithStats(1 - bar, connectivity=4)
res = []
dbg = c.copy()
for i in range(1, n):
    if st[i, 4] < amin: continue
    m = (lb == i).astype(np.uint8)
    m2 = cv2.dilate(m, np.ones((3, 3), np.uint8))
    cs, _ = cv2.findContours(m2, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cnt = max(cs, key=cv2.contourArea)
    if '--hull' in a: cnt = cv2.convexHull(cnt)
    ap = cv2.approxPolyDP(cnt, eps * cv2.arcLength(cnt, True), True)[:, 0]
    col = np.median(c[m > 0], axis=0).astype(int)[::-1]
    pts = [[int(p[0] + x0), int(p[1] + y0)] for p in ap]
    res.append({'area': int(st[i, 4]), 'col': '#%02x%02x%02x' % tuple(col), 'pts': pts, 'ap': ap, 'cen': cen[i]})
res.sort(key=lambda r: -r['area'])
for k, r in enumerate(res):
    cv2.polylines(dbg, [r['ap'].astype(np.int32)], True, (0, 255, 0), 1)
    cv2.putText(dbg, str(k), (int(r['cen'][0]) - 5, int(r['cen'][1]) + 4), 0, 0.35, (0, 255, 255), 1)
if '--json' in a: json.dump([{k: v for k, v in r.items() if k in ('area', 'col', 'pts')} for r in res], open(a[a.index('--json') + 1], 'w'))
for k, r in enumerate(res): print(k, r['area'], r['col'], json.dumps(r['pts']))
if '--dbg' in a: cv2.imwrite(a[a.index('--dbg') + 1], cv2.resize(dbg, None, fx=2, fy=2, interpolation=cv2.INTER_NEAREST))
