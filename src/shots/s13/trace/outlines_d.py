#!/usr/bin/env python3
# outlines_d.py D.png geo.json silC.json out.json dbg.png — measured silhouette of the front head (pose D): the lit
# pixels of the front-head polygon, plus the unclaimed lit pixels within 30 px of it that no pose-C part (body, wing,
# nub, tail) covers and that are not under a cup. Rings as in outlines.py.
import cv2, numpy as np, json, sys
src, geo, silc, out, dbg = sys.argv[1:6]
g = cv2.imread(src, 0).astype(np.float32); H, W = g.shape
U = (cv2.GaussianBlur(g, (0, 0), 1.0) > 70).astype(np.uint8)
G = json.load(open(geo)); SC = json.load(open(silc)); F = G['FRONT_D']
P = np.zeros((H, W), np.uint8); cv2.fillPoly(P, [np.array(G['headF'][0], np.int32)], 1)
other = np.zeros((H, W), np.uint8)
for k in ('body', 'wing', 'nub', 'tail'):
    for r in SC[k]: cv2.fillPoly(other, [np.array(r, np.int32)], 1)
other &= 1 - P
zone = np.zeros((H, W), np.uint8)
for c in (F['cupL'], F['cupR']):
    x0 = min(c['x0'], c.get('out', c['x0'])); x1 = max(c['x1'], c.get('out', c['x1']))
    cv2.rectangle(zone, (int(x0) - 4, int(c['sy0']) - 10), (int(x1) + 4, int(c['y1']) + 6), 1, -1)
base = P & (U | cv2.erode(P, np.ones((25, 25), np.uint8)))
grow = U & (1 - P) & (1 - other) & (1 - zone) & (cv2.dilate(P, np.ones((61, 61), np.uint8)))
grow[540:, :] = 0
m = cv2.morphologyEx(base | grow, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
cs, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
rings = []
for c, hh in zip(cs, hier[0]):
    if hh[3] >= 0 or abs(cv2.contourArea(c)) < 60: continue
    s = cv2.approxPolyDP(c, 0.8, True)[:, 0, :]
    rings.append([[int(p[0]), int(p[1])] for p in s])
json.dump({'headF': rings}, open(out, 'w'))
im = cv2.cvtColor((U * 60).astype(np.uint8), cv2.COLOR_GRAY2BGR)
for r in rings: cv2.polylines(im, [np.array(r, np.int32)], True, (0, 0, 255), 1)
cv2.imwrite(dbg, im[0:600, 800:1620]); print(len(rings), sum(len(r) for r in rings))
