#!/usr/bin/env python3
# trace_snap.py src.png t guides.json out.json dbg.jpg
# Fix pass 2: snaps hand-placed guide polylines (read off 5–9x grid crops) onto the dark ink line they follow, on ONE
# source frame taken back to pre-finish values (degrade.py), and measures the line there. Writes control points only:
# {name: [x, y, w, v, ...]} per guide — centre (the darkest point within +-R px along the guide's normal, smoothed),
# width (the run darker than halfway between the local paper and the line's core, px) and the core value (0..1).
# guides.json: {name: {"pts": [[x, y], ...], "R": 5, "closed": false}}
import cv2, numpy as np, json, sys
from degrade import degrade
src, t, gj, out, dbg = sys.argv[1], float(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5]
g0 = cv2.imread(src, 0).astype(np.float32); H, W = g0.shape
pre = cv2.GaussianBlur(degrade(g0, t=t), (0, 0), 0.8)
G = json.load(open(gj))

def samp(x, y):
  return float(cv2.getRectSubPix(pre, (1, 1), (float(x), float(y)))[0, 0])
def resample(P, d, closed=False):
  P = np.array(P, float)
  if closed: P = np.vstack([P, P[:1]])
  s = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(P, axis=0).T))]); n = max(2, int(s[-1] / d) + 1)
  u = np.linspace(0, s[-1], n); return np.stack([np.interp(u, s, P[:, 0]), np.interp(u, s, P[:, 1])], 1)
def normals(P):
  T = np.gradient(P, axis=0); T /= np.linalg.norm(T, axis=1, keepdims=True) + 1e-9
  return np.stack([-T[:, 1], T[:, 0]], 1)
res = {}
for name, spec in G.items():
  R = spec.get('R', 5); closed = spec.get('closed', False)
  P = resample(spec['pts'], 1.5, closed); N = normals(P)
  Q = []
  for p, n in zip(P, N):
    offs = np.arange(-R, R + 0.01, 0.25); v = [samp(*(p + n * o)) for o in offs]
    Q.append(p + n * offs[int(np.argmin(v))])
  Q = np.array(Q)
  k = 7; A = Q.copy()
  for i in range(len(Q)):
    lo, hi = max(0, i - k // 2), min(len(Q), i + k // 2 + 1); A[i] = Q[lo:hi].mean(0)
  if not closed: A[0], A[-1] = Q[0] * 0.5 + A[0] * 0.5, Q[-1] * 0.5 + A[-1] * 0.5
  Q = resample(A, 3.0); N = normals(Q); row = []
  for p, n in zip(Q, N):
    offs = np.arange(-7, 7.01, 0.25); v = np.array([samp(*(p + n * o)) for o in offs])
    c = len(offs) // 2; core = v[c - 4:c + 5].min(); paper = max(np.percentile(v, 90), core + 1)
    half = (core + paper) / 2; ic = c - 4 + int(np.argmin(v[c - 4:c + 5]))
    lo = ic
    while lo > 0 and v[lo - 1] < half: lo -= 1
    hi = ic
    while hi < len(v) - 1 and v[hi + 1] < half: hi += 1
    w = (hi - lo + 1) * 0.25
    row += [round(float(p[0]), 1), round(float(p[1]), 1), round(float(w), 2), round(float(core) / 255, 3)]
  res[name] = row
json.dump(res, open(out, 'w'))
# debug overlay (4x) of the snapped centre-lines on the pre-finish frame
allp = np.array([[r[i], r[i + 1]] for r in res.values() for i in range(0, len(r), 4)])
x0, y0 = allp.min(0).astype(int) - 12; x1, y1 = allp.max(0).astype(int) + 12; z = 5
im = cv2.cvtColor(cv2.resize(pre[y0:y1, x0:x1].astype(np.uint8), None, fx=z, fy=z, interpolation=cv2.INTER_CUBIC), cv2.COLOR_GRAY2BGR)
for name, r in res.items():
  q = np.array(r).reshape(-1, 4)
  for i in range(1, len(q)):
    cv2.line(im, (int((q[i - 1, 0] - x0) * z), int((q[i - 1, 1] - y0) * z)), (int((q[i, 0] - x0) * z), int((q[i, 1] - y0) * z)), (0, 0, 255), 1, cv2.LINE_AA)
  for p in spec_pts if False else []: pass
for name, spec in G.items():
  for p in spec['pts']: cv2.circle(im, (int((p[0] - x0) * z), int((p[1] - y0) * z)), 3, (0, 200, 0), 1)
cv2.imwrite(dbg, im)
for k, r in res.items():
  q = np.array(r).reshape(-1, 4); print('%-10s %3d pts  w %.1f-%.1f (med %.1f)  v %.2f-%.2f (med %.2f)' % (k, len(q), q[:, 2].min(), q[:, 2].max(), np.median(q[:, 2]), q[:, 3].min(), q[:, 3].max(), np.median(q[:, 3])))
