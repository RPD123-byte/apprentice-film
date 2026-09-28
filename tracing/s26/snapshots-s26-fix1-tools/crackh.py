#!/usr/bin/env python3
# Beat-A crack web as long straight segments that meet (coordinates only). Crack ridge map as in crackx.py; the
# gap-tolerant probabilistic Hough on its skeleton; collinear merge; every free endpoint extended (<= 16 px) or
# snapped onto the nearest segment so the web is connected; star spokes kept to the star rim.
import cv2, numpy as np, sys, json
from skimage.morphology import skeletonize
sys.path.insert(0, 'snapshots/s26-fix1-tools')
from crackeval import median_A, ridge
g = median_A()
p = cv2.imread('snapshots/s26-fix1-meas/src90.png', 0)
RA = ridge(g).astype(np.float32); RP = ridge(p).astype(np.float32)
page_lines = cv2.dilate((RP > 28).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
crack = ((RA > 42) & (page_lines == 0)).astype(np.uint8) | (RA - RP > 55).astype(np.uint8)
mask = np.zeros_like(crack); mask[130:910, 146:2021] = 1
cv2.ellipse(mask, (1072, 610), (255, 370), 0, 0, 360, 0, -1)
cv2.ellipse(mask, (1060, 330), (190, 150), 0, 0, 360, 0, -1)
for piv, tip, lo, up in [((772, 477), (640, 390), (843, 563), (868, 488)), ((1395, 453), (1522, 364), (1317, 533), (1295, 455))]:
    cv2.line(mask, piv, tip, 0, 40); cv2.line(mask, piv, lo, 0, 30); cv2.line(mask, piv, up, 0, 30)
    cv2.circle(mask, lo, 42, 0, -1); cv2.circle(mask, up, 42, 0, -1); cv2.circle(mask, piv, 20, 0, -1)
STARS = [(645, 391), (1522, 364)]
for c in STARS: cv2.circle(mask, c, 30, 0, -1)
crack &= mask
sk = skeletonize(crack > 0).astype(np.uint8) * 255
L = cv2.HoughLinesP(sk, 1, np.pi / 360, 16, minLineLength=22, maxLineGap=14)
segs = [l[0].astype(float) for l in L]
print('hough', len(segs), file=sys.stderr)
def ang(s): return np.arctan2(s[3] - s[1], s[2] - s[0]) % np.pi
def pdist(p, s):
    a = np.array(s[:2]); b = np.array(s[2:]); d = b - a; t = np.clip(np.dot(p - a, d) / max(1e-9, d @ d), 0, 1)
    return np.linalg.norm(p - (a + t * d)), t
# collinear merge: same angle (<4 deg), close (<3 px perpendicular), overlapping or gap < 12 px
changed = True
while changed:
    changed = False
    segs.sort(key=lambda s: -np.hypot(s[2] - s[0], s[3] - s[1]))
    out = []
    used = [False] * len(segs)
    for i, s in enumerate(segs):
        if used[i]: continue
        a0 = ang(s)
        for j in range(i + 1, len(segs)):
            if used[j]: continue
            t = segs[j]; da = abs(a0 - ang(t)); da = min(da, np.pi - da)
            if da > np.radians(4): continue
            d0, _ = pdist(np.array(t[:2]), [*s[:2], *s[2:]]); d1, _ = pdist(np.array(t[2:]), s)
            # perpendicular distance to the infinite line
            u = np.array([np.cos(a0), np.sin(a0)]); n = np.array([-u[1], u[0]]); o = np.array(s[:2])
            pd = max(abs(n @ (np.array(t[:2]) - o)), abs(n @ (np.array(t[2:]) - o)))
            if pd > 3: continue
            ts = sorted([u @ (np.array(q) - o) for q in (s[:2], s[2:])]); tt = sorted([u @ (np.array(q) - o) for q in (t[:2], t[2:])])
            gap = max(tt[0] - ts[1], ts[0] - tt[1])
            if gap > 12: continue
            lo, hi = min(ts[0], tt[0]), max(ts[1], tt[1])
            s = np.array([*(o + u * lo), *(o + u * hi)]); used[j] = True; changed = True
        out.append(s)
    segs = out
print('merged', len(segs), file=sys.stderr)
segs = [s for s in segs if np.hypot(s[2] - s[0], s[3] - s[1]) >= 18]
# endpoint snapping: extend each free end along its direction up to 16 px to hit another segment
def inter(p, u, s):
    a = np.array(s[:2]); b = np.array(s[2:]); d = b - a
    M = np.array([[u[0], -d[0]], [u[1], -d[1]]])
    if abs(np.linalg.det(M)) < 1e-6: return None
    t, v = np.linalg.solve(M, a - p)
    if 0 <= v <= 1 and 0 < t <= 18: return t
    return None
segs = [np.array(s) for s in segs]
for i, s in enumerate(segs):
    for e in (0, 1):
        p = s[2 * e:2 * e + 2].copy(); q = s[2 - 2 * e:4 - 2 * e]
        u = (p - q) / max(1e-9, np.linalg.norm(p - q))
        # already touching another segment?
        if any(pdist(p, t)[0] < 2.5 for j, t in enumerate(segs) if j != i): continue
        best = None
        for j, t in enumerate(segs):
            if j == i: continue
            tt = inter(p, u, t)
            if tt is not None and (best is None or tt < best): best = tt
        if best is not None: s[2 * e:2 * e + 2] = p + u * best
        else:
            # snap to a nearby star rim
            for c in STARS:
                c = np.array(c, float); dd = np.linalg.norm(p - c)
                if dd < 60: s[2 * e:2 * e + 2] = c + (p - c) / dd * 22
out = [[round(float(v), 1) for v in s] for s in segs]
tot = sum(np.hypot(s[2] - s[0], s[3] - s[1]) for s in out)
print('final', len(out), 'total %.0f' % tot, file=sys.stderr)
json.dump(out, open('snapshots/s26-fix1-meas/cracks_h.json', 'w'))
m = np.zeros((946, 2206), np.uint8)
for s in out: cv2.line(m, (int(s[0]), int(s[1])), (int(s[2]), int(s[3])), 255, 2)
vis = cv2.cvtColor(g, cv2.COLOR_GRAY2BGR) // 2
vis[crack > 0] = (0, 160, 0); vis[m > 0] = (0, 0, 255)
cv2.imwrite('snapshots/s26-fix1-meas/crackh_L.jpg', vis[150:750, 200:1000]); cv2.imwrite('snapshots/s26-fix1-meas/crackh_R.jpg', vis[150:750, 1200:2000])
rid = crack > 0
print("recall %.3f" % (((cv2.dilate(m, np.ones((5, 5))) > 0) & rid).sum() / rid.sum()), file=sys.stderr)
