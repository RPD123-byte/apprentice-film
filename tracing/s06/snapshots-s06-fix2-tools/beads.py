#!/usr/bin/env python3
# room cable beads (fix pass 2, low): bead centres, peaks and orientation along the two cables, measured on the
# source's static room (mean of frames 668-725 every 3rd). Prints a JS array [x, y, angle, peak] (graded 0..255).
import json, sys
from util import *
from scipy.interpolate import splprep, splev
M = np.mean([src(n) for n in range(668, 726, 3)], 0); B = cv2.GaussianBlur(M, (0, 0), 0.7)
PATHS = {'v': [(420,130),(424,160),(427,180),(431,200),(435,220),(438,240),(440,260),(440,300),(437,320),(434,345)],
         'd': [(285,282),(300,274),(320,262),(340,253),(360,240),(380,227),(400,211),(415,200),(430,188),(440,174),(450,158),(460,143),(470,125)]}
out = []
for k, P in PATHS.items():
    P = np.array(P, float); tck, _ = splprep([P[:, 0], P[:, 1]], s=len(P) * 2)
    L = np.sum(np.hypot(*np.diff(P, axis=0).T)); n = int(L * 2)
    u = np.linspace(0, 1, n); x, y = splev(u, tck); dx, dy = splev(u, tck, der=1); l = np.hypot(dx, dy); tx, ty = dx / l, dy / l
    prof = []; pos = []
    for i in range(n):
        best = (-1, 0, 0)
        for o in np.arange(-3, 3.01, 0.5):
            px, py = x[i] - ty[i] * o, y[i] + tx[i] * o
            v = cv2.getRectSubPix(B, (1, 1), (float(px), float(py)))[0, 0]
            if v > best[0]: best = (v, px, py)
        prof.append(best[0]); pos.append(best[1:])
    prof = np.array(prof)
    for i in range(2, n - 2):
        if prof[i] >= prof[i - 1] and prof[i] >= prof[i + 1] and prof[i] >= prof[i - 2] and prof[i] >= prof[i + 2]:
            lo = min(prof[max(0, i - 6):i].min(), prof[i + 1:i + 7].min())
            if prof[i] - lo > 12 and prof[i] > 40:
                ang = float(np.arctan2(ty[i], tx[i]))
                out.append([round(pos[i][0], 1), round(pos[i][1], 1), round(ang, 2), int(prof[i])])
print(len(out), file=sys.stderr)
print(json.dumps(out))
