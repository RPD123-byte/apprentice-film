#!/usr/bin/env python3
# trace_cush.py src850.png ../cush.js dbg.jpg [T1 T2 T1_low]   (fix pass 3: the headphone cushion's lit fold wedges)
# The review of fix pass 2 found the cushion's lit folds drawn as soft, swirly, low-contrast curls (white streamlines
# softened with the plumage): the source has crisp white flame-shaped wedges with black leather between them (box
# 1232-1268 x 180-330: fine detail 21 against 14.8, pixels over 180: 20.9% against 13.7%). This measures the wedges on
# ONE source frame (34.0 s) taken back to pre-finish values (degrade.py) and writes control points only (no pixels):
#  - CUSH.levels: [{v, rings}] the outlines of the lit regions at two levels (pre-finish blurred 0.7 px, 4x upsampled
#    for sub-pixel outlines, simplified): above T1 filled with that region's mean tone, above T2 (the bright cores)
#    likewise; rings are closed polygons [x, y, ...] filled even-odd.
import cv2, numpy as np, json, sys
from degrade import degrade
src, out, dbg = sys.argv[1:4]
g0 = cv2.imread(src, 0).astype(np.float32); H, W = g0.shape
P = degrade(g0) / 255.0
CU = [[1264,162],[1292,160],[1278,220],[1274,290],[1280,350],[1296,410],[1262,396],[1235,336],[1228,272],[1233,214],[1240,203],[1247,190],[1252,178],[1258,169]]
E = [[1304,166],[1287,182],[1276,200],[1268,222],[1264,250],[1263,285],[1265,315],[1271,342],[1281,365],[1296,383],[1318,395],[1350,400],[1372,392],[1392,378],[1410,372],[1424,352],[1430,290],[1426,235],[1411,205],[1392,182],[1384,150],[1374,96],[1336,94],[1316,98],[1312,150]]
M = np.zeros((H, W), np.uint8); cv2.fillPoly(M, [np.array(CU, np.int32)], 1)
Em = np.zeros((H, W), np.uint8); cv2.fillPoly(Em, [np.array(E, np.int32)], 1)
M[cv2.dilate(Em, np.ones((3, 3), np.uint8)) > 0] = 0
M[:172] = 0; M[352:] = 0
x0, y0, x1, y1 = 1222, 168, 1285, 356; S = 4
B = cv2.GaussianBlur(P, (0, 0), 0.7)
Bu = cv2.resize(B[y0:y1, x0:x1], None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC)
Mu = cv2.resize(M[y0:y1, x0:x1], None, fx=S, fy=S, interpolation=cv2.INTER_NEAREST)
Pu = cv2.resize(P[y0:y1, x0:x1], None, fx=S, fy=S, interpolation=cv2.INTER_NEAREST)
T1, T2 = float(sys.argv[4]) if len(sys.argv) > 4 else 0.42, float(sys.argv[5]) if len(sys.argv) > 5 else 0.72
levels = []
# below y 295 the folds are thin streaks (lower level there, else they break up)
yyu = (np.arange(Bu.shape[0])[:, None] + 0.5) / S - 0.5 + y0
T1L = float(sys.argv[6]) if len(sys.argv) > 6 else 0.3
for T in (T1, T2):
  Tm = np.where(yyu >= 295, min(T, T1L) if T == T1 else T, T) * np.ones_like(Bu)
  m = ((Bu > Tm) & (Mu > 0)).astype(np.uint8)
  n, lab = cv2.connectedComponents(m)
  regs = []
  for i in range(1, n):
    r = (lab == i).astype(np.uint8)
    if r.sum() < 6 * S * S: continue
    v = float(Pu[r > 0].mean())
    cs, _ = cv2.findContours(r, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    rings = []
    for c in cs:
      if abs(cv2.contourArea(c)) < 3 * S * S: continue
      a = cv2.approxPolyDP(c, 0.35 * S, True)[:, 0, :].astype(np.float32)
      if len(a) < 3: continue
      rings.append([round(float(x0 + (p[0] + 0.5) / S - 0.5), 2) if k == 0 else round(float(y0 + (p[1] + 0.5) / S - 0.5), 2) for p in a for k in (0, 1)])
    if rings: regs.append({'v': round(v, 3), 'rings': rings})
  levels.append({'t': T, 'regs': regs})
  print('level', T, 'regions', len(regs), 'rings', sum(len(r['rings']) for r in regs))
with open(out, 'w') as o:
  o.write("// The s12 hero's headphone cushion (source frame 34.0 s), fix pass 3 — control points only, written by\n"
          "// trace/trace_cush.py: the outlines of the lit fold wedges of the black leather at two levels (pre-finish " + f"{T1} / {T2}),\n"
          "// each region filled with its mean tone; rings [x, y, ...] filled even-odd.\n")
  o.write('export const CUSH = [\n')
  for L in levels:
    o.write('  [\n')
    for r in L['regs']:
      o.write('    { v: %s, rings: [%s] },\n' % (r['v'], ', '.join('[' + ', '.join(str(q) for q in ring) + ']' for ring in r['rings'])))
    o.write('  ],\n')
  o.write('];\n')
im = cv2.cvtColor((np.clip(Pu, 0, 1) * 255 * 0.6).astype(np.uint8), cv2.COLOR_GRAY2BGR)
for L, col in zip(levels, ((0, 255, 0), (0, 0, 255))):
  for r in L['regs']:
    for ring in r['rings']:
      pts = np.array([[(ring[i] - x0 + 0.5) * S - 0.5, (ring[i + 1] - y0 + 0.5) * S - 0.5] for i in range(0, len(ring), 2)], np.int32)
      cv2.polylines(im, [pts], True, col, 1)
cv2.imwrite(dbg, cv2.resize(im, None, fx=1.5, fy=1.5))
