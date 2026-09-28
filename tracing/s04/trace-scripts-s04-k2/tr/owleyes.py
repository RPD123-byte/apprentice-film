#!/usr/bin/env python3
# owleyes.py -- per face key: each owl eye measured on its own source frame near the head-motion prediction:
# the iris as an ellipse (dark component, fitEllipse), the two catchlights (bright blobs inside it). -> owlface_keys.json
import cv2, numpy as np, json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from grade import degrade
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'; cap = cv2.VideoCapture(V)
FN = sys.argv[1] if len(sys.argv) > 1 else 'tr/owlface_keys.json'; D = json.load(open(FN))
C0 = [(1615.9, 340.1), (1717.6, 340.3)]
eyes = {}
for t, A in D["aff"].items():
    fi = int(round(float(t) * 25)); cap.set(1, fi); ok, f = cap.read()
    P = degrade(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32), fi / 25)
    Wm = np.array(A).reshape(2, 3)
    row = []
    for c0 in C0:
        px, py = Wm @ [c0[0], c0[1], 1]
        x0, y0 = int(px) - 45, int(py) - 45
        c = P[y0:y0 + 90, x0:x0 + 90]
        m = (cv2.GaussianBlur(c, (0, 0), 1.0) < 110).astype(np.uint8)
        # fill the catchlights (bright holes inside the dark iris) before taking its outline
        n, lab, st, cen = cv2.connectedComponentsWithStats(m)
        k = max(range(1, n), key=lambda i: st[i, 4] - 0.05 * ((cen[i][0] - 45) ** 2 + (cen[i][1] - 45) ** 2))
        comp = (lab == k).astype(np.uint8)
        cs, _ = cv2.findContours(comp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        cc = max(cs, key=cv2.contourArea)
        hull = cv2.convexHull(cc)
        (ex, ey), (ea, eb), ang = cv2.fitEllipse(hull)
        cx, cy = x0 + ex, y0 + ey
        filled = np.zeros_like(comp); cv2.drawContours(filled, [hull], -1, 1, -1)
        ins = ((filled > 0) & (comp == 0) & (c > 150)).astype(np.uint8)
        n2, lab2, st2, cen2 = cv2.connectedComponentsWithStats(ins)
        cl = sorted([(st2[i, 4], x0 + cen2[i][0], y0 + cen2[i][1]) for i in range(1, n2) if st2[i, 4] >= 3], reverse=True)[:2]
        hl = [[round(x, 1), round(y, 1), round(float(np.sqrt(a / np.pi)), 1)] for a, x, y in cl]
        row.append({"c": [round(cx, 1), round(cy, 1)], "ax": [round(ea / 2, 1), round(eb / 2, 1), round(ang, 1)], "hl": hl,
                    "pred": [round(px, 1), round(py, 1)]})
    eyes[t] = row
    print(t, [(e["c"], e["ax"], len(e["hl"]), round(float(np.hypot(e["c"][0] - e["pred"][0], e["c"][1] - e["pred"][1])), 1)) for e in row])
D["eyes"] = eyes
json.dump(D, open(FN, 'w'))
