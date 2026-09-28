#!/usr/bin/env python3
# trace_cup2.py src850.png out.js dbg.jpg   (fix pass 2: the near headphone's METAL as dark ink on light metal)
# The review of fix pass 1 found the metal drawn as white streamlines on black read as wood grain / rope: the source's
# shell, yoke and plate bevel are light metal (pre-finish ~235) crossed by crisp black outlines and grey streaks.
# This measures, on ONE source frame (34.0 s), taken back to pre-finish values (degrade.py), and writes control
# points only (no pixels):
#  - HPX_BASE  [c0, [x, y, sigma, amp]...]: the metal's base tone with the ink removed (grey closing, 9 px), fitted
#              by greedy matching pursuit with round Gaussians (sigma 6 / 12 / 24 px) on a constant c0 (0..1).
#  - HPX_INK   dark ridge centre-lines [x, y, w, v, ...] inside the metal (Hessian ridge at sigma 1.0 and 2.2,
#              hysteresis, skeleton, chains, smoothed, RDP): w = ink mass / peak (px), v = darkest pre-finish value.
#  - HPX_MET   the metal polygon (hand-measured on 4x grid crops): shell + yoke + plate bevel, arm excluded.
import cv2, numpy as np, json, sys
from skimage.morphology import skeletonize, remove_small_objects
from skimage.filters import apply_hysteresis_threshold
from skimage.feature import hessian_matrix, hessian_matrix_eigvals
from degrade import degrade
src, out, dbg = sys.argv[1:4]
g0 = cv2.imread(src, 0).astype(np.float32); H, W = g0.shape
pre = degrade(g0)

def poly_mask(pts, v=1, m=None):
  m = np.zeros((H, W), np.uint8) if m is None else m; cv2.fillPoly(m, [np.array(pts, np.int32)], v); return m

# measured polygons (frame px, 34.0 s): E = the cup's metal + plate outline (as fix pass 1); ARM = the halftone arm
# above the plate (the crescent part of the old HA polygon is now the bevel band, measured separately in hero.js)
E = [[1304,166],[1287,182],[1276,200],[1268,222],[1264,250],[1263,285],[1265,315],[1271,342],[1281,365],[1296,383],[1318,395],[1350,400],[1372,392],[1392,378],[1410,372],[1424,352],[1430,290],[1426,235],[1411,205],[1392,182],[1384,150],[1374,96],[1336,94],[1316,98],[1312,150]]
ARM = [[1335,96],[1377,96],[1381,120],[1384,140],[1387,160],[1390,178],[1396,188],[1403,194],[1392,199],[1376,197],[1360,199],[1348,204],[1338,211],[1336,200],[1339,160],[1336,120]]
PLATE = [1381, 277, 37, 73]          # the lit halftone interior (fix pass 1, re-checked on the 4x overlay)
CRES = [[1395,201],[1410,203],[1415,214],[1419,228],[1424,240],[1427,252],[1429,265],[1429,285],[1426,293],[1422,290],[1421,270],[1419,256],[1415,243],[1410,229],[1405,218],[1399,210],[1393,205]]

# the halftone strip inside the J-hook (the arm's halftone running down between the yoke's white bar and the black
# outline of the U; 7x grid crop of the 34.0 s frame)
STRIP = [[1327,192],[1344,192],[1340,200],[1335,210],[1330,222],[1327,236],[1325,252],[1324,270],[1324,290],[1323,300],[1319,304],[1315,299],[1314,280],[1314,260],[1315,242],[1318,225],[1322,208]]
M = poly_mask(E); poly_mask(ARM, 0, M); poly_mask(CRES, 0, M); poly_mask(STRIP, 0, M)
cv2.ellipse(M, (PLATE[0], PLATE[1]), (PLATE[2] + 1, PLATE[3] + 1), 0, 0, 360, 0, -1)
RINGZ = np.zeros((H, W), np.uint8); cv2.ellipse(RINGZ, (1380, 278), (46, 82), 0, 0, 360, 1, -1)   # the ring is drawn parametrically (hero.js plateRing)
Mi = cv2.erode(M, np.ones((9, 9), np.uint8))

# ---- base tone: remove the ink (grey closing), fit round Gaussians
clo = cv2.morphologyEx(pre, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
clo = cv2.GaussianBlur(clo, (0, 0), 2.0) / 255.0
ys, xs = np.nonzero(Mi)
c0 = float(np.median(clo[ys, xs]))
res = clo - c0; res[Mi == 0] = 0
blobs = []
x0, y0, x1, y1 = xs.min() - 30, ys.min() - 30, xs.max() + 30, ys.max() + 30
yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
msk = Mi[y0:y1, x0:x1].astype(np.float32)
R = res[y0:y1, x0:x1].copy()
for it in range(30):
  best = None
  for sg in (10.0, 20.0, 40.0):
    # correlation of the masked residual with a unit Gaussian: amp = <R,G>/<G,G> over the mask
    num = cv2.GaussianBlur(R * msk, (0, 0), sg); den = cv2.GaussianBlur(msk, (0, 0), sg / np.sqrt(2)) + 1e-6
    sc = num * num / den * cv2.erode(msk, np.ones((5, 5), np.uint8))   # centres inside the metal only
    j = np.unravel_index(np.argmax(sc), sc.shape)
    if best is None or sc[j] * sg > best[0]: best = (sc[j] * sg, sg, j)
  _, sg, (jy, jx) = best
  G = np.exp(-((xx - (x0 + jx)) ** 2 + (yy - (y0 + jy)) ** 2) / (2 * sg * sg)) * msk
  a = float(np.clip((R * G).sum() / ((G * G).sum() + 1e-9), -0.6, 0.6))
  R -= a * G
  blobs.append([int(x0 + jx), int(y0 + jy), sg, round(a, 3)])
fit = c0 + (res[y0:y1, x0:x1] - R)
print('base: c0 %.3f, residual MAE %.4f -> %.4f' % (c0, np.abs(res[y0:y1, x0:x1][msk > 0]).mean(), np.abs(R[msk > 0]).mean()))

# ---- dark ink: ridges at two scales
ridge = None
for sg in (0.8, 1.4, 2.4):
  ev = hessian_matrix_eigvals(hessian_matrix(pre, sigma=sg, order='rc', use_gaussian_derivatives=True))
  rr = np.maximum(0, ev[0]) * sg * sg
  ridge = rr if ridge is None else np.maximum(ridge, rr)
ridge[cv2.erode(M, np.ones((5, 5), np.uint8)) == 0] = 0      # not the metal's own border (the black cup is there)
ridge[RINGZ > 0] = 0
bg = cv2.dilate(pre, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))); bg = cv2.GaussianBlur(bg, (0, 0), 2)
D0 = bg - pre
ridge[D0 < 30] = 0
HI, LO, MINL = float(sys.argv[4]) if len(sys.argv) > 4 else 40, float(sys.argv[5]) if len(sys.argv) > 5 else 18, 6
mk = apply_hysteresis_threshold(ridge, LO, HI); mk = remove_small_objects(mk, max_size=10)
sk = skeletonize(mk).astype(np.uint8)
dt = cv2.distanceTransform(mk.astype(np.uint8), cv2.DIST_L2, 3)
ys, xs = np.nonzero(sk); pts = set(zip(xs.tolist(), ys.tolist()))
nb = lambda p: [(p[0] + dx, p[1] + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if (dx or dy) and (p[0] + dx, p[1] + dy) in pts]
deg = {p: len(nb(p)) for p in pts}; used = set(); paths = []
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
# join ends that line up (as trace_strokes.py)
from scipy.spatial import cKDTree
def endinfo(P, wh):
  p, q = (P[0], P[min(len(P) - 1, 4)]) if wh == 0 else (P[-1], P[max(0, len(P) - 5)])
  t = p - q; return p, t / (np.linalg.norm(t) + 1e-9)
Ei = []
for i, P in enumerate(paths):
  for wh in (0, 1): p, t = endinfo(P, wh); Ei.append((i, wh, p, t))
tree = cKDTree(np.array([e[2] for e in Ei])); cand = []
for a, b in tree.query_pairs(6.0):
  i, wi, pi, ti = Ei[a]; j, wj, pj, tj = Ei[b]
  if i == j or np.dot(ti, -tj) < 0.7: continue
  dv = pj - pi; dist = np.linalg.norm(dv)
  if dist > 1.5 and np.dot(ti, dv / dist) - np.dot(tj, dv / dist) < 1.3: continue
  cand.append((dist - 3 * np.dot(ti, -tj), a, b))
cand.sort(); link = {}
for sc, a, b in cand:
  if a in link or b in link: continue
  link[a] = b; link[b] = a
seen = set(); chains = []
for start in range(len(Ei)):
  i = Ei[start][0]
  if i in seen or start in link: continue
  cur = start; parts = []
  while True:
    i, wh = Ei[cur][0], Ei[cur][1]
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
  if dd[i - 1] > eps: return rdp(P[:i + 1], eps)[:-1] + rdp(P[i:], eps)
  return [a, b]
# the flow of the metal's streaks (structure tensor, sigma 7): grey streak pieces running across it (skeleton
# junction connectors, which read as blotches) are dropped; the black outlines (darker than 0.25) are kept whatever
# their direction (the J-hook's U, the plate ring)
gb = cv2.GaussianBlur(pre, (0, 0), 1.0)
gx = cv2.Sobel(gb, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(gb, cv2.CV_32F, 0, 1, ksize=3)
Ja = cv2.GaussianBlur(gx * gx, (0, 0), 7); Jb = cv2.GaussianBlur(gx * gy, (0, 0), 7); Jc = cv2.GaussianBlur(gy * gy, (0, 0), 7)
FLOW = 0.5 * np.arctan2(2 * Jb, Ja - Jc) + np.pi / 2
pb = cv2.GaussianBlur(pre, (0, 0), 0.7)
def split_flow(P):
  out, cur = [], [P[0]]
  for i in range(1, len(P)):
    t = P[min(len(P) - 1, i + 3)] - P[max(0, i - 4)]; n = np.linalg.norm(t)     # tangent over ~7 px
    if n < 1e-6: continue
    xm, ym = (P[i] + P[i - 1]) / 2; f = FLOW[int(round(ym)), int(round(xm))]
    ok = abs(np.cos(f) * t[0] / n + np.sin(f) * t[1] / n) > 0.77 or pb[int(round(ym)), int(round(xm))] < 0.25 * 255
    if ok: cur.append(P[i])
    else:
      if len(cur) >= 2: out.append(np.array(cur))
      cur = [P[i]]
  if len(cur) >= 2: out.append(np.array(cur))
  return out
chains = [q for P in chains for q in split_flow(P)]
ink = []
for P in chains:
  L = np.sum(np.hypot(*np.diff(P, axis=0).T))
  if L < MINL: continue
  if len(P) > 5:
    k = np.ones(5) / 5; A = P.copy(); A[2:-2, 0] = np.convolve(P[:, 0], k, 'valid'); A[2:-2, 1] = np.convolve(P[:, 1], k, 'valid'); P = A
  S = np.array(rdp(P, 0.5)); row = []
  for k in range(len(S)):
    x, y = S[k]; t = S[min(len(S) - 1, k + 1)] - S[max(0, k - 1)]; t = t / (np.linalg.norm(t) + 1e-9); nr = np.array([-t[1], t[0]])
    prof = []
    for o in np.arange(-6, 6.01, 0.5):
      xi, yi = int(round(x + nr[0] * o)), int(round(y + nr[1] * o)); prof.append(max(0.0, float(D0[yi, xi])))
    prof = np.array(prof); c = len(prof) // 2; pk = prof[c - 3:c + 4].max()
    # width: the run above half the peak (FWHM) — the ink-mass width over-counted grey streaks packed side by side
    lo = c
    while lo > 0 and prof[lo - 1] > 0.5 * pk: lo -= 1
    hi = c
    while hi < len(prof) - 1 and prof[hi + 1] > 0.5 * pk: hi += 1
    w = min((hi - lo + 1) * 0.5, 2 * float(dt[int(round(y)), int(round(x))]) + 1.5)
    vmin = min(float(pb[int(round(y + nr[1] * o)), int(round(x + nr[0] * o))]) for o in (-1, -0.5, 0, 0.5, 1))
    row += [round(float(x), 1), round(float(y), 1), round(max(0.7, w), 2), round(min(1, max(0, vmin / 255)), 3)]
  ink.append(row)
print(len(ink), 'ink lines', sum(len(r) // 4 for r in ink), 'points')

with open(out, 'w') as f:
  f.write('// Measured METAL of the s12 hero\'s near headphone cup (source frame 34.0 s), fix pass 2 — control points only.\n')
  f.write('// Written by trace/trace_cup2.py. hero.js redraws it as light metal (HPX_BASE: c0 + round Gaussians [x, y, sigma, amp],\n')
  f.write('// pre-finish 0..1) crossed by the measured dark ink (HPX_INK: centre-lines [x, y, width px, darkest value, ...]).\n')
  f.write('export const HPX_MET = %s;\n' % json.dumps(E))
  f.write('export const HPX_ARM = %s;\n' % json.dumps(ARM))
  f.write('export const HPX_CRES = %s;\n' % json.dumps(CRES))
  f.write('export const HPX_STRIP = %s;\n' % json.dumps(STRIP))
  f.write('export const HPX_BASE = %s;\n' % json.dumps([round(c0, 3), blobs]))
  f.write('export const HPX_INK = [\n' + ',\n'.join(json.dumps(r) for r in ink) + '\n];\n')

# debug: source | redraw (base + ink) at 3x
xa, ya, xb, yb = 1255, 90, 1440, 425
V = np.full((H, W), 0.0, np.float32); V[y0:y1, x0:x1] = fit
V = V * M
S4 = 4; big = cv2.resize(V[ya:yb, xa:xb], None, fx=S4, fy=S4, interpolation=cv2.INTER_LINEAR)
for r in ink:
  P = np.array(r).reshape(-1, 4)
  for i in range(1, len(P)):
    cv2.line(big, (int((P[i - 1, 0] - xa) * S4), int((P[i - 1, 1] - ya) * S4)), (int((P[i, 0] - xa) * S4), int((P[i, 1] - ya) * S4)), float(P[i, 3]), max(1, int(round(P[i, 2] * S4))), cv2.LINE_AA)
big = cv2.resize(big, (xb - xa, yb - ya), interpolation=cv2.INTER_AREA)
vis = np.hstack([pre[ya:yb, xa:xb].astype(np.uint8), (np.clip(big, 0, 1) * 255).astype(np.uint8)])
cv2.imwrite(dbg, cv2.resize(vis, None, fx=2.5, fy=2.5, interpolation=cv2.INTER_NEAREST))
