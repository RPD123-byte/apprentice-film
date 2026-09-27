#!/usr/bin/env python3
# owlsil.py: the owl + headphones silhouette of s06 (measurement only): the lit owl (neutral mean, ungraded, blurred
# 1.5 px, above 0.3, inside the owl's trace polygon) united with the headphones drawn as hand-placed shapes measured on
# a 2.4x grid crop (band centre-line, slider blocks, ear cups), dilated 2 px. Writes src/shots/s06/data/owlsil.js
# (SIL: outer rings, flat x,y). Used to keep the owl's traced ground / veil from spilling onto the room.
import cv2, numpy as np, os, json
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '../../../..'))
pre = np.load(os.path.join(ROOT, 'snapshots/s06-r2-src/neutral_pre.npy')).astype(np.float32); H, W = pre.shape
INC = [[1505,300],[1515,230],[1545,175],[1600,140],[1680,125],[1760,135],[1815,170],[1848,230],[1855,300],[1850,370],[1830,400],[1835,470],[1840,540],[1815,580],[1760,605],[1690,612],[1600,600],[1560,590],[1535,540],[1530,470],[1515,390],[1502,350]]
inc = np.zeros((H, W), np.uint8); cv2.fillPoly(inc, [np.array(INC, np.int32)], 1)
body = ((cv2.GaussianBlur(pre, (0, 0), 1.5) > 0.3) & (inc > 0)).astype(np.uint8)
body = cv2.morphologyEx(body, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
n, lab, st, _ = cv2.connectedComponentsWithStats(body)
keep = np.zeros_like(body)
for i in range(1, n):
    if st[i, cv2.CC_STAT_AREA] > 800: keep[lab == i] = 1
hp = np.zeros((H, W), np.uint8)
BAND = [[1537, 262], [1545, 215], [1553, 195], [1575, 172], [1594, 160], [1625, 148], [1657, 141], [1698, 138], [1740, 143], [1765, 152], [1782, 164], [1800, 182], [1807, 193], [1823, 218], [1834, 247]]
cv2.polylines(hp, [np.array(BAND, np.int32)], False, 1, 16)
for P in ([[1515, 268], [1521, 252], [1544, 247], [1559, 260], [1562, 297], [1558, 343], [1536, 357], [1519, 344], [1510, 306]],
          [[1786, 256], [1807, 251], [1832, 263], [1843, 297], [1839, 343], [1823, 357], [1798, 353], [1784, 318]],
          [[1538, 202], [1552, 194], [1566, 222], [1552, 232]], [[1795, 196], [1808, 190], [1822, 222], [1808, 234]]):
    cv2.fillPoly(hp, [np.array(P, np.int32)], 1)
sil = cv2.dilate(keep | hp, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
sil = cv2.morphologyEx(sil, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
cs, hier = cv2.findContours(sil, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
rings = []
for c in cs:
    if abs(cv2.contourArea(c)) < 200: continue
    a = cv2.approxPolyDP(c, 0.8, True)[:, 0, :]
    rings.append([int(v) for p in a for v in p])
dbg = cv2.cvtColor((np.clip(pre, 0, 1) * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
for r in rings: cv2.polylines(dbg, [np.array(r, np.int32).reshape(-1, 2)], True, (0, 0, 255), 1)
cv2.imwrite(os.path.join(ROOT, 'snapshots/s06-fix1p-hatch/owlsil.png'), dbg[110:630, 1490:1870])
open(os.path.join(HERE, '../data/owlsil.js'), 'w').write('// s06 owl + headphones silhouette (trace/owlsil.py): measured outline rings (even-odd), flat x,y. No pixels are stored.\nexport const SIL = ' + json.dumps(rings, separators=(',', ':')) + ';\n')
print(len(rings), 'rings', sum(len(r) // 2 for r in rings), 'pts')
