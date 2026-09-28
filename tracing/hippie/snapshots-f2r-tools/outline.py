# Sparse outline of a colour region (measurement): pixels matching a colour predicate inside a box/poly, cleaned,
# largest component, contour simplified to <= N control points (for smooth splines).
# Usage: outline.py "pred" x0,y0,x1,y1 N [--open k] [--close k] [--dbg out.png] [--all]
#   pred: python expression in r,g,b,h,s,v (pre-grade 0..255, h 0..360) e.g. "r>190 and g>150 and b>120 and r-b>40"
import sys, cv2, numpy as np
a = sys.argv
pred = a[1]; x0, y0, x1, y1 = [int(v) for v in a[2].split(',')]; N = int(a[3])
opt = lambda k, d: type(d)(a[a.index(k) + 1]) if k in a else d
im = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/f2r-meas/page-pre.png')[y0:y1, x0:x1].astype(np.int32)
hsv = cv2.cvtColor(im.astype(np.uint8), cv2.COLOR_BGR2HSV).astype(np.int32)
b, g, r = im[..., 0], im[..., 1], im[..., 2]; h, s, v = hsv[..., 0] * 2, hsv[..., 1], hsv[..., 2]
def ev(e):
    ors = [o.strip() for o in e.split(' or ')]
    return np.logical_or.reduce([np.logical_and.reduce([eval(t, {}, dict(r=r, g=g, b=b, h=h, s=s, v=v)) for t in o.split(' and ')] + [np.ones_like(r, bool)]) for o in ors])
M = ev(pred).astype(np.uint8)
k = opt('--close', 3)
if k: M = cv2.morphologyEx(M, cv2.MORPH_CLOSE, np.ones((k, k), np.uint8))
k = opt('--open', 3)
if k: M = cv2.morphologyEx(M, cv2.MORPH_OPEN, np.ones((k, k), np.uint8))
n, lb, st, cen = cv2.connectedComponentsWithStats(M)
order = np.argsort(-st[1:, 4]) + 1
comps = order[:opt('--k', 1)]
dbg = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/f2r-meas/page-graded.png')[y0:y1, x0:x1].copy()
for ci in comps:
    m = (lb == ci).astype(np.uint8)
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    c = max(cs, key=cv2.contourArea)
    peri = cv2.arcLength(c, True)
    for e in np.linspace(0.002, 0.08, 200):
        ap = cv2.approxPolyDP(c, e * peri, True)
        if len(ap) <= N: break
    pts = [[int(p[0][0] + x0), int(p[0][1] + y0)] for p in ap]
    print(f"// area {st[ci, 4]}  n={len(pts)}")
    print(str(pts).replace(' ', ''))
    cv2.polylines(dbg, [ap], True, (0, 255, 0), 1)
    for p in ap: cv2.circle(dbg, tuple(p[0]), 2, (0, 0, 255), -1)
if '--dbg' in a: cv2.imwrite(a[a.index('--dbg') + 1], cv2.resize(dbg, None, fx=2, fy=2, interpolation=cv2.INTER_NEAREST))
