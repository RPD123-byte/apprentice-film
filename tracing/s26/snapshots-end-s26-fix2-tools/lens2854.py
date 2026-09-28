# lens2854.py OUT.json: the lens shard's last dark blurred tail over the top-right corner at 114.16 (F2854), traced coarse
# from a blurred copy of the source (as the E front, end-s26-fix1-tools/etrace.py), inside where the source differs from
# our own colour page there (measurement -> vectors)
import cv2, numpy as np, sys, json
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix1-tools')
from vtrace import trace, pack, outline, fl
from gradeio import ungrade
import owlmask as o
F = 2854
s = o.src(F).astype(np.float32); p = cv2.imread('/Users/computer/rootline/apprentice-film/snapshots/end-s26-fix2-tools/pagegr/r2854.png').astype(np.float32)
d = np.abs(cv2.GaussianBlur(s, (0, 0), 6) - cv2.GaussianBlur(p, (0, 0), 6)).sum(2)
m = (d > 36).astype(np.uint8); m[230:] = 0; m[:, :1700] = 0
n, lab, st, _ = cv2.connectedComponentsWithStats(m)
keep = np.zeros_like(m)
for i in range(1, n):
    if st[i, 4] > 1500: keep[lab == i] = 1
front = cv2.dilate(keep, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (41, 41)))
front[260:] = 0
U8 = np.clip(ungrade(o.src(F), F / 25) * 255 + 0.5, 0, 255).astype(np.uint8)
Ub = cv2.GaussianBlur(U8, (0, 0), 2.5)
PF = dict(K=20, ink=False, wink=False, eps=1.2, minarea=30, smooth=1.5, vote=3, hc=12, bil=40)
rf, _ = trace(Ub, front, (0, 0), PF)
zo = [fl(q) for q in outline(front, (0, 0), 1.5)]
Fr = pack(rf, {})
json.dump({'frames': {F: [[[], [], []], [Fr[0], [], zo]]}}, open(sys.argv[1], 'w'), separators=(',', ':'))
ys, xs = np.nonzero(front); print('front bbox', xs.min(), xs.max(), ys.min(), ys.max(), 'regions', len(rf))
