#!/usr/bin/env python3
# feet.py src.png out.json dbg.png — measured talons of pose C: lit outline rings (with the black gaps between the
# toes), the flat mid-grey shading shapes inside them, and the mask the stroke tracer uses. The left foot's toes are
# separate lit islands under the belly; the right foot is cut from the belly along its measured top outline (the
# dark line found per 5 px column at 35.80).
import cv2, numpy as np, json, sys
src, out, dbg = sys.argv[1:4]
g = cv2.imread(src, 0).astype(np.float32); H, W = g.shape
b = cv2.GaussianBlur(g, (0, 0), 1.0)
lit = (b > 80).astype(np.uint8)
feet = np.zeros((H, W), np.uint8)
# left foot: lit islands in the box that are not the belly
x0, y0, x1, y1 = 1140, 830, 1400, 946
n, lab, st, _ = cv2.connectedComponentsWithStats(lit[y0:y1, x0:x1], connectivity=4)
for i in range(1, n):
    if st[i, 1] > 0 and st[i, 4] > 60: feet[y0:y1, x0:x1][lab == i] = 1   # (the belly touches the box top)
# right foot: below its top outline
RTOP = [[1418, 946], [1420, 900], [1428, 890], [1435, 886], [1440, 875], [1445, 869], [1450, 864], [1460, 862], [1470, 866], [1480, 868], [1485, 870],
        [1490, 866], [1500, 860], [1510, 855], [1520, 856], [1525, 858], [1530, 864], [1535, 874], [1540, 882], [1550, 882], [1560, 879], [1570, 879],
        [1575, 883], [1580, 886], [1590, 889], [1600, 892], [1605, 946]]
zr = np.zeros((H, W), np.uint8); cv2.fillPoly(zr, [np.array(RTOP, np.int32)], 1)
feet |= lit & zr
feet = cv2.morphologyEx(feet, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
def rings(m, minA=40, holeA=25, eps=0.8):
    cs, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    R = []
    if hier is None: return R
    for c, hh in zip(cs, hier[0]):
        a = abs(cv2.contourArea(c)); hole = hh[3] >= 0
        if (hole and a < holeA) or (not hole and a < minA): continue
        s = cv2.approxPolyDP(c, eps, True)[:, 0, :]
        if len(s) >= 3: R.append([[int(p[0]), int(p[1])] for p in s])
    return R
lit_r = rings(feet)
mid = ((b < 190) & (feet > 0)).astype(np.uint8)
mid = cv2.morphologyEx(mid, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
mid_r = rings(mid, minA=30, holeA=30, eps=1.0)
json.dump({'lit': lit_r, 'mid': mid_r, 'rtop': RTOP}, open(out, 'w'))
im = cv2.cvtColor(g.astype(np.uint8), cv2.COLOR_GRAY2BGR) // 2
for r in lit_r: cv2.polylines(im, [np.array(r, np.int32)], True, (0, 0, 255), 1)
for r in mid_r: cv2.polylines(im, [np.array(r, np.int32)], True, (0, 255, 0), 1)
cv2.imwrite(dbg, cv2.resize(im[820:946, 1140:1640], None, fx=2.5, fy=2.5, interpolation=cv2.INTER_NEAREST))
print('lit', len(lit_r), sum(len(r) for r in lit_r), 'mid', len(mid_r), sum(len(r) for r in mid_r))
