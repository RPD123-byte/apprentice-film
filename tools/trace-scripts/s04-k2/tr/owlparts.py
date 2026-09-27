#!/usr/bin/env python3
# owlparts.py -- per face key: where the beak and the plaster sit on its own frame. Predicted from the two measured eye
# centres (the similarity that maps the hold frame's eyes onto the key's), then refined by template matching the hold
# frame's beak / plaster patch (scaled by that similarity) within +-14 px. Adds "parts" to owlface_keys.json.
import cv2, numpy as np, json, sys
V = '/Users/computer/rapport-videos/videogen/clips/01-13-FINISHED-v3-share.mp4'; cap = cv2.VideoCapture(V)
def fr(i): cap.set(1, i); ok, f = cap.read(); return cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float32)
FN = sys.argv[1] if len(sys.argv) > 1 else 'tr/owlface_keys.json'; D = json.load(open(FN))
A0 = fr(514); E0 = np.array([[1615.9, 340.1], [1717.5, 340.4]])
PATCH = {"beak": (1640, 352, 1690, 412), "plaster": (1582, 212, 1660, 268)}
parts = {}
for t in D["aff"]:
    B = fr(int(round(float(t) * 25))); E = np.array([e["c"] for e in D["eyes"][t]])
    # similarity from the two eyes (complex ratio), with the head affine's own y scale kept for the vertical
    z0 = complex(*(E0[1] - E0[0])); z1 = complex(*(E[1] - E[0])); zr = z1 / z0
    Wa = np.array(D["aff"][t]).reshape(2, 3)
    row = {}
    for nm, (x0, y0, x1, y1) in PATCH.items():
        c0 = np.array([(x0 + x1) / 2, (y0 + y1) / 2])
        zc = complex(*(c0 - E0.mean(0))) * zr; pc = E.mean(0) + [zc.real, zc.imag]
        pa = Wa @ [c0[0], c0[1], 1]
        # patch warped by the head affine's linear part, re-centred
        L = Wa[:, :2]; hw, hh = (x1 - x0) // 2, (y1 - y0) // 2
        M = np.c_[L, pc - L @ c0]
        tpl = cv2.warpAffine(A0, M, (B.shape[1], B.shape[0]))[int(pc[1]) - hh:int(pc[1]) + hh, int(pc[0]) - hw:int(pc[0]) + hw]
        S = 14; win = B[int(pc[1]) - hh - S:int(pc[1]) + hh + S, int(pc[0]) - hw - S:int(pc[0]) + hw + S]
        r = cv2.matchTemplate(cv2.GaussianBlur(win, (0, 0), 1.2), cv2.GaussianBlur(tpl, (0, 0), 1.2), cv2.TM_CCOEFF_NORMED)
        _, mx, _, loc = cv2.minMaxLoc(r)
        d = np.array(loc, float) - S
        # sub-pixel (parabola)
        for ax in (0, 1):
            i, j = loc[1], loc[0]
            if ax == 0 and 0 < j < r.shape[1] - 1: a, b, c = r[i, j - 1], r[i, j], r[i, j + 1]; d[0] += 0.5 * (a - c) / (a - 2 * b + c + 1e-9)
            if ax == 1 and 0 < i < r.shape[0] - 1: a, b, c = r[i - 1, j], r[i, j], r[i + 1, j]; d[1] += 0.5 * (a - c) / (a - 2 * b + c + 1e-9)
        # the shift that moves the affine-placed part onto its measured place
        row[nm] = [round(float(pc[0] + d[0] - pa[0]), 1), round(float(pc[1] + d[1] - pa[1]), 1), round(float(mx), 3)]
    parts[t] = row
    print(t, row)
D["parts"] = parts
json.dump(D, open(FN, 'w'))
