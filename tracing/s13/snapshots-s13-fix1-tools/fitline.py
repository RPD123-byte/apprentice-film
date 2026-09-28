# fitline.py FRAMES "x0,y0,x1,y1[,xm,ym] ; ..." [--viz x0,y0,x1,y1,scale,out.jpg]
# For each hand-picked key line (two end points read off the ink map, optionally a mid point), measure it as a
# quadratic curve: the cheapest path between the ends on the ink map (dark = cheap) is fitted by a quadratic Bezier
# (3 control points), and reported with its median width (px) and its darkest-quartile value (pre-grade).
# Only the 3 control points + width + value are kept.
import sys, heapq, numpy as np, cv2
from common import *
fr = sys.argv[1]
P = cv2.GaussianBlur(srcpre(fr), (0, 0), 0.8); paper = cv2.GaussianBlur(cv2.dilate(P, np.ones((9, 9), np.uint8)), (0, 0), 2)
D = np.clip(paper - P, 0, 1)
ink = D > 0.12; dt = cv2.distanceTransform(ink.astype(np.uint8), cv2.DIST_L2, 3)
def path(a, b):
    x0, y0 = min(a[0], b[0]) - 20, min(a[1], b[1]) - 20; x1, y1 = max(a[0], b[0]) + 20, max(a[1], b[1]) + 20
    x0, y0 = max(0, int(x0)), max(0, int(y0)); x1, y1 = min(2205, int(x1)), min(945, int(y1))
    C = 1.0 / (0.03 + D[y0:y1 + 1, x0:x1 + 1]) ** 2
    H, W = C.shape; dist = np.full((H, W), np.inf); prev = {}
    s = (int(round(a[1])) - y0, int(round(a[0])) - x0); t = (int(round(b[1])) - y0, int(round(b[0])) - x0)
    dist[s] = 0; q = [(0, s)]
    while q:
        dd, u = heapq.heappop(q)
        if u == t: break
        if dd > dist[u]: continue
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if not dx and not dy: continue
                v = (u[0] + dy, u[1] + dx)
                if 0 <= v[0] < H and 0 <= v[1] < W:
                    nd = dd + C[v] * (1.414 if dx and dy else 1)
                    if nd < dist[v]: dist[v] = nd; prev[v] = u; heapq.heappush(q, (nd, v))
    pts = [t]
    while pts[-1] != s and pts[-1] in prev: pts.append(prev[pts[-1]])
    return np.array([(p[1] + x0, p[0] + y0) for p in pts[::-1]], np.float64)
def bez_fit(pts):
    L = np.r_[0, np.cumsum(np.hypot(*np.diff(pts, axis=0).T))]; t = L / L[-1]
    p0, p2 = pts[0], pts[-1]
    # least squares for the middle control point
    b1 = 2 * t * (1 - t); r = pts - np.outer((1 - t) ** 2, p0) - np.outer(t ** 2, p2)
    p1 = (b1[:, None] * r).sum(0) / (b1 ** 2).sum()
    fit = np.outer((1 - t) ** 2, p0) + np.outer(b1, p1) + np.outer(t ** 2, p2)
    return p1, float(np.hypot(*(fit - pts).T).max())
out = []
for spec in sys.argv[2].split(';'):
    v = [float(x) for x in spec.split(',') if x.strip()]
    a, b = v[0:2], v[2:4]
    pts = path(a, b) if len(v) < 6 else np.vstack([path(a, v[4:6])[:-1], path(v[4:6], b)])
    p1, err = bez_fit(pts)
    xi, yi = pts[:, 0].astype(int), pts[:, 1].astype(int)
    w = float(np.median(dt[yi, xi]) * 2); val = float(np.percentile(P[yi, xi], 25))
    out.append((pts[0], p1, pts[-1], w, val))
    print(f'[[{pts[0][0]:.0f}, {pts[0][1]:.0f}], [{p1[0]:.0f}, {p1[1]:.0f}], [{pts[-1][0]:.0f}, {pts[-1][1]:.0f}], {w:.1f}, {val:.2f}],  // fit err {err:.1f}')
if '--viz' in sys.argv:
    x0, y0, x1, y1, sc, fn = sys.argv[sys.argv.index('--viz') + 1].split(','); x0, y0, x1, y1, sc = int(x0), int(y0), int(x1), int(y1), float(sc)
    im = (255 - np.clip(D / 0.5, 0, 1) * 255).astype(np.uint8); c = cv2.cvtColor(cv2.resize(im[y0:y1, x0:x1], None, fx=sc, fy=sc), cv2.COLOR_GRAY2BGR)
    for i, (p0, p1, p2, w, val) in enumerate(out):
        tt = np.linspace(0, 1, 30)[:, None]; B = (1 - tt) ** 2 * p0 + 2 * tt * (1 - tt) * p1 + tt ** 2 * p2
        cv2.polylines(c, [((B - [x0, y0]) * sc).astype(np.int32).reshape(-1, 1, 2)], False, (0, 0, 255), 1)
        cv2.putText(c, str(i), tuple(((p0 - [x0, y0]) * sc).astype(int)), 0, 0.4, (255, 0, 0), 1)
    cv2.imwrite(fn, c)
