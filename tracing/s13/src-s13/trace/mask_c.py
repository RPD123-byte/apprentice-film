#!/usr/bin/env python3
# mask_c.py geo.json feet.json > maskC.json — keep-out regions for tracing pose C (35.80): the parts drawn separately
import json, sys, numpy as np
G = json.load(open(sys.argv[1]))
def strip(a, b, w, grow):
    a, b = np.array(a, float), np.array(b, float); d = (b - a) / np.linalg.norm(b - a); n = np.array([-d[1], d[0]]); h = w / 2 + grow
    return [list(a - d * grow + n * h), list(b + d * grow + n * h), list(b + d * grow - n * h), list(a - d * grow - n * h)]
def band(pts, w):
    pts = np.array(pts, float); L, R = [], []
    for i in range(len(pts)):
        t = pts[min(len(pts) - 1, i + 1)] - pts[max(0, i - 1)]; t /= np.linalg.norm(t); n = np.array([-t[1], t[0]])
        L.append(list(pts[i] + n * w)); R.append(list(pts[i] - n * w))
    return L + R[::-1]
eL, eR = G['EYE_L'], G['EYE_R']
out = [
    [[998, 378], [1078, 384], [1128, 460], [1124, 488], [1052, 522], [1026, 502], [998, 440]],   # beak
    strip([940, 156], [1092, 82], 29, 7), strip([974, 102], [1060, 156], 48, 7),                  # bandage
    [[1294, 238], [1332, 238], [1332, 314], [1294, 314]],                                         # sweat drop
    band([[1088, 74], [1130, 36], [1160, 16], [1190, 2], [1230, -12], [1280, -24], [1330, -6], [1370, 6], [1400, 14], [1432, 30], [1462, 62]], 26),
    band([[1392, -8], [1422, 18], [1444, 40], [1456, 56], [1470, 90]], 26),
    [[1446, 95], [1488, 93], [1491, 122], [1503, 142], [1510, 180], [1519, 203], [1500, 210], [1486, 222], [1480, 250], [1480, 290], [1484, 306], [1462, 306], [1456, 285], [1457, 245], [1464, 210], [1467, 180], [1461, 140], [1452, 118]],
    [[1430, 40], [1500, 40], [1500, 100], [1430, 100]],
]
# the talons (measured rings from feet.py, argv[2]) are traced separately
F = json.load(open(sys.argv[2]))
out += F['lit']
outE = [
    [eL['x'], eL['y'], eL['rx'] * 1.1 + 9, eL['ry'] * 1.1 + 9, eL['rot']],
    [eR['x'], eR['y'], eR['rx'] * 1.06 + 9, eR['ry'] * 1.06 + 9, eR['rot']],
    [1455, 287, 77 + 7, 121 + 7, 0.1], [1488, 290, 72 + 7, 104 + 7, 0.08],
]
print(json.dumps({'out': out, 'outE': outE, 'lit': 110, 'erode': 3}))
