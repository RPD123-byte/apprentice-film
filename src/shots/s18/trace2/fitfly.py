#!/usr/bin/env python3
# fitfly.py owlB.pkl SP [f0 f1] - blur (gaussian sigma px) of the per-frame flying owl drawing that best matches the
# source (preview renderer over the frame's owl-free expectation; blurred-2 MAE inside the owl's box)
import sys, os, pickle, numpy as np, cv2
sys.path.insert(0, os.path.dirname(__file__))
from inktrace import render_preview
from common import frame
from grade import forward
R = pickle.load(open(sys.argv[1], 'rb')); Z = np.load(sys.argv[2] + '/owlB_frames.npz')
f0, f1 = (int(sys.argv[3]), int(sys.argv[4])) if len(sys.argv) > 4 else (1417, 1432)
for n in range(f0, f1 + 1):
    if n not in R['fly']: continue
    lay, al = render_preview(R['fly'][n], (946, 2206), soft=0, wk=(0.85, 1), alpha=True)
    E = Z[f'E{n}']; S = frame(n).astype(np.float32)
    ys, xs = np.nonzero(al > 0.1); x0, x1, y0, y1 = max(0, xs.min() - 20), min(2206, xs.max() + 20), max(0, ys.min() - 20), min(946, ys.max() + 20)
    # score on the band around the owl's outline (where the blur shows), not its flat inside
    sil = (al > 0.5).astype(np.uint8)
    band = (cv2.dilate(sil, np.ones((21, 21), np.uint8)) - cv2.erode(sil, np.ones((21, 21), np.uint8))) > 0
    out = []
    for sg in (0.7, 1.5, 2.5, 3.5, 5, 6.5, 8, 10):
        l2 = cv2.GaussianBlur(lay, (0, 0), sg); a2 = cv2.GaussianBlur(al, (0, 0), sg)
        Rg = forward(np.clip(E * (1 - a2) + l2, 0, 1), n / 25) * 255
        e = np.abs(cv2.GaussianBlur(Rg, (0, 0), 1) - cv2.GaussianBlur(S, (0, 0), 1))[band].mean()
        out.append((round(float(e), 2), sg))
    print(n, 'best', min(out), out, flush=True)
