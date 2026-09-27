#!/usr/bin/env python3
# trace_room.py src40.png fills.json out.json dbg.png [HI LO MINLEN]
# Measurement script for the s14 room (not loaded by the film). Reads ONE source frame (40.00 s, the R40 framing)
# and writes control points only: centre lines of the dark ink strokes (x, y, width, darkness ratio), split by the
# layer of the room plate they lie on. No pixels are stored.
#   ridge: Hessian ridge measure at sigma 1.2 and 2.2 on the log image (so the frame's vignette, which is
#   multiplicative, does not matter), hysteresis threshold, skeleton, junction-split paths re-joined when their ends
#   line up, smoothed, RDP-simplified; width = ink mass / peak of the perpendicular darkness profile; darkness =
#   1 - ink / local background (a multiplicative ratio, drawn as black at that alpha).
#   The owl (and a margin round it) is masked out.
import cv2, numpy as np, json, sys
from skimage.morphology import skeletonize, remove_small_objects
from skimage.filters import apply_hysteresis_threshold
from skimage.feature import hessian_matrix, hessian_matrix_eigvals
from scipy.spatial import cKDTree
src, fills, out, dbg = sys.argv[1:5]
HI = float(sys.argv[5]) if len(sys.argv) > 5 else 0.5
LO = float(sys.argv[6]) if len(sys.argv) > 6 else 0.25
MINL = float(sys.argv[7]) if len(sys.argv) > 7 else 22
g0 = cv2.imread(src, 0).astype(np.float32); H, W = g0.shape
L0 = np.log(g0 + 6.0)
ridge = None
for sg in (1.2, 2.2):
    Hm = hessian_matrix(L0, sigma=sg, order='rc', use_gaussian_derivatives=True)
    ev = hessian_matrix_eigvals(Hm)
    rr = np.maximum(0, ev[0]) * sg * sg
    ridge = rr if ridge is None else np.maximum(ridge, rr)
g = cv2.GaussianBlur(g0, (0, 0), 1.0)
bg = cv2.dilate(g, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13))); bg = cv2.GaussianBlur(bg, (0, 0), 3)
ratio = 1 - (g + 2) / (bg + 2)
# owl mask (40.00: the bright bird round (1041, 623..880)) and the frame's black borders
owl = (cv2.GaussianBlur(g0, (0, 0), 3) > 200).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(owl)
om = np.zeros_like(owl)
for i in range(1, n):
    x, y, w, h, a = st[i]
    if a > 5000 and 850 < x + w / 2 < 1250 and y > 550: om[lab == i] = 1
om = cv2.dilate(om, np.ones((31, 31), np.uint8))
om[815:905, 985:1135] = 1        # the owl's feet and their shadow
ridge[om > 0] = 0
ridge[bg < 14] = 0            # too dark to read a line (the black corridor, the vignetted corners)
ridge[ratio < 0.22] = 0
m = apply_hysteresis_threshold(ridge, LO, HI)
m = remove_small_objects(m, 25)
sk = skeletonize(m).astype(np.uint8)
dt = cv2.distanceTransform(m.astype(np.uint8), cv2.DIST_L2, 3)
ys, xs = np.nonzero(sk); pts = set(zip(xs.tolist(), ys.tolist()))
nb = lambda p: [(p[0] + dx, p[1] + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if (dx or dy) and (p[0] + dx, p[1] + dy) in pts]
deg = {p: len(nb(p)) for p in pts}
used = set(); paths = []
def walkp(p0, p1):
    path = [p0, p1]; used.add((p0, p1)); used.add((p1, p0))
    while True:
        cur = path[-1]
        if deg[cur] != 2: break
        nx = [q for q in nb(cur) if q != path[-2] and (cur, q) not in used]
        if not nx: break
        q = nx[0]; used.add((cur, q)); used.add((q, cur)); path.append(q)
    return path
for p in sorted(pts):
    if deg[p] != 2:
        for q in nb(p):
            if (p, q) not in used: paths.append(walkp(p, q))
for p in sorted(pts):
    for q in nb(p):
        if (p, q) not in used: paths.append(walkp(p, q))
paths = [np.array(P, float) for P in paths if len(P) >= 3]
def endinfo(P, which):
    if which == 0: p = P[0]; q = P[min(len(P) - 1, 5)]
    else: p = P[-1]; q = P[max(0, len(P) - 6)]
    t = p - q; return p, t / (np.linalg.norm(t) + 1e-9)
E = []
for i, P in enumerate(paths):
    for wh in (0, 1): p, t = endinfo(P, wh); E.append((i, wh, p, t))
tree = cKDTree(np.array([e[2] for e in E]))
cand = []
for a, b in tree.query_pairs(9.0):
    i, wi, pi, ti = E[a]; j, wj, pj, tj = E[b]
    if i == j: continue
    dv = pj - pi; dist = np.linalg.norm(dv)
    if np.dot(ti, -tj) < 0.75: continue
    if dist > 1.5:
        u = dv / dist
        if np.dot(ti, u) + (-np.dot(tj, u)) < 1.3: continue
    cand.append((dist - 3 * np.dot(ti, -tj), a, b))
cand.sort(); link = {}
for sc, a, b in cand:
    if a in link or b in link: continue
    link[a] = b; link[b] = a
seen = set(); chains = []
for start in range(len(E)):
    i, wh = E[start][0], E[start][1]
    if i in seen or start in link: continue
    cur_e = start; parts = []
    while True:
        i, wh = E[cur_e][0], E[cur_e][1]
        if i in seen: break
        seen.add(i)
        P = paths[i] if wh == 0 else paths[i][::-1]
        parts.append(P)
        other = 2 * i + (1 - wh)
        if other in link: cur_e = link[other]
        else: break
    chains.append(np.vstack(parts))
for i, P in enumerate(paths):
    if i not in seen: chains.append(P)
def rdp(P, eps):
    if len(P) < 3: return list(P)
    a, b = P[0], P[-1]; ab = b - a; Ln = np.linalg.norm(ab) + 1e-9
    dd = np.abs(ab[0] * (P[1:-1, 1] - a[1]) - ab[1] * (P[1:-1, 0] - a[0])) / Ln
    i = int(np.argmax(dd)) + 1
    if dd[i - 1] > eps: return rdp(P[:i + 1], eps)[:-1] + rdp(P[i:], eps)
    return [a, b]
# layer map (R40): the topmost room layer covering each pixel, from the recorded fill polygons
F = json.load(open(fills)); order = [L['name'] for L in F['layers']]
lm = np.zeros((H, W), np.int32)                       # 0 = back
lm[650:, :] = order.index('floor')
for f in sorted(F['fills'], key=lambda f: (order.index(f['layer']), f['idx'])):
    k = order.index(f['layer'])
    if k == 0: continue
    polys = [np.round(np.array(s) * 4).astype(np.int32) for s in f['subs']]
    if polys: cv2.fillPoly(lm, polys, k, shift=2)
res = {n: [] for n in order}
D0 = bg - g0
for P in chains:
    Ln = np.sum(np.hypot(*np.diff(P, axis=0).T))
    if Ln < MINL: continue
    if len(P) > 7:
        k = np.ones(7) / 7; A = P.copy(); A[3:-3, 0] = np.convolve(P[:, 0], k, 'valid'); A[3:-3, 1] = np.convolve(P[:, 1], k, 'valid'); P = A
    S = np.array(rdp(P, 0.8))
    row = []
    for k in range(len(S)):
        x, y = S[k]
        t = S[min(len(S) - 1, k + 1)] - S[max(0, k - 1)]; t = t / (np.linalg.norm(t) + 1e-9); nr = np.array([-t[1], t[0]])
        prof = []
        for o in np.arange(-7, 7.01, 0.5):
            xi, yi = int(round(x + nr[0] * o)), int(round(y + nr[1] * o))
            prof.append(max(0.0, float(D0[yi, xi])) if 0 <= xi < W and 0 <= yi < H else 0.0)
        prof = np.array(prof); c = len(prof) // 2
        pk = prof[c - 3:c + 4].max()
        lo = c
        while lo > 0 and prof[lo - 1] > 0.15 * pk: lo -= 1
        hi = c
        while hi < len(prof) - 1 and prof[hi + 1] > 0.15 * pk: hi += 1
        I = prof[lo:hi + 1].sum() * 0.5
        xi, yi = int(round(x)), int(round(y))
        w = min(I / max(pk, 1), 2 * float(dt[yi, xi]) + 1.5)
        b = float(bg[yi, xi]); v = min(1.0, max(0.0, pk / (b + 2)))
        row.append([round(float(x), 1), round(float(y), 1), round(max(0.7, w), 1), round(v, 2), int(lm[yi, xi])])
    # split the stroke where it crosses from one layer to another (each part rides on its own layer)
    cur = [row[0]]
    for q in row[1:]:
        if q[4] != cur[-1][4]:
            if len(cur) >= 2: res[order[cur[-1][4]]].append([p[:4] for p in cur])
            cur = [cur[-1][:4] + [q[4]], q]
        else: cur.append(q)
    if len(cur) >= 2: res[order[cur[-1][4]]].append([p[:4] for p in cur])
json.dump(res, open(out, 'w'))
im = cv2.cvtColor(g0.astype(np.uint8), cv2.COLOR_GRAY2BGR) // 3
cols = [(90, 90, 90), (255, 0, 255), (0, 255, 255), (0, 0, 255), (0, 255, 0), (255, 0, 0), (255, 255, 0), (0, 128, 255), (255, 128, 0)]
for L, rows in res.items():
    for row in rows:
        for i in range(1, len(row)):
            cv2.line(im, (int(row[i - 1][0]), int(row[i - 1][1])), (int(row[i][0]), int(row[i][1])), cols[order.index(L) % len(cols)], max(1, int(round(row[i][2] * 0.6))))
cv2.imwrite(dbg, im)
print({L: len(r) for L, r in res.items()}, 'strokes;', sum(len(s) for r in res.values() for s in r), 'points')
