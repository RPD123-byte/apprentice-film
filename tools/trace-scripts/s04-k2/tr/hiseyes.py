#!/usr/bin/env python3
# hiseyes.py -- his eyes on the hold frame (20.56), measured for the authored irises (s04/hiseyes.js):
#   opening: outline of the eye's opening (sclera + iris, holes filled) inside each eye box
#   pupil: the darkest compact blob; iris: circle fitted to the iris/sclera boundary (lid edges excluded)
import cv2, numpy as np, sys, os, json
sys.path.insert(0, os.path.dirname(__file__))
from grade import degrade
from scipy.optimize import least_squares
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'; cap = cv2.VideoCapture(V); cap.set(1, 514); ok, f = cap.read()
P = degrade(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32), 514 / 25)
out = {}
for nm, (x0, y0, x1, y1), pc0 in [("L", (815, 300, 950, 372), (894.8, 333.9)), ("R", (1175, 290, 1310, 362), (1271.6, 323.2))]:
    c = cv2.GaussianBlur(P[y0:y1, x0:x1], (0, 0), 1.0)
    # opening: bright or iris-grey, connected to the pupil's surroundings; pupil hole filled
    m = (c > 85).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, st, cen = cv2.connectedComponentsWithStats(m)
    px, py = int(pc0[0] - x0), int(pc0[1] - y0)
    # the component nearest the pupil (the pupil itself is dark)
    best = min(range(1, n), key=lambda i: np.min(np.hypot(*(np.argwhere(lab == i)[:, ::-1] - [px, py]).T)) - 0.001 * st[i, 4])
    op = (lab == best).astype(np.uint8)
    cs, _ = cv2.findContours(op, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    cc = max(cs, key=cv2.contourArea)
    filled = np.zeros_like(op); cv2.drawContours(filled, [cc], -1, 1, -1)
    poly = cv2.approxPolyDP(cc, 0.8, True)[:, 0, :] + [x0, y0]
    # iris/sclera boundary points: iris-grey pixels (85..205) next to sclera (>218) inside the opening, away from its edge
    inner = cv2.erode(filled, np.ones((7, 7), np.uint8)) > 0
    iris = (c > 85) & (c < 200) & inner; scl = (c > 218) & inner
    bd = iris & (cv2.dilate(scl.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0)
    ys, xs = np.nonzero(bd); pts = np.c_[xs + x0, ys + y0].astype(float)
    # the iris is concentric with the pupil (a small offset allowed); only boundary points to its sides (within 55 deg of
    # horizontal), where the lids do not cut it
    ang = np.degrees(np.arctan2(pts[:, 1] - pc0[1], pts[:, 0] - pc0[0]))
    side = (np.abs(ang) < 55) | (np.abs(ang) > 125)
    d = np.hypot(pts[:, 0] - pc0[0], pts[:, 1] - pc0[1]); pts = pts[side & (d > 12) & (d < 45)]
    def res(v): return np.r_[np.hypot(pts[:, 0] - v[0], pts[:, 1] - v[1]) - v[2], 0.5 * (v[0] - pc0[0]), 0.5 * (v[1] - pc0[1])]
    r0 = least_squares(res, [pc0[0], pc0[1], 28], loss="soft_l1", f_scale=2)
    # pupil circle from its area
    pm = (c < 40).astype(np.uint8); n2, lab2, st2, cen2 = cv2.connectedComponentsWithStats(pm)
    k = min(range(1, n2), key=lambda i: np.hypot(cen2[i][0] + x0 - pc0[0], cen2[i][1] + y0 - pc0[1]))
    pr = float(np.sqrt(st2[k, 4] / np.pi))
    irisv = float(np.median(c[iris])); sclv = float(np.median(c[scl]))
    out[nm] = {"opening": poly.tolist(), "pupil": [round(pc0[0], 1), round(pc0[1], 1), round(pr, 1)],
               "iris": [round(float(v), 1) for v in r0.x], "v_iris": round(irisv), "v_sclera": round(sclv), "nbd": len(pts)}
    print(nm, "pupil", out[nm]["pupil"], "iris", out[nm]["iris"], "boundary pts", len(pts), "values iris/sclera", round(irisv), round(sclv), "opening pts", len(poly))
json.dump(out, open("tr/hiseyes.json", "w"))
