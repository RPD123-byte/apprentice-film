#!/usr/bin/env python3
# outlines_e.py E.png out.json dbg.png — measured silhouette of the in-between head (pose E, frame 912): the lit pixels
# (blur 1, > 70) inside a generous hand polygon round the head, holes filled; simplified rings (control points only).
import cv2, numpy as np, json, sys
g = cv2.imread(sys.argv[1], 0).astype(np.float32); H, W = g.shape
U = (cv2.GaussianBlur(g, (0, 0), 1.0) > 70).astype(np.uint8)
P = np.zeros((H, W), np.uint8)
cv2.fillPoly(P, [np.array([[866, 205], [950, 112], [1060, 72], [1200, 58], [1330, 72], [1392, 52], [1428, 66], [1414, 112], [1432, 180], [1444, 300], [1432, 392],
                           [1400, 462], [1300, 548], [1150, 578], [1000, 556], [906, 486], [872, 380]], np.int32)], 1)
m = U & P
cs, _ = cv2.findContours(m.copy(), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
for c in cs:
    if cv2.contourArea(c) > 2000: cv2.drawContours(m, [c], -1, 1, -1)
m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
cs, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
rings = []
for c, hh in zip(cs, hier[0]):
    if abs(cv2.contourArea(c)) < 60: continue
    s = cv2.approxPolyDP(c, 0.8, True)[:, 0, :]
    rings.append([int(v) for p in s for v in p])
json.dump({'headE': rings}, open(sys.argv[2], 'w'))
im = cv2.cvtColor(g.astype(np.uint8), cv2.COLOR_GRAY2BGR)
for r in rings: cv2.polylines(im, [np.array(r).reshape(-1, 2).astype(np.int32)], True, (0, 0, 255), 1)
cv2.imwrite(sys.argv[3], im[0:620, 780:1520]); print(len(rings), sum(len(r) // 2 for r in rings))
