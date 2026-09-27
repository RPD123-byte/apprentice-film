#!/usr/bin/env python3
# trace_hp.py src.png out.json dbg.png
# Measures the near headphone cup of the s12 hero on ONE source frame (34.0 s) and writes control points only:
#  - "lines": evenly spaced streamlines (Jobard-Lefer) that follow the measured engraving direction of the metal shell,
#    yoke and plate rim (structure tensor of the source), resampled every 3 px, each point [x, y, w] where w is the
#    width of a WHITE line cut into black (scratchboard: w = spacing * local value, value sampled at blur 1.4).
#  - "wedges": outlines of the lit fold wedges of the leather cushion (blur 1.8, threshold 95), simplified.
#  - "dots": the pale stitching/fold dots on the dark cushion outside the wedges (local maxima), [x, y, r, v].
#  - "plate": least-squares quadratic of the plate's halftone tone (blur 4) inside its measured ellipse.
import cv2, numpy as np, json, sys
from degrade import degrade
src, out, dbg = sys.argv[1:4]
g0 = cv2.imread(src, 0).astype(np.float32); H, W = g0.shape

def poly_mask(pts):
  m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [np.array(pts, np.int32)], 1); return m
def ell_mask(cx, cy, rx, ry):
  m = np.zeros((H, W), np.uint8); cv2.ellipse(m, (int(round(cx)), int(round(cy))), (int(round(rx)), int(round(ry))), 0, 0, 360, 1, -1); return m

# measured (grid crops / profiles of the 34.0 s frame)
K = [[1304,166],[1287,182],[1276,200],[1268,222],[1264,250],[1263,285],[1265,315],[1271,342],[1281,365],[1296,383],[1318,395],[1350,400],[1372,392],[1392,378],[1410,372]]
E_POLY = K + [[1424,352],[1433,290],[1427,235],[1411,205],[1392,182],[1384,150],[1374,96],[1336,94],[1316,98],[1312,150]]
HA = [[1336,95],[1382,95],[1388,150],[1394,182],[1410,200],[1422,225],[1429,262],[1431,300],[1427,332],[1419,332],[1421,290],[1416,250],[1402,222],[1385,207],[1365,204],[1350,207],[1340,215],[1333,228],[1328,250],[1326,275],[1326,300],[1322,300],[1321,262],[1326,232],[1336,210],[1340,190],[1342,160],[1340,120]]
PLATE = [1381, 277, 37, 73]          # lit halftone interior
RING = [1381, 277, 45, 82]           # outer edge of the plate's dark rim (top/right)
CUSH = [[1300,160],[1262,170],[1236,200],[1224,250],[1224,300],[1236,350],[1262,392],[1300,412],[1350,418],[1395,398],[1412,388]] + K[::-1]

E = poly_mask(E_POLY); E[poly_mask(HA) & (1 - ell_mask(*RING)) > 0] = 0; E[ell_mask(*PLATE) > 0] = 0

# ---- orientation field (structure tensor), two scales
gb = cv2.GaussianBlur(g0, (0, 0), 1.0)
gx = cv2.Sobel(gb, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(gb, cv2.CV_32F, 0, 1, ksize=3)
def tensor(si):
  a = cv2.GaussianBlur(gx * gx, (0, 0), si); b = cv2.GaussianBlur(gx * gy, (0, 0), si); c = cv2.GaussianBlur(gy * gy, (0, 0), si)
  th = 0.5 * np.arctan2(2 * b, a - c)                     # gradient direction
  tr = a + c; coh = np.sqrt((a - c) ** 2 + 4 * b * b) / (tr + 1e-6)
  return th + np.pi / 2, coh * np.sqrt(tr)                # line direction, strength
t1, s1 = tensor(3.0); t2, s2 = tensor(9.0); t3, s3 = tensor(20.0)
# blend in doubled-angle space
def dbl(t): return np.cos(2 * t), np.sin(2 * t)
w1 = s1 / (s1.max() * 0.08 + 1e-6); w1 = np.clip(w1, 0, 1)
w2 = np.clip(s2 / (s2.max() * 0.05 + 1e-6), 0, 1)
c1, n1 = dbl(t1); c2, n2 = dbl(t2); c3, n3 = dbl(t3)
C = w1 * c1 + (1 - w1) * (w2 * c2 + (1 - w2) * c3); S = w1 * n1 + (1 - w1) * (w2 * n2 + (1 - w2) * n3)
C = cv2.GaussianBlur(C, (0, 0), 1.2); S = cv2.GaussianBlur(S, (0, 0), 1.2)
TH = 0.5 * np.arctan2(S, C)
val = cv2.GaussianBlur(degrade(g0), (0, 0), 1.4) / 255.0     # pre-finish values

def dir_at(x, y):
  xi, yi = int(round(x)), int(round(y))
  t = TH[min(H - 1, max(0, yi)), min(W - 1, max(0, xi))]; return np.cos(t), np.sin(t)
def resample(P, d):
  P = np.array(P); s = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(P, axis=0).T))]); n = max(2, int(s[-1] / d) + 1)
  u = np.linspace(0, s[-1], n); return np.stack([np.interp(u, s, P[:, 0]), np.interp(u, s, P[:, 1])], 1)
from scipy.spatial import cKDTree

def streamlines(M, SEP, TEST, valm, seed, minL=7, STEP=0.5, per=3.0):
  """Evenly spaced streamlines (Jobard-Lefer style) of the measured flow inside mask M; each resampled point gets
  w = local spacing x local value (a white line cut into black)."""
  cell = {}
  def inside(x, y):
    xi, yi = int(round(x)), int(round(y)); return 0 <= xi < W and 0 <= yi < H and M[yi, xi] > 0
  def near(x, y, r):
    cx, cy = int(x // 4), int(y // 4)
    for i in range(cx - 1, cx + 2):
      for j in range(cy - 1, cy + 2):
        for (px, py) in cell.get((i, j), ()):
          if (px - x) ** 2 + (py - y) ** 2 < r * r: return True
    return False
  def trace(x, y, sgn):
    pts = []; dx, dy = dir_at(x, y); dx, dy = dx * sgn, dy * sgn
    for _ in range(1400):
      ex, ey = dir_at(x + dx * STEP * 0.5, y + dy * STEP * 0.5)
      if ex * dx + ey * dy < 0: ex, ey = -ex, -ey
      nx, ny = x + ex * STEP, y + ey * STEP
      if not inside(nx, ny) or near(nx, ny, TEST) or ex * dx + ey * dy < 0.6: break
      x, y, dx, dy = nx, ny, ex, ey; pts.append((x, y))
    return pts
  rs = np.random.RandomState(seed)
  ys, xs = np.nonzero(M); order = rs.permutation(len(xs))
  lines = []
  for idx in order[::2]:
    x, y = float(xs[idx]) + 0.5, float(ys[idx]) + 0.5
    if near(x, y, SEP): continue
    P = trace(x, y, -1)[::-1] + [(x, y)] + trace(x, y, 1)
    L = sum(np.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]) for i in range(1, len(P)))
    if L < minL: continue
    for (px, py) in P: cell.setdefault((int(px // 4), int(py // 4)), []).append((px, py))
    lines.append(P)
  # width: the local line spacing (distance to the neighbouring lines on either side) x the local value, so the dark
  # gaps between the white lines carry the tone (a bright band = white lines almost touching, thin dark engraving between)
  RS = [resample(P, per) for P in lines]
  allp = np.vstack([np.hstack([Q, np.full((len(Q), 1), i)]) for i, Q in enumerate(RS)])
  tree = cKDTree(allp[:, :2])
  res = []
  for li, Q in enumerate(RS):
    row = []
    for k, (x, y) in enumerate(Q):
      a, b = Q[max(0, k - 1)], Q[min(len(Q) - 1, k + 1)]; t = b - a; t = t / (np.linalg.norm(t) + 1e-9); nrm = np.array([-t[1], t[0]])
      side = [2 * SEP, 2 * SEP]
      for j in tree.query_ball_point([x, y], 2 * SEP):
        if int(allp[j, 2]) == li: continue
        d = allp[j, :2] - [x, y]; along = abs(d @ t); across = d @ nrm
        if along > per: continue
        if across > 0.3: side[0] = min(side[0], across)
        elif across < -0.3: side[1] = min(side[1], -across)
      side = [SEP if v >= 2 * SEP else v for v in side]       # no neighbour on that side: the region's edge
      sp = min(2 * SEP, (side[0] + side[1]) / 2)
      v = float(cv2.getRectSubPix(valm, (1, 1), (float(x), float(y)))[0, 0])
      w = sp * min(1.0, max(0.0, (v - 0.06) / 0.84)) ** 0.85
      row.append([round(float(x), 1), round(float(y), 1), round(w, 2)])
    if max(r[2] for r in row) < 0.35: continue
    res.append(row)
  return res

res = streamlines(E, 2.7, 1.35, val, 7)

# ---- cushion: lit fold wedges and pale dots
cm = poly_mask(CUSH)
b18 = cv2.GaussianBlur(g0, (0, 0), 1.3)
m = ((b18 > 112) & (cm > 0)).astype(np.uint8)
cs, hi = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
wedges = []
for c in cs:
  if cv2.contourArea(c) < 6: continue
  a = cv2.approxPolyDP(c, 0.7, True)[:, 0, :]
  if len(a) >= 3: wedges.append([[int(p[0]), int(p[1])] for p in a])
wm = cv2.dilate(m, np.ones((5, 5), np.uint8))
CW = (cv2.dilate(m, np.ones((5, 5), np.uint8)) & cm).astype(np.uint8)
val10 = cv2.GaussianBlur(degrade(g0), (0, 0), 1.0) / 255.0
cush_lines = streamlines(CW, 2.0, 1.0, val10, 11, minL=4, per=2.0)
b08 = cv2.GaussianBlur(g0, (0, 0), 0.8)
mx = cv2.dilate(b08, np.ones((3, 3), np.uint8))
dots = []
ys, xs = np.nonzero((b08 >= mx) & (b08 > 85) & (cm > 0) & (wm == 0) & (cv2.erode(cm, np.ones((5, 5), np.uint8)) > 0))
for x, y in sorted(zip(xs.tolist(), ys.tolist()), key=lambda p: (p[1], p[0])):
  if any((x - d[0]) ** 2 + (y - d[1]) ** 2 < 6 for d in dots): continue
  pk = float(b08[y, x]); area = float(((g0[y - 2:y + 3, x - 2:x + 3]) > 0.5 * (pk + 30)).sum())
  dots.append([int(x), int(y), round(min(2.0, max(0.7, np.sqrt(area / np.pi))), 1), round(min(1, pk / 255), 2)])

# ---- plate tone: quadratic fit of blur-4 value inside the ellipse
pm = ell_mask(PLATE[0], PLATE[1], PLATE[2] - 3, PLATE[3] - 3); b4 = cv2.GaussianBlur(degrade(g0), (0, 0), 4) / 255
ys, xs = np.nonzero(pm); u = (xs - PLATE[0]) / PLATE[2]; v = (ys - PLATE[1]) / PLATE[3]
A = np.stack([np.ones_like(u), u, v, u * u, u * v, v * v], 1); coef = np.linalg.lstsq(A, b4[ys, xs], rcond=None)[0]

json.dump({"lines": res, "cush": cush_lines, "wedges": wedges, "dots": dots, "plate": [round(float(c), 3) for c in coef],
           "E": E_POLY, "HA": HA, "PLATE": PLATE, "RING": RING, "K": K, "CUSH": CUSH}, open(out, "w"))
# debug: redraw the white lines on black (4x canvas) next to the source
x0, y0, x1, y1 = 1215, 90, 1440, 425
S4 = 4; im = np.zeros(((y1 - y0) * S4, (x1 - x0) * S4), np.uint8)
for row in res + cush_lines:
  for i in range(1, len(row)):
    w = (row[i][2] + row[i - 1][2]) / 2
    if w > 0.2: cv2.line(im, (int((row[i - 1][0] - x0) * S4), int((row[i - 1][1] - y0) * S4)), (int((row[i][0] - x0) * S4), int((row[i][1] - y0) * S4)), 235, max(1, int(round(w * S4))), cv2.LINE_AA)
im = cv2.resize(im, (x1 - x0, y1 - y0), interpolation=cv2.INTER_AREA)
vis = np.hstack([g0[y0:y1, x0:x1].astype(np.uint8), im])
cv2.imwrite(dbg, cv2.resize(vis, None, fx=2.5, fy=2.5, interpolation=cv2.INTER_NEAREST))
print(len(cush_lines), "cushion lines;", len(res), "lines", sum(len(r) for r in res), "pts;", len(wedges), "wedges;", len(dots), "dots; plate", coef.round(3))
