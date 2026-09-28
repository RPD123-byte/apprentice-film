#!/usr/bin/env python3
# fitsmear.py plate.pkl owl.pkl f0 f1 - fit the horizontal motion-blur sigma of the shot-A owl per frame (preview
# renderer; error = blurred-2 MAE inside the owl's box, against the source frame)
import sys, os, pickle, copy, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from inktrace import render_preview
from trace_plate2 import shift
from common import frame
from grade import forward
from owlprev import PATH_A
PL = np.load(sys.argv[1] + '.render.npy').astype(np.float32)
ALL = pickle.load(open(sys.argv[2], 'rb'))
cf = lambda f: f - (f - 1) // 25
import json
WA = json.load(open(os.environ.get('WA', 'owlA_W.json'))) if os.path.exists(os.environ.get('WA', 'owlA_W.json')) else {}
def affine(D, W, X0=360, Y0=60):
    # template (crop) -> frame-crop affine, applied to a drawing in 1356-placement frame coords (fields: shifted only)
    A = np.array(W, float)
    f = lambda P: (np.asarray(P, float) - [X0, Y0]) @ A[:, :2].T + A[:, 2] + [X0, Y0]
    D['masses'] = [[[f(R) for R in rings], fd] for rings, fd in D['masses']]
    if 'base' in D: D['base'] = [[[f(R) for R in rings], fd] for rings, fd in D['base']]
    D['specks'] = [[[f(R) for R in rings], fd] for rings, fd in D.get('specks', [])]
    for k in ('dark', 'bright'): D[k] = [[t, f(pts).tolist(), ws] for t, pts, ws in D[k]]
    return D
for n in range(int(sys.argv[3]), int(sys.argv[4]) + 1):
    ph = ['level', 'up', 'level', 'down'][cf(n) % 4]
    lays = []
    for O in [ALL['phase'][ph]] + ([ALL['feet'][n]] if n in ALL['feet'] else []):
        O2 = copy.deepcopy(O)
        if str(n) in WA: O2 = affine(O2, WA[str(n)])
        lays.append(render_preview(shift(O2, *PATH_A[n]), (946, 2206), soft=0.6, wk=(0.85, 1), alpha=True))
    S = frame(n).astype(np.float32)
    al0 = sum(a for _, a in lays)
    ys, xs = np.nonzero(al0 > 0.1); x0, x1, y0, y1 = max(0, xs.min() - 30), min(2206, xs.max() + 30), max(0, ys.min() - 20), min(946, ys.max() + 20)
    out = []
    for sg in (0, 1, 1.5, 2, 3, 4, 5, 6, 8):
        R = PL.copy()
        for lay, al in lays:
            if sg > 0:
                k = int(3 * sg) * 2 + 1; lay = cv2.GaussianBlur(lay, (k, 1), sg); al = cv2.GaussianBlur(al, (k, 1), sg)
            R = R * (1 - al) + lay
        Rg = forward(np.clip(R, 0, 1), n / 25) * 255
        e = np.abs(cv2.GaussianBlur(Rg, (0, 0), 2) - cv2.GaussianBlur(S, (0, 0), 2))[y0:y1, x0:x1].mean()
        out.append((round(float(e), 2), sg))
    print(n, ph, 'best', min(out), out)
