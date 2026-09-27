#!/usr/bin/env python3
# farwing.py frame silC.json ecc.json box out.json dbg.png — the far wing in poses A (884) / B (886): the lit pixels of
# that source frame, inside a box left of the head, that none of the other parts covers once each is placed by its
# measured ECC matrix (the head by the rig's numbers when its fit is weak). Outline rings, as outlines.py.
import cv2, numpy as np, json, sys
f = int(sys.argv[1]); SC = json.load(open(sys.argv[2])); E = json.load(open(sys.argv[3])); box = [int(v) for v in sys.argv[4].split(',')]
g = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/s13-k-src/f%04d.png' % f, 0).astype(np.float32); H, W = g.shape
U = (cv2.GaussianBlur(g, (0, 0), 1.0) > 70).astype(np.uint8)
cov = np.zeros((H, W), np.uint8)
HEAD = {884: [-1.0, -32.8, 0.33], 886: [1.5, -29.8, 0.49]}
for k in ('head', 'body', 'wing', 'tail'):
    m = np.zeros((H, W), np.uint8)
    for r in SC[k]: m ^= cv2.fillPoly(np.zeros((H, W), np.uint8), [np.array(r, np.int32)], 1)
    e = E[str(f)].get(k)
    if e and e['cc'] >= 0.9: M = np.array(e['m'], np.float32).reshape(2, 3)
    else:
        dx, dy, rd = HEAD[f]; a = np.radians(rd); c = (1190, 270)
        M = np.array([[np.cos(a), -np.sin(a), 0], [np.sin(a), np.cos(a), 0]], np.float32); M[:, 2] = np.array(c) + [dx, dy] - M[:, :2] @ np.array(c)
    cov |= cv2.warpAffine(m, M, (W, H), flags=cv2.INTER_NEAREST)
bm = np.zeros((H, W), np.uint8); bm[box[1]:box[3], box[0]:box[2]] = 1
left = U & (1 - cv2.erode(cov, np.ones((5, 5), np.uint8))) & bm
left = cv2.morphologyEx(left, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
n, lab, st, _ = cv2.connectedComponentsWithStats(left)
big = np.argmax(st[1:, 4]) + 1; left = (lab == big).astype(np.uint8)
cs, hier = cv2.findContours(left, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
rings = []
for c, hh in zip(cs, hier[0]):
    if hh[3] >= 0 and abs(cv2.contourArea(c)) < 40: continue
    s = cv2.approxPolyDP(c, 0.8, True)[:, 0, :]
    if len(s) >= 3: rings.append([[int(p[0]), int(p[1])] for p in s])
json.dump({'rings': rings, 'mask': {'in': rings, 'lit': 90, 'erode': 2}}, open(sys.argv[5], 'w'))
im = cv2.cvtColor(g.astype(np.uint8), cv2.COLOR_GRAY2BGR) // 2
for r in rings: cv2.polylines(im, [np.array(r, np.int32)], True, (0, 0, 255), 1)
cv2.imwrite(sys.argv[6], im[box[1]:box[3], box[0]:box[2]]); print(len(rings), int(left.sum()))
