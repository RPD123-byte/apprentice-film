#!/usr/bin/env python3
# trace_shell.py src850.png out.json dbg.jpg [Y0]   (fix pass 3: the near headphone's lower metal shell)
# The review of fix pass 2 found the lower shell (below the J-hook and round the plate's bottom) painted as blotchy
# grey daubs (round Gaussian base blobs of amplitude +-0.6 fitted to the ink itself, plus short chunky ridge pieces):
# the source has long, fine streaks that follow the rim. This measures, on ONE source frame (34.0 s) taken back to
# pre-finish values (degrade.py), and writes control points only (no pixels):
#  - streaks: dark streak centre-lines followed ALONG the measured streak flow (structure tensor): each is seeded at a
#    local minimum across the flow, then stepped 1 px along the flow and re-snapped to the darkest point across it,
#    while the dip is deeper than CMIN; [x, y, w, v, ...] with w = FWHM of the dip (px, measuring blur removed) and
#    v = its core value (0..1); smoothed and resampled every 3 px.
#  - lit: the same for the bright streaks (maxima across the flow) -> light lines over the base
#  - base: the tone between the streaks (the median of a 7 px window, blurred), fitted by greedy matching pursuit with
#    round Gaussians (sigma 8 / 16 / 30, |amp| <= 0.3) on a constant c0 inside the region.
import cv2, numpy as np, json, sys, os
from degrade import degrade
src, out, dbg = sys.argv[1:4]
CUSH = len(sys.argv) > 4 and sys.argv[4] == 'cush'     # the cushion's lit folds instead (see below)
POLY = sys.argv[4][5:] if len(sys.argv) > 4 and sys.argv[4].startswith('poly:') else None   # any region (json polygon)
Y0 = 296 if CUSH or POLY or len(sys.argv) <= 4 else float(sys.argv[4])
g0 = cv2.imread(src, 0).astype(np.float32); H, W = g0.shape
P = degrade(g0) / 255.0

def poly_mask(pts, v=1, m=None):
  m = np.zeros((H, W), np.uint8) if m is None else m; cv2.fillPoly(m, [np.array(pts, np.int32)], v); return m
E = [[1304,166],[1287,182],[1276,200],[1268,222],[1264,250],[1263,285],[1265,315],[1271,342],[1281,365],[1296,383],[1318,395],[1350,400],[1372,392],[1392,378],[1410,372],[1424,352],[1430,290],[1426,235],[1411,205],[1392,182],[1384,150],[1374,96],[1336,94],[1316,98],[1312,150]]
STRIP = [[1327,192],[1344,192],[1340,200],[1335,210],[1330,222],[1327,236],[1325,252],[1324,270],[1324,290],[1323,300],[1319,304],[1315,299],[1314,280],[1314,260],[1315,242],[1318,225],[1322,208]]
M = cv2.dilate(poly_mask(E), np.ones((7, 7), np.uint8)); poly_mask(STRIP, 0, M)   # 3 px past the metal edge: the rim's dark outline
cv2.ellipse(M, (1380, 278), (44, 80), 0, 0, 360, 0, -1)       # plate + its ring (drawn by hero.js plateRing)
M[:int(Y0)] = 0
M[:, 1398:] = 0                                               # right of the plate the cup is black (hero.js)
if CUSH:
  # the leather cushion (geo.js hp.cushion, measured) between the cup's black outer edge and the metal, y 172-352: its
  # lit fold wedges (bright ridges across the flow) and the dark leather between them
  CU = [[1264,162],[1292,160],[1278,220],[1274,290],[1280,350],[1296,410],[1262,396],[1235,336],[1228,272],[1233,214],[1240,203],[1247,190],[1252,178],[1258,169]]
  M = poly_mask(CU); M = cv2.subtract(M, cv2.dilate(poly_mask(E), np.ones((3, 3), np.uint8))); M[:172] = 0; M[352:] = 0
if POLY:
  # generic mode: dark (and lit) lines followed along the flow inside one polygon (fix pass 3: the strokes under the
  # cushion, the crown hairlines, the flank); FLOWSIG = structure-tensor sigma
  M = poly_mask(json.load(open(POLY)))
Mi = cv2.erode(M, np.ones((3, 3), np.uint8))

Ps = cv2.GaussianBlur(P, (0, 0), 0.7)
gb = cv2.GaussianBlur(P, (0, 0), 1.0)
gx = cv2.Sobel(gb, cv2.CV_32F, 1, 0, ksize=3); gy = cv2.Sobel(gb, cv2.CV_32F, 0, 1, ksize=3)
Ja, Jb, Jc = [cv2.GaussianBlur(a, (0, 0), float(os.environ.get('FLOWSIG', 5))) for a in (gx * gx, gx * gy, gy * gy)]
TH = 0.5 * np.arctan2(2 * Jb, Ja - Jc) + np.pi / 2           # streak direction
EX, EY = np.cos(TH), np.sin(TH)

def bil(A, x, y):
  x0, y0 = int(np.floor(x)), int(np.floor(y)); fx, fy = x - x0, y - y0
  if x0 < 0 or y0 < 0 or x0 >= W - 1 or y0 >= H - 1: return 0.0
  return float(A[y0, x0] * (1 - fx) * (1 - fy) + A[y0, x0 + 1] * fx * (1 - fy) + A[y0 + 1, x0] * (1 - fx) * fy + A[y0 + 1, x0 + 1] * fx * fy)
def flow(x, y):
  return bil(EX, x, y), bil(EY, x, y)   # (orientation only; renormalised by caller)

KS = np.arange(-5, 5.01, 0.25)
def profile(A, x, y, nx, ny):
  return np.array([bil(A, x + k * nx, y + k * ny) for k in KS])
def dip(A, x, y, nx, ny, sgn):
  """snap across the flow to the extreme within +-1.25 px; contrast, FWHM, core value. sgn=+1 dark, -1 lit"""
  pr = sgn * profile(A, x, y, nx, ny)            # dark: minimum of pr; lit: minimum of -A
  c0 = len(KS) // 2
  win = slice(c0 - 5, c0 + 6)
  k = int(np.argmin(pr[win])) + c0 - 5
  core = pr[k]
  left = pr[max(0, k - 16):k + 1][::-1]; right = pr[k:k + 17]
  mL, mR = left.max(), right.max()
  c = min(mL, mR) - core
  lvl = core + c / 2
  def cross(side):
    for i in range(1, len(side)):
      if side[i] >= lvl: return (i - 1 + (lvl - side[i - 1]) / (side[i] - side[i - 1] + 1e-9)) * 0.25
    return len(side) * 0.25
  w = cross(left) + cross(right)
  # ink mass inside +-2.5 px of the core over the contrast (caps the width of a dark line next to a dark area)
  side = min(mL, mR); lo, hi = max(0, k - 10), min(len(KS), k + 11)
  wm = float(np.clip(side - pr[lo:hi], 0, None).sum() * 0.25 / max(c, 1e-3))
  return KS[k], c, min(w, wm), sgn * core

def trace(sgn, CSEED, CMIN, occ):
  # seeds: local extremes across the flow
  seeds = []
  ys, xs = np.nonzero(Mi)
  for x, y in zip(xs, ys):
    ex, ey = EX[y, x], EY[y, x]; nx, ny = -ey, ex
    v = sgn * Ps[y, x]
    if v > sgn * bil(Ps, x + nx, y + ny) or v > sgn * bil(Ps, x - nx, y - ny): continue
    k, c, w, cv = dip(Ps, x, y, nx, ny, sgn)
    if abs(k) < 0.6 and c > CSEED: seeds.append((c, x + k * nx, y + k * ny))
  seeds.sort(reverse=True)
  lines = []
  for c, sx, sy in seeds:
    if occ[int(round(sy)), int(round(sx))]: continue
    halves = []
    for d0 in (1, -1):
      x, y = sx, sy
      ex, ey = flow(x, y); n = np.hypot(ex, ey) + 1e-9; dx, dy = d0 * ex / n, d0 * ey / n
      pts = []; gap = 0
      for step in range(400):
        ex, ey = flow(x, y); n = np.hypot(ex, ey) + 1e-9; ex, ey = ex / n, ey / n
        if ex * dx + ey * dy < 0: ex, ey = -ex, -ey
        if ex * dx + ey * dy < 0.82: break                         # sharp turn: stop
        dx, dy = ex, ey
        x, y = x + dx, y + dy
        ix, iy = int(round(x)), int(round(y))
        if ix < 0 or iy < 0 or ix >= W or iy >= H or not M[iy, ix]: break
        k, cc, w, v = dip(Ps, x, y, -dy, dx, sgn)
        x, y = x + k * -dy, y + k * dx
        ix, iy = int(round(x)), int(round(y))
        if step > 2 and occ[iy, ix]: break
        if cc < CMIN:
          gap += 1
          if gap > 3: break
        else: gap = 0
        pts.append((x, y, w, v, cc))
      while pts and pts[-1][4] < CMIN: pts.pop()
      halves.append(pts)
    k, cc, w, v = dip(Ps, sx, sy, -flow(sx, sy)[1], flow(sx, sy)[0], sgn)
    L = halves[1][::-1] + [(sx, sy, w, v, cc)] + halves[0]
    if len(L) < 10: continue
    A = np.array(L)
    # smooth (moving average 5) the positions, 7 the width / value
    def sm(a, r):
      if len(a) < 2 * r + 1: return a
      k = np.ones(2 * r + 1) / (2 * r + 1); pad = np.pad(a, r, mode='edge'); return np.convolve(pad, k, 'valid')
    xs_, ys_ = sm(A[:, 0], 2), sm(A[:, 1], 2)
    ws_, vs_ = sm(np.clip(A[:, 2], 0.6, 9), 3), sm(A[:, 3], 3)
    for x, y in zip(xs_, ys_):
      cv2.circle(occ, (int(round(x)), int(round(y))), 1, 1, -1)
    idx = list(range(0, len(xs_), 3))
    if idx[-1] != len(xs_) - 1: idx.append(len(xs_) - 1)
    lines.append([[round(float(xs_[i]), 1), round(float(ys_[i]), 1), round(float(ws_[i]), 2), round(float(vs_[i]), 3)] for i in idx])
  return lines

occ = np.zeros((H, W), np.uint8)
CS, CM = (float(os.environ.get('CSEED', 0.14)), float(os.environ.get('CMIN', 0.07)))
dark = trace(1, CS, CM, occ)
occL = np.zeros((H, W), np.uint8)
lit = trace(-1, CS, CM, occL)
print('dark streaks', len(dark), 'lit', len(lit))

if CUSH or POLY:
  json.dump({'dark': dark, 'lit': lit}, open(out, 'w'))
  if POLY:
    ys_, xs_ = np.nonzero(M); bx0, by0, bx1, by1 = xs_.min() - 8, ys_.min() - 8, xs_.max() + 8, ys_.max() + 8; s = 5
  else: bx0, by0, bx1, by1 = 1220, 165, 1290, 360; s = 6
  im = cv2.cvtColor(cv2.resize((P[by0:by1, bx0:bx1] * 255).astype(np.uint8), None, fx=s, fy=s, interpolation=cv2.INTER_NEAREST), cv2.COLOR_GRAY2BGR)
  im = (im * 0.6).astype(np.uint8)
  for L, col in [(l, (0, 0, 255)) for l in dark] + [(l, (0, 255, 0)) for l in lit]:
    cv2.polylines(im, [np.array([[(p[0] - bx0) * s, (p[1] - by0) * s] for p in L], np.int32)], False, col, 1)
  cv2.imwrite(dbg, im); sys.exit(0)
# base: the tone between the streaks (median 7 px, blur 2), fitted with round Gaussians
med = cv2.medianBlur((P * 255).astype(np.uint8), 7).astype(np.float32) / 255
med = cv2.GaussianBlur(med, (0, 0), 2)
ys, xs = np.nonzero(Mi)
c0 = float(np.median(med[ys, xs]))
x0, y0, x1, y1 = xs.min() - 40, ys.min() - 40, xs.max() + 40, ys.max() + 40
yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)
msk = Mi[y0:y1, x0:x1].astype(np.float32)
R = (med[y0:y1, x0:x1] - c0) * msk; R0 = np.abs(R[msk > 0]).mean()
blobs = []
for it in range(30):
  best = None
  for sg in (8.0, 16.0, 30.0):
    num = cv2.GaussianBlur(R * msk, (0, 0), sg); den = cv2.GaussianBlur(msk, (0, 0), sg / np.sqrt(2)) + 1e-6
    sc = num * num / den * msk
    j = np.unravel_index(np.argmax(sc), sc.shape)
    if best is None or sc[j] * sg > best[0]: best = (sc[j] * sg, sg, j)
  _, sg, (jy, jx) = best
  G = np.exp(-((xx - (x0 + jx)) ** 2 + (yy - (y0 + jy)) ** 2) / (2 * sg * sg)) * msk
  a = float(np.clip((R * G).sum() / ((G * G).sum() + 1e-9), -0.3, 0.3))
  R -= a * G
  blobs.append([int(x0 + jx), int(y0 + jy), sg, round(a, 3)])
print('base c0 %.3f residual %.4f -> %.4f' % (c0, R0, np.abs(R[msk > 0]).mean()))
# optional second step: fit more base blobs to the blurred residual (source - raw render) of the zone
if len(sys.argv) > 5:
  prev = json.load(open(sys.argv[5])); ren = cv2.imread(sys.argv[6], 0).astype(np.float32) / 255
  dark, lit, c0, blobs = prev['dark'], prev['lit'], prev['c0'], prev['base']
  Mz = Mi.copy(); Mz[:, 1392:] = 0
  msk = Mz[y0:y1, x0:x1].astype(np.float32)
  R = (cv2.GaussianBlur(P, (0, 0), 3) - cv2.GaussianBlur(ren, (0, 0), 3))[y0:y1, x0:x1] * msk; R0 = np.abs(R[msk > 0]).mean()
  for it in range(int(sys.argv[7]) if len(sys.argv) > 7 else 16):
    best = None
    for sg in (8.0, 16.0):
      num = cv2.GaussianBlur(R * msk, (0, 0), sg); den = cv2.GaussianBlur(msk, (0, 0), sg / np.sqrt(2)) + 1e-6
      sc = num * num / den * msk
      j = np.unravel_index(np.argmax(sc), sc.shape)
      if best is None or sc[j] * sg > best[0]: best = (sc[j] * sg, sg, j)
    _, sg, (jy, jx) = best
    G = np.exp(-((xx - (x0 + jx)) ** 2 + (yy - (y0 + jy)) ** 2) / (2 * sg * sg)) * msk
    a = float(np.clip((R * G).sum() / ((G * G).sum() + 1e-9), -0.3, 0.3))
    R -= a * G
    blobs.append([int(x0 + jx), int(y0 + jy), sg, round(a, 3)])
  print('refit residual %.4f -> %.4f' % (R0, np.abs(R[msk > 0]).mean()))
json.dump({'y0': Y0, 'c0': round(c0, 3), 'base': blobs, 'dark': dark, 'lit': lit}, open(out, 'w'))

# debug: region crop 4x, dark streaks red, lit green
bx0, by0, bx1, by1 = 1255, int(Y0) - 20, 1440, 410; s = 4
im = cv2.cvtColor(cv2.resize((P[by0:by1, bx0:bx1] * 255).astype(np.uint8), None, fx=s, fy=s, interpolation=cv2.INTER_NEAREST), cv2.COLOR_GRAY2BGR)
im = (im * 0.6).astype(np.uint8)
for L, col in [(l, (0, 0, 255)) for l in dark] + [(l, (0, 255, 0)) for l in lit]:
  pts = np.array([[(p[0] - bx0) * s, (p[1] - by0) * s] for p in L], np.int32)
  cv2.polylines(im, [pts], False, col, 1)
cv2.imwrite(dbg, im)
