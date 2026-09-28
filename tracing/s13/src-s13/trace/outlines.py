#!/usr/bin/env python3
# outlines.py src.png geo.json out.json dbg.png feet.json — measured part silhouettes for pose C.
# The lit region of the source (blur 1 px, > THR) is split between the rig's parts: each part keeps the lit pixels of
# its hand-fitted polygon (so internal boundaries stay where the rig needs them) plus the unclaimed lit pixels nearest
# to it (within GROW px). Outer contour + real black gaps (holes) are written as simplified rings (frame px, even-odd).
import cv2, numpy as np, json, sys
src, geo, out, dbg = sys.argv[1:5]
THR, GROW, EPS = 70, 40, 0.8
g = cv2.imread(src, 0).astype(np.float32); H, W = g.shape
U = (cv2.GaussianBlur(g, (0, 0), 1.0) > THR).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(U)
keep = np.zeros_like(U)
for i in range(1, n):
    x, y, w, h, a = st[i]
    if a > 25 and x > 700: keep[lab == i] = 1
U = keep
G = json.load(open(geo))
order = ['head', 'wing', 'body', 'tail', 'nub']
P = {}
for k in order:
    m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [np.array(G[k][0], np.int32)], 1); P[k] = m
# zones handled by other drawings: feet, cup/band (never grown into)
zone = np.zeros((H, W), np.uint8)
# the measured talons (feet.py output, argv[5]) are their own drawing
F = json.load(open(sys.argv[5]))
for r in F['lit']: cv2.fillPoly(zone, [np.array(r, np.int32)], 1)
zone = cv2.dilate(zone, np.ones((3, 3), np.uint8))
U &= 1 - zone
for r in G['cush'] + G['shell']: cv2.fillPoly(zone, [np.array(r, np.int32)], 1)
cv2.rectangle(zone, (1380, 0), (1600, 110), 1, -1)
claimed = np.zeros((H, W), np.uint8)
for k in order: claimed |= P[k]
gap = U & (1 - claimed) & (1 - zone)
dist = np.stack([cv2.distanceTransform((1 - P[k]).astype(np.uint8), cv2.DIST_L2, 5) for k in order])
near = np.argmin(dist, 0); dmin = np.min(dist, 0)
res = {}; dbgim = cv2.cvtColor((U * 60).astype(np.uint8), cv2.COLOR_GRAY2BGR)
cols = {'head': (0, 0, 255), 'wing': (255, 0, 0), 'body': (0, 255, 0), 'tail': (0, 255, 255), 'nub': (255, 0, 255)}
for i, k in enumerate(order):
    fill_holes = k == 'head'
    base = P[k] & U
    if k == 'head':
        # the head's own dark features (eyes, beak, cup, drop, bandage) are drawn on top: its fill has no holes there
        base = P[k].copy()
        base &= (U | (cv2.erode(P[k], np.ones((25, 25), np.uint8))))
    m = base | (gap & (near == i) & (dmin < GROW)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    cs, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    rings = []
    for c, hh in zip(cs, hier[0]):
        a = abs(cv2.contourArea(c)); hole = hh[3] >= 0
        if hole and (fill_holes or a < 40): continue
        if not hole and a < 60: continue
        s = cv2.approxPolyDP(c, EPS, True)[:, 0, :]
        if len(s) < 3: continue
        rings.append([[int(p[0]), int(p[1])] for p in s])
        cv2.polylines(dbgim, [s.reshape(-1, 1, 2)], True, cols[k], 1)
    res[k] = rings
    print(k, len(rings), 'rings', sum(len(r) for r in rings), 'pts')
json.dump(res, open(out, 'w')); cv2.imwrite(dbg, dbgim)
