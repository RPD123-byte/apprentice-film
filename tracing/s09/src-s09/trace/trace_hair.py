#!/usr/bin/env python3
# Trace the bright hair flicks of s09 (source frames 815-818, the head is static there) as centre lines.
# Output: JS array [value 0-255 (post-grade peak), width px, [[x,y],...]] -- positions and widths only, no pixels.
# usage: trace_hair.py SRC_DIR out.js [debug.png]
import cv2, numpy as np, sys, json
from skimage.morphology import skeletonize, remove_small_objects
from skimage.filters import apply_hysteresis_threshold
from skimage.feature import hessian_matrix, hessian_matrix_eigvals
src, out = sys.argv[1], sys.argv[2]
dbg = sys.argv[3] if len(sys.argv) > 3 else None
fr = [cv2.imread(f'{src}/f{n:04d}.png', 0).astype(np.float32) for n in (815, 816, 817, 818)]
g0 = np.mean(fr, axis=0)
H, W = g0.shape
# region: the hair mass (below the cuff, left of the slab), not the pale cheek, not the slab
reg = np.zeros((H, W), np.uint8)
HAIR = [[-40,564],[0,563],[40,561],[100,556],[140,552],[200,543],[260,536],[300,532],[340,527],[400,519],[428,512],[470,512],[560,516],[650,524],[720,545],[790,600],[805,700],[770,722],[745,745],[700,800],[640,870],[560,946],[-40,946]]
cv2.fillPoly(reg, [np.array(HAIR, np.int32)], 1)
blur = cv2.GaussianBlur(g0, (0, 0), 6)
pale = (blur > 95).astype(np.uint8)          # cheek, slab: big pale areas
pale = cv2.dilate(pale, np.ones((7, 7), np.uint8))
reg[pale > 0] = 0
reg[:, 800:] = 0
ridge = None
for sg in (0.9, 1.4, 2.2):
    Hm = hessian_matrix(g0, sigma=sg, order='rc', use_gaussian_derivatives=True)
    ev = hessian_matrix_eigvals(Hm)
    rr = np.maximum(0, -ev[1]) * sg * sg
    ridge = rr if ridge is None else np.maximum(ridge, rr)
ridge[reg == 0] = 0
HI, LO = 14.0, 6.0
m = apply_hysteresis_threshold(ridge, LO, HI)
m = remove_small_objects(m, 12)
sk = skeletonize(m).astype(np.uint8)
ys, xs = np.nonzero(sk); pts = set(zip(xs.tolist(), ys.tolist()))
nb = lambda p: [(p[0]+dx, p[1]+dy) for dx in (-1,0,1) for dy in (-1,0,1) if (dx or dy) and (p[0]+dx, p[1]+dy) in pts]
deg = {p: len(nb(p)) for p in pts}
used = set(); paths = []
def walk(p0, p1):
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
            if (p, q) not in used: paths.append(walk(p, q))
for p in sorted(pts):
    for q in nb(p):
        if (p, q) not in used: paths.append(walk(p, q))
paths = [np.array(P, float) for P in paths if len(P) >= 4]
# join ends that line up (gap <= 8 px, directions agree)
def endinfo(P, wh):
    if wh == 0: p, q = P[0], P[min(len(P)-1, 5)]
    else: p, q = P[-1], P[max(0, len(P)-6)]
    t = p - q; return p, t / (np.linalg.norm(t) + 1e-9)
from scipy.spatial import cKDTree
E = []
for i, P in enumerate(paths):
    for wh in (0, 1): p, t = endinfo(P, wh); E.append((i, wh, p, t))
tree = cKDTree(np.array([e[2] for e in E]))
cand = []
for a, b in tree.query_pairs(8.0):
    i, wi, pi, ti = E[a]; j, wj, pj, tj = E[b]
    if i == j: continue
    dv = pj - pi; dist = np.linalg.norm(dv)
    if np.dot(ti, -tj) < 0.8: continue
    if dist > 1.5:
        u = dv / dist
        if np.dot(ti, u) - np.dot(tj, u) < 1.4: continue
    cand.append((dist - 3 * np.dot(ti, -tj), a, b))
cand.sort(); link = {}
for sc, a, b in cand:
    if a in link or b in link: continue
    link[a] = b; link[b] = a
seen = set(); chains = []
for start in range(len(E)):
    i = E[start][0]
    if i in seen or start in link: continue
    cur = start; parts = []
    while True:
        i, wh = E[cur][0], E[cur][1]
        if i in seen: break
        seen.add(i); parts.append(paths[i] if wh == 0 else paths[i][::-1])
        other = 2 * i + (1 - wh)
        if other in link: cur = link[other]
        else: break
    chains.append(np.vstack(parts))
for i, P in enumerate(paths):
    if i not in seen: chains.append(P)
def rdp(P, eps):
    if len(P) < 3: return list(P)
    a, b = P[0], P[-1]; ab = b - a; L = np.linalg.norm(ab) + 1e-9
    dd = np.abs(ab[0] * (P[1:-1, 1] - a[1]) - ab[1] * (P[1:-1, 0] - a[0])) / L
    i = int(np.argmax(dd)) + 1
    if dd[i-1] > eps: return rdp(P[:i+1], eps)[:-1] + rdp(P[i:], eps)
    return [a, b]
bgk = cv2.erode(g0, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)))
res = []
for P in chains:
    L = np.sum(np.hypot(*np.diff(P, axis=0).T))
    if L < 12: continue
    if len(P) > 7:
        k = np.ones(5) / 5; A = P.copy(); A[2:-2, 0] = np.convolve(P[:, 0], k, 'valid'); A[2:-2, 1] = np.convolve(P[:, 1], k, 'valid'); P = A
    S = np.array(rdp(P, 0.8))
    # peak brightness and width (area above background / peak) sampled along the path
    vals, wids = [], []
    for k in range(0, len(P), 3):
        x, y = P[k]
        kk = min(len(P) - 1, k + 2); jj = max(0, k - 2)
        t = P[kk] - P[jj]; t = t / (np.linalg.norm(t) + 1e-9); n = np.array([-t[1], t[0]])
        prof = []
        for o in np.arange(-4, 4.01, 0.5):
            xi, yi = int(round(x + n[0] * o)), int(round(y + n[1] * o))
            prof.append(float(g0[yi, xi] - bgk[yi, xi]) if 0 <= xi < W and 0 <= yi < H else 0.0)
        prof = np.array(prof); pk = prof[5:12].max()
        vals.append(float(g0[int(round(y)), int(round(x))]) if pk <= 0 else pk + float(bgk[int(round(y)), int(round(x))]))
        wids.append(max(0.8, min(6.0, prof[prof > 0].sum() * 0.5 / max(pk, 1))))
    v = float(np.percentile(vals, 80)); w = float(np.median(wids))
    if v < 45: continue
    res.append([round(v), round(w, 1), [[round(float(a), 1), round(float(b), 1)] for a, b in S]])
res.sort(key=lambda r: -r[0])
with open(out, 'w') as f:
    f.write('// Bright hair flicks of s09, traced on source frames 815-818 (trace/trace_hair.py): [peak grey 0-255 (post-grade),\n')
    f.write('// width px, centre line in frame px]. Positions and widths only, no pixels.\n')
    f.write('export const FLICKS = [\n' + ',\n'.join('  ' + json.dumps(r, separators=(',', ':')) for r in res) + '\n];\n')
print(len(res), 'flicks')
if dbg:
    c = cv2.cvtColor(np.clip(g0, 0, 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
    for v, w, S in res:
        cv2.polylines(c, [np.array(S, np.int32)], False, (0, 0, 255), 1)
    cv2.imwrite(dbg, c[500:946, 0:820])
