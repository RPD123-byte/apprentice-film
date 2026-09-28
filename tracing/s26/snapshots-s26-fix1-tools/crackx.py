#!/usr/bin/env python3
# Re-measure the beat-A crack web as connected polylines (coordinates only): ridge of the A median (source frames
# 2765..2787) minus the ridge of the uncracked page (source 90.0 s, same placement), owl / scissors / stars masked,
# skeletonised, traced node-to-node, simplified (Douglas-Peucker 1.2 px), short spurs dropped, near endpoints joined.
import cv2, numpy as np, sys, json
from skimage.morphology import skeletonize
sys.path.insert(0, 'snapshots/s26-fix1-tools')
from crackeval import median_A, ridge, load, raster
g = median_A()
p = cv2.imread('snapshots/s26-fix1-meas/src90.png', 0)
RA = ridge(g).astype(np.float32); RP = ridge(p).astype(np.float32)
# crack ridge: bright thin line in A that is not a line of the page
page_lines = cv2.dilate((RP > 28).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
crack = ((RA > 45) & (page_lines == 0)).astype(np.uint8)
# keep also strong A ridges that sit on page lines if they are much brighter than the page there
crack |= ((RA - RP > 60)).astype(np.uint8)
mask = np.zeros_like(crack); mask[130:910, 146:2021] = 1
cv2.ellipse(mask, (1072, 610), (255, 370), 0, 0, 360, 0, -1)       # owl
cv2.ellipse(mask, (1060, 330), (190, 150), 0, 0, 360, 0, -1)       # head + cups
def blade(p0, p1, w):
    cv2.line(mask, tuple(map(int, p0)), tuple(map(int, p1)), 0, w)
for piv, tip, lo, up in [((772, 477), (640, 390), (843, 563), (868, 488)), ((1395, 453), (1522, 364), (1317, 533), (1295, 455))]:
    blade(piv, tip, 46); blade(piv, lo, 30); blade(piv, up, 30)
    cv2.circle(mask, lo, 44, 0, -1); cv2.circle(mask, up, 44, 0, -1); cv2.circle(mask, piv, 22, 0, -1)
for c in [(645, 391), (1522, 364)]: cv2.circle(mask, c, 46, 0, -1)   # the stars themselves are drawn separately
crack &= mask
crack = cv2.morphologyEx(crack, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
n, lab, st, _ = cv2.connectedComponentsWithStats(crack, 8)
keep = np.zeros(n, bool); keep[1:] = st[1:, cv2.CC_STAT_AREA] >= 40
crack = keep[lab].astype(np.uint8)
sk = skeletonize(crack > 0).astype(np.uint8)
H, W = sk.shape
nb = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
ys, xs = np.nonzero(sk)
deg = np.zeros_like(sk, np.int32)
for dy, dx in nb: deg[1:-1, 1:-1] += sk[1 + dy:H - 1 + dy, 1 + dx:W - 1 + dx]
deg *= sk
node = (sk > 0) & (deg != 2)
visited = set()
polys = []
def walk(y, x, py, px):
    pts = [(x, y)]
    while True:
        nxt = None
        for dy, dx in nb:
            yy, xx = y + dy, x + dx
            if (yy, xx) == (py, px) or not sk[yy, xx]: continue
            e = (min((y, x), (yy, xx)), max((y, x), (yy, xx)))
            if e in visited: continue
            nxt = (yy, xx); visited.add(e); break
        if nxt is None: return pts
        py, px, y, x = y, x, nxt[0], nxt[1]
        pts.append((x, y))
        if node[y, x]: return pts
for y, x in zip(*np.nonzero(node)):
    for dy, dx in nb:
        yy, xx = y + dy, x + dx
        if not sk[yy, xx]: continue
        e = (min((y, x), (yy, xx)), max((y, x), (yy, xx)))
        if e in visited: continue
        visited.add(e)
        pts = [(x, y)] + walk(yy, xx, y, x)
        polys.append(pts)
# loops without nodes
out = []
for pts in polys:
    a = np.array(pts, np.float32).reshape(-1, 1, 2)
    L = cv2.arcLength(a, False)
    if L < 14: continue
    s = cv2.approxPolyDP(a, 1.8, False).reshape(-1, 2)
    out.append(s.tolist())
tot = sum(cv2.arcLength(np.array(p, np.float32).reshape(-1, 1, 2), False) for p in out)
print('polylines', len(out), 'total length %.0f' % tot, file=sys.stderr)
json.dump(out, open('snapshots/s26-fix1-meas/cracks_poly.json', 'w'))
# eval
m = np.zeros((946, 2206), np.uint8)
for p in out: cv2.polylines(m, [np.array(p, np.int32)], False, 255, 2)
vis = cv2.cvtColor(g, cv2.COLOR_GRAY2BGR) // 2
vis[crack > 0] = (0, 160, 0); vis[m > 0] = (0, 0, 255)
cv2.imwrite('snapshots/s26-fix1-meas/crackx_L.jpg', vis[150:750, 200:1000]); cv2.imwrite('snapshots/s26-fix1-meas/crackx_R.jpg', vis[150:750, 1200:2000])
cv2.imwrite('snapshots/s26-fix1-meas/crackx_full.jpg', cv2.resize(vis, None, fx=0.6, fy=0.6))

# ---- gap closing: join free endpoints to a compatible free endpoint (<= 18 px, heading within 30 deg) or extend
# them along their heading (<= 16 px) onto another polyline; drop isolated short pieces
P = [np.array(p, float) for p in out]
def heading(p, end):
    if end == 0: a, b = p[0], p[min(1, len(p) - 1)]
    else: a, b = p[-1], p[max(0, len(p) - 2)]
    d = a - b; n = np.linalg.norm(d); return d / n if n > 1e-9 else d
def segdist(q, p):
    best = 1e9
    for i in range(len(p) - 1):
        a, b = p[i], p[i + 1]; d = b - a; t = np.clip(np.dot(q - a, d) / max(1e-9, d @ d), 0, 1)
        best = min(best, np.linalg.norm(q - (a + t * d)))
    return best
ends = []
for i, p in enumerate(P):
    for e in (0, 1):
        q = p[0] if e == 0 else p[-1]
        touching = any(segdist(q, P[j]) < 2.5 for j in range(len(P)) if j != i)
        if not touching: ends.append((i, e))
bridges = []
used = set()
for (i, e) in ends:
    if (i, e) in used: continue
    q = P[i][0] if e == 0 else P[i][-1]; h = heading(P[i], e)
    best = None
    for (j, f) in ends:
        if j == i or (j, f) in used: continue
        r = P[j][0] if f == 0 else P[j][-1]; d = r - q; n = np.linalg.norm(d)
        if n > 18 or n < 1e-6: continue
        if np.dot(d / n, h) < np.cos(np.radians(30)): continue
        hj = heading(P[j], f)
        if np.dot(-d / n, hj) < np.cos(np.radians(40)): continue
        if best is None or n < best[0]: best = (n, j, f, r)
    if best:
        bridges.append([q.tolist(), best[3].tolist()]); used.add((i, e)); used.add((best[1], best[2]))
        continue
    # extend onto another polyline along the heading
    for step in range(2, 17, 2):
        z = q + h * step
        hit = [j for j in range(len(P)) if j != i and segdist(z, P[j]) < 1.8]
        if hit: bridges.append([q.tolist(), z.tolist()]); used.add((i, e)); break
P2 = [p.tolist() for p in P] + bridges
# drop isolated short pieces (length < 22 px and not touching anything)
def plen(p): return sum(np.hypot(p[k + 1][0] - p[k][0], p[k + 1][1] - p[k][1]) for k in range(len(p) - 1))
final = []
for i, p in enumerate(P2):
    if plen(p) >= 22: final.append(p); continue
    a, b = np.array(p[0]), np.array(p[-1])
    if any(segdist(a, np.array(P2[j])) < 2.5 or segdist(b, np.array(P2[j])) < 2.5 for j in range(len(P2)) if j != i): final.append(p)
print('bridges', len(bridges), 'final polylines', len(final), 'total %.0f' % sum(plen(p) for p in final), file=sys.stderr)
json.dump([[[round(v, 1) for v in q] for q in p] for p in final], open('snapshots/s26-fix1-meas/cracks_poly2.json', 'w'))
m = np.zeros((946, 2206), np.uint8)
for p in final: cv2.polylines(m, [np.array(p, np.int32)], False, 255, 2)
vis = cv2.cvtColor(g, cv2.COLOR_GRAY2BGR) // 2
vis[crack > 0] = (0, 160, 0); vis[m > 0] = (0, 0, 255)
cv2.imwrite('snapshots/s26-fix1-meas/crackx2_L.jpg', vis[150:750, 200:1000]); cv2.imwrite('snapshots/s26-fix1-meas/crackx2_R.jpg', vis[150:750, 1200:2000])
