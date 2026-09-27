#!/usr/bin/env python3
# trace_region.py src.png t poly.json HI LO MINLEN out.json dbg.jpg [sigmas] [flowsigma]
# Fix pass 2: dark ink centre-lines inside ONE region of one source frame, in pre-finish values (degrade.py), as
# control points [x, y, w, v, ...]: Hessian ridge (max over sigmas), hysteresis, skeleton, chains joined where their
# ends line up, split where a piece runs across the local stroke flow (structure tensor) — junction connectors of
# the skeleton read as ladders / blotches — smoothed, RDP-simplified; w = FWHM of the darkness profile, v = core.
# poly.json: {"in": [[x, y], ...], "out": [[[x, y], ...], ...]} (optional holes).
import cv2, numpy as np, json, sys
from skimage.morphology import skeletonize, remove_small_objects
from skimage.filters import apply_hysteresis_threshold
from skimage.feature import hessian_matrix, hessian_matrix_eigvals
from scipy.spatial import cKDTree
from degrade import degrade
src, t, pj, HI, LO, MINL, out, dbg = sys.argv[1], float(sys.argv[2]), sys.argv[3], float(sys.argv[4]), float(sys.argv[5]), float(sys.argv[6]), sys.argv[7], sys.argv[8]
SIGS = [float(v) for v in sys.argv[9].split(',')] if len(sys.argv) > 9 else [1.0, 1.8]
FS = float(sys.argv[10]) if len(sys.argv) > 10 else 7.0
LINK = float(sys.argv[11]) if len(sys.argv) > 11 else 8.0      # max gap bridged between aligned ends (px)
g0 = cv2.imread(src, 0).astype(np.float32); H, W = g0.shape
pre = degrade(g0, t=t)
PJ = json.load(open(pj))
M = np.zeros((H, W), np.uint8); cv2.fillPoly(M, [np.array(PJ['in'], np.int32)], 1)
for P in PJ.get('out', []): cv2.fillPoly(M, [np.array(P, np.int32)], 0)
ridge = None
for sg in SIGS:
  ev = hessian_matrix_eigvals(hessian_matrix(pre, sigma=sg, order='rc', use_gaussian_derivatives=True))
  rr = np.maximum(0, ev[0]) * sg * sg; ridge = rr if ridge is None else np.maximum(ridge, rr)
ridge[M == 0] = 0
bg = cv2.GaussianBlur(cv2.dilate(pre, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))), (0, 0), 2)
D0 = bg - pre; ridge[D0 < 25] = 0
mk = remove_small_objects(apply_hysteresis_threshold(ridge, LO, HI), max_size=10)
sk = skeletonize(mk).astype(np.uint8)
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
def endinfo(P, wh):
  p, q = (P[0], P[min(len(P) - 1, 4)]) if wh == 0 else (P[-1], P[max(0, len(P) - 5)])
  tt = p - q; return p, tt / (np.linalg.norm(tt) + 1e-9)
Ei = [(i, wh) + endinfo(P, wh) for i, P in enumerate(paths) for wh in (0, 1)]
tree = cKDTree(np.array([e[2] for e in Ei])); cand = []
for a, b in tree.query_pairs(LINK):
  i, wi, pi, ti = Ei[a]; j, wj, pj2, tj = Ei[b]
  if i == j or np.dot(ti, -tj) < 0.75: continue
  dv = pj2 - pi; dist = np.linalg.norm(dv)
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
gb = cv2.GaussianBlur(pre, (0, 0), 1.0)
gx = cv2.Sobel(gb, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(gb, cv2.CV_32F, 0, 1, ksize=3)
Ja = cv2.GaussianBlur(gx * gx, (0, 0), FS); Jb = cv2.GaussianBlur(gx * gy, (0, 0), FS); Jc = cv2.GaussianBlur(gy * gy, (0, 0), FS)
FLOW = 0.5 * np.arctan2(2 * Jb, Ja - Jc) + np.pi / 2
pb = cv2.GaussianBlur(pre, (0, 0), 0.7)
def split_flow(P):
  outp, cur = [], [P[0]]
  for i in range(1, len(P)):
    tt = P[min(len(P) - 1, i + 3)] - P[max(0, i - 4)]; n = np.linalg.norm(tt)
    if n < 1e-6: continue
    xm, ym = (P[i] + P[i - 1]) / 2; f = FLOW[int(round(ym)), int(round(xm))]
    if abs(np.cos(f) * tt[0] / n + np.sin(f) * tt[1] / n) > 0.77: cur.append(P[i])
    else:
      if len(cur) >= 2: outp.append(np.array(cur))
      cur = [P[i]]
  if len(cur) >= 2: outp.append(np.array(cur))
  return outp
chains = [q for P in chains for q in split_flow(P)]
def rdp(P, eps):
  if len(P) < 3: return list(P)
  a, b = P[0], P[-1]; ab = b - a; L = np.linalg.norm(ab) + 1e-9
  dd = np.abs(ab[0] * (P[1:-1, 1] - a[1]) - ab[1] * (P[1:-1, 0] - a[0])) / L
  i = int(np.argmax(dd)) + 1
  if dd[i - 1] > eps: return rdp(P[:i + 1], eps)[:-1] + rdp(P[i:], eps)
  return [a, b]
ink = []
for P in chains:
  L = np.sum(np.hypot(*np.diff(P, axis=0).T))
  if L < MINL: continue
  if len(P) > 5:
    k = np.ones(5) / 5; A = P.copy(); A[2:-2, 0] = np.convolve(P[:, 0], k, 'valid'); A[2:-2, 1] = np.convolve(P[:, 1], k, 'valid'); P = A
  S = np.array(rdp(P, 0.6)); row = []
  for k in range(len(S)):
    x, y = S[k]; tt = S[min(len(S) - 1, k + 1)] - S[max(0, k - 1)]; tt = tt / (np.linalg.norm(tt) + 1e-9); nr = np.array([-tt[1], tt[0]])
    prof = np.array([max(0.0, float(D0[int(round(y + nr[1] * o)), int(round(x + nr[0] * o))])) for o in np.arange(-6, 6.01, 0.5)])
    c = len(prof) // 2; pk = prof[c - 3:c + 4].max(); lo = c
    while lo > 0 and prof[lo - 1] > 0.5 * pk: lo -= 1
    hi = c
    while hi < len(prof) - 1 and prof[hi + 1] > 0.5 * pk: hi += 1
    w = (hi - lo + 1) * 0.5
    vmin = min(float(pb[int(round(y + nr[1] * o)), int(round(x + nr[0] * o))]) for o in (-1, -0.5, 0, 0.5, 1))
    row += [round(float(x), 1), round(float(y), 1), round(max(0.7, w), 2), round(min(1, max(0, vmin / 255)), 3)]
  ink.append(row)
json.dump(ink, open(out, 'w'))
print(len(ink), 'lines', sum(len(r) // 4 for r in ink), 'points')
ys, xs = np.nonzero(M); x0, y0, x1, y1 = xs.min() - 10, ys.min() - 10, xs.max() + 10, ys.max() + 10; z = 3
im = cv2.cvtColor(cv2.resize(pre[y0:y1, x0:x1].astype(np.uint8), None, fx=z, fy=z, interpolation=cv2.INTER_CUBIC), cv2.COLOR_GRAY2BGR)
for r in ink:
  q = np.array(r).reshape(-1, 4)
  for i in range(1, len(q)): cv2.line(im, (int((q[i - 1, 0] - x0) * z), int((q[i - 1, 1] - y0) * z)), (int((q[i, 0] - x0) * z), int((q[i, 1] - y0) * z)), (0, 0, 255), 1, cv2.LINE_AA)
cv2.imwrite(dbg, im)
