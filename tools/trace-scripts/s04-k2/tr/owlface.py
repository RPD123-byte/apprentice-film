#!/usr/bin/env python3
# owlface.py -- measure the owl's face at the hold frame (20.56) as primitives (paint space, frame px):
#   eyes: iris disc (centre, r), outer ring r, catchlights (centre, r); beak kite (4 points); plaster: two strips
# prints JSON.  No pixels are stored; the numbers drive the authored face in s04/owlface.js.
import cv2, numpy as np, json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from grade import degrade
from scipy.optimize import minimize
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'; cap = cv2.VideoCapture(V)
fi = int(sys.argv[1]) if len(sys.argv) > 1 else 514
cap.set(1, fi); ok, f = cap.read(); G = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32)
P = degrade(G, fi / 25)
out = {}
def eye(cx0, cy0):
    x0, y0 = cx0 - 45, cy0 - 45; c = P[y0:y0 + 90, x0:x0 + 90]
    m = (cv2.GaussianBlur(c, (0, 0), 1.0) < 110).astype(np.uint8)
    n, lab, st, cen = cv2.connectedComponentsWithStats(m)
    k = max(range(1, n), key=lambda i: st[i, 4] - 0.02 * ((cen[i][0] - 45) ** 2 + (cen[i][1] - 45) ** 2))
    comp = (lab == k).astype(np.uint8)
    comp = cv2.morphologyEx(comp, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    cs, _ = cv2.findContours(comp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    (ex, ey), (ea, eb), ang = cv2.fitEllipse(max(cs, key=cv2.contourArea))
    cx, cy = x0 + ex, y0 + ey; r = (ea + eb) / 4
    # radial profile: outer ring = darkest radius beyond the iris edge
    rs = np.arange(0, 45, 0.5); th = np.linspace(0, 2 * np.pi, 180, endpoint=False)
    prof = []
    for rr in rs:
        xs = cx + rr * np.cos(th); ys = cy + rr * np.sin(th)
        prof.append(float(np.median(cv2.remap(P, xs.astype(np.float32)[None], ys.astype(np.float32)[None], cv2.INTER_LINEAR))))
    prof = np.array(prof)
    sel = (rs > r + 3) & (rs < r + 14)
    rring = float(rs[sel][np.argmin(prof[sel])])
    # iris value (upper 2/3), lower crescent value, ring value, gap value
    yy, xx = np.mgrid[0:P.shape[0], 0:P.shape[1]]
    d = np.hypot(xx - cx, yy - cy)
    up = (d < r - 4) & (yy < cy - 4); lo = (d < r - 4) & (yy > cy + r * 0.45)
    # catchlights: bright blobs inside the iris
    ins = ((d < r - 1.5) & (P > 150)).astype(np.uint8)
    n2, lab2, st2, cen2 = cv2.connectedComponentsWithStats(ins[y0:y0 + 90, x0:x0 + 90])
    cl = sorted([(st2[i, 4], x0 + cen2[i][0], y0 + cen2[i][1]) for i in range(1, n2) if st2[i, 4] >= 4], reverse=True)[:2]
    return {"c": [round(cx, 1), round(cy, 1)], "r": round(r, 1), "ell": [round(ea / 2, 1), round(eb / 2, 1), round(ang, 1)],
            "ring": round(rring, 1), "v_iris": round(float(np.median(P[up])), 0), "v_low": round(float(np.percentile(P[lo], 75)), 0),
            "v_ring": round(float(prof[sel].min()), 0), "v_gap": round(float(prof[(rs > r + 1) & (rs < rring - 1)].max()), 0),
            "hl": [[round(x, 1), round(y, 1), round(float(np.sqrt(a / np.pi)), 1)] for a, x, y in cl],
            "prof": [round(v) for v in prof[::2]]}
out["eyes"] = [eye(1616, 340), eye(1718, 340)]
yy, xx = np.mgrid[0:P.shape[0], 0:P.shape[1]]
out["v_face"] = round(float(np.median(P[1640:1700, 300:330].T)), 0) if False else round(float(np.median(P[300:330, 1655:1680])), 0)
print(json.dumps(out, indent=1))
