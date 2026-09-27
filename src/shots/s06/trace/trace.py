#!/usr/bin/env python3
# Stroke tracer for s06 (measurement only; the film never loads this or any image).
# Adapted from src/shots/s12/trace/trace_strokes.py: Hessian ridge measure over several scales, hysteresis threshold,
# skeleton, junction-split paths re-joined when their ends line up, smoothed, RDP-simplified. Each point gets a width
# (ink mass / peak of the cross profile) and the measured values (stroke centre, local ground) — no pixels are kept.
#
# usage: trace.py cfg.json out.json dbg.png
#   cfg: {"src": "neutral.npy", "mode": "dark"|"bright", "box": [x0,y0,x1,y1],
#         "lit": {"blur": 4, "thr": 100, "erode": 2} (dark mode: keep where blurred > thr; bright: where < thr),
#         "include": [[poly]...] (optional), "exclude": [[poly, grow]...], "sigmas": [1.0, 2.2],
#         "hi": 9, "lo": 4.5, "minlen": 9, "dmin": 8, "bgr": 13, "prof": 6}
import cv2, numpy as np, json, sys, os
from skimage.morphology import skeletonize, remove_small_objects
from skimage.filters import apply_hysteresis_threshold
from skimage.feature import hessian_matrix, hessian_matrix_eigvals
from scipy.spatial import cKDTree

cfg = json.load(open(sys.argv[1])); out, dbg = sys.argv[2], sys.argv[3]
base = os.path.dirname(os.path.abspath(sys.argv[1]))
src = cfg['src'] if os.path.isabs(cfg['src']) else os.path.join(base, cfg['src'])
g0 = np.load(src).astype(np.float32) if src.endswith('.npy') else cv2.imread(src, 0).astype(np.float32)
if g0.max() <= 1.01: g0 = g0 * 255
H, W = g0.shape
bright = cfg.get('mode', 'dark') == 'bright'
x0, y0, x1, y1 = cfg.get('box', [0, 0, W, H])
# work on a padded crop for speed
P = 16
cx0, cy0, cx1, cy1 = max(0, x0 - P), max(0, y0 - P), min(W, x1 + P), min(H, y1 + P)
G = g0[cy0:cy1, cx0:cx1].copy()
if bright: G = 255 - G          # bright strokes on dark ground = dark strokes on a light ground
h, w = G.shape
g = cv2.GaussianBlur(G, (0, 0), 1.0)
lit = cfg.get('lit', {'blur': 4, 'thr': 100, 'erode': 2})
MS = G
if cfg.get('mask_src'):
    ms = cfg['mask_src'] if os.path.isabs(cfg['mask_src']) else os.path.join(base, cfg['mask_src'])
    MS = (np.load(ms) if ms.endswith('.npy') else cv2.imread(ms, 0)).astype(np.float32)[cy0:cy1, cx0:cx1]
    if MS.max() <= 1.01: MS = MS * 255
    if bright: MS = 255 - MS
bl = cv2.GaussianBlur(MS, (0, 0), lit['blur'])
m0 = (bl > (255 - lit['thr'] if bright else lit['thr'])).astype(np.uint8)
if lit.get('erode', 0): m0 = cv2.erode(m0, np.ones((2 * lit['erode'] + 1,) * 2, np.uint8))
if cfg.get('lit2'):   # a second test: keep only where the (differently) blurred mask image is below a maximum
    L2 = cfg['lit2']; m0 &= (cv2.GaussianBlur(MS, (0, 0), L2['blur']) < L2['max']).astype(np.uint8)
def poly(pts, grow=0):
    m = np.zeros((h, w), np.uint8)
    cv2.fillPoly(m, [np.array([[p[0] - cx0, p[1] - cy0] for p in pts], np.int32)], 1)
    if grow: m = cv2.dilate(m, np.ones((2 * grow + 1,) * 2, np.uint8))
    return m
box = np.zeros((h, w), np.uint8); box[y0 - cy0:y1 - cy0, x0 - cx0:x1 - cx0] = 1
m0 &= box
if cfg.get('include'):
    inc = np.zeros((h, w), np.uint8)
    for pp in cfg['include']:
        pts, grow = (pp[0], pp[1]) if isinstance(pp[0][0], list) else (pp, 0)
        inc |= poly(pts, grow)
    m0 &= inc
for pp in cfg.get('exclude', []):
    pts, grow = (pp[0], pp[1]) if isinstance(pp[0][0], list) else (pp, 0)
    m0[poly(pts, grow) > 0] = 0
R = cfg.get('bgr', 13)
bgm = cv2.dilate(g, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (R, R))); bgm = cv2.GaussianBlur(bgm, (0, 0), 3)
d = (bgm - g) * (m0 > 0)
ridge = None
for sg in cfg.get('sigmas', [1.0, 2.2]):
    Hm = hessian_matrix(G, sigma=sg, order='rc', use_gaussian_derivatives=True)
    ev = hessian_matrix_eigvals(Hm)
    rr = np.maximum(0, ev[0]) * sg * sg
    ridge = rr if ridge is None else np.maximum(ridge, rr)
ridge[d < cfg.get('dmin', 8)] = 0; ridge[m0 == 0] = 0
m = apply_hysteresis_threshold(ridge, cfg.get('lo', 4.5), cfg.get('hi', 9))
m = remove_small_objects(m, max_size=20)
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
paths = [np.array(Q, float) for Q in paths if len(Q) >= 3]
def endinfo(Q, which):
    if which == 0: p = Q[0]; q = Q[min(len(Q) - 1, 5)]
    else: p = Q[-1]; q = Q[max(0, len(Q) - 6)]
    t = p - q; return p, t / (np.linalg.norm(t) + 1e-9)
E = []
for i, Q in enumerate(paths):
    for wh in (0, 1): p, t = endinfo(Q, wh); E.append((i, wh, p, t))
link = {}
if E:
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
    cand.sort()
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
        Q = paths[i] if wh == 0 else paths[i][::-1]
        parts.append(Q)
        other = 2 * i + (1 - wh)
        if other in link: cur_e = link[other]
        else: break
    chains.append(np.vstack(parts))
for i, Q in enumerate(paths):
    if i not in seen: chains.append(Q)
def rdp(Q, eps):
    if len(Q) < 3: return list(Q)
    a, b = Q[0], Q[-1]; ab = b - a; L = np.linalg.norm(ab) + 1e-9
    dd = np.abs(ab[0] * (Q[1:-1, 1] - a[1]) - ab[1] * (Q[1:-1, 0] - a[0])) / L
    i = int(np.argmax(dd)) + 1
    if dd[i - 1] > eps: return rdp(Q[:i + 1], eps)[:-1] + rdp(Q[i:], eps)
    return [a, b]
res = []
D0 = (bgm - G)
PR = cfg.get('prof', 6)
MINL = cfg.get('minlen', 9)
for Q in chains:
    L = np.sum(np.hypot(*np.diff(Q, axis=0).T))
    if L < MINL: continue
    if len(Q) > 7:
        k = np.ones(7) / 7; A = Q.copy(); A[3:-3, 0] = np.convolve(Q[:, 0], k, 'valid'); A[3:-3, 1] = np.convolve(Q[:, 1], k, 'valid'); Q = A
    S = np.array(rdp(Q, cfg.get('eps', 0.7)))
    row = []
    for k in range(len(S)):
        x, y = S[k]
        t = S[min(len(S) - 1, k + 1)] - S[max(0, k - 1)]; t = t / (np.linalg.norm(t) + 1e-9); nrm = np.array([-t[1], t[0]])
        prof = []
        for o in np.arange(-PR, PR + 0.01, 0.5):
            xi, yi = int(round(x + nrm[0] * o)), int(round(y + nrm[1] * o))
            prof.append(max(0.0, float(D0[yi, xi])) if 0 <= xi < w and 0 <= yi < h else 0.0)
        prof = np.array(prof); c = len(prof) // 2
        pk = prof[c - 3:c + 4].max()
        # walk out while the profile keeps falling (stop at the gap to a neighbouring line) and stays above 15 %
        mono = cfg.get('mono', True)
        lo = c
        while lo > 0 and prof[lo - 1] > 0.15 * pk and (not mono or prof[lo - 1] <= prof[lo] + 0.03 * pk): lo -= 1
        hi = c
        while hi < len(prof) - 1 and prof[hi + 1] > 0.15 * pk and (not mono or prof[hi + 1] <= prof[hi] + 0.03 * pk): hi += 1
        I = prof[lo:hi + 1].sum() * 0.5
        xi, yi = int(round(x)), int(round(y))
        ww = min(I / max(pk, 1), 2 * float(dt[yi, xi]) + 1.5)
        bgv = float(bgm[yi, xi])
        cv = bgv - pk                           # the darkest value of the stroke there (in the working polarity)
        if bright: bgv, cv = 255 - bgv, 255 - cv
        row.append([round(float(x + cx0), 1), round(float(y + cy0), 1), round(max(0.6, ww), 1), round(cv / 255, 3), round(bgv / 255, 3)])
    res.append(row)
json.dump(res, open(out, 'w'))
im = cv2.cvtColor(np.clip(g0, 0, 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)[y0:y1, x0:x1] // 2
for row in res:
    for i in range(1, len(row)):
        cv2.line(im, (int(row[i - 1][0] - x0), int(row[i - 1][1] - y0)), (int(row[i][0] - x0), int(row[i][1] - y0)), (0, 0, 255) if not bright else (0, 255, 255), 1)
cv2.imwrite(dbg, im)
print(len(res), 'strokes', sum(len(r) for r in res), 'points')
