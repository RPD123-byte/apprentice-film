#!/usr/bin/env python3
# fit_tone.py render.png source.png sil.json parts prev.json out.json [exclude.json]
# The value study, fitted: per part, a cubic polynomial (10 terms, in frame px normalised by 300) of the blurred
# (sigma 6) tone difference source - render inside the part's measured silhouette (eroded 8 px), converted to a
# pre-grade delta through the grade's slope (S-curve x vignette). Accumulated onto prev.json (the fit is iterated:
# render, fit the residual, re-render). Writes 10 coefficients per part.
import cv2, numpy as np, json, sys
rp, sp, silp, parts, prevp, outp = sys.argv[1:7]
exc = json.load(open(sys.argv[7])) if len(sys.argv) > 7 else {}
r = cv2.imread(rp, 0).astype(np.float32) / 255; s = cv2.imread(sp, 0).astype(np.float32) / 255
H, W = r.shape
d = cv2.GaussianBlur(s, (0, 0), 6) - cv2.GaussianBlur(r, (0, 0), 6)
# grade slope: filmic S-curve f' = 0.65 f + 0.35 (3f^2 - 2f^3) times the vignette
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
qx = (xx / W - 0.5) * 2; qy = (yy / H - 0.5) * 2; rr = np.clip((qx * qx + qy * qy) / 2, 0, 1); vig = 1 - 0.38 * rr ** 1.15
L = np.clip(cv2.GaussianBlur(r, (0, 0), 6) / vig, 0, 1)
fs = np.linspace(0, 1, 1001); Sf = 0.65 * fs + 0.35 * (3 * fs * fs - 2 * fs ** 3)
f = np.interp(L, Sf, fs); slope = (0.65 + 0.35 * 6 * f * (1 - f)) * vig
dc = d / np.maximum(slope, 0.4)
S = json.load(open(silp)); prev = json.load(open(prevp)) if prevp != '-' else {}
ex = np.zeros((H, W), np.uint8)
for P in exc.get('out', []): cv2.fillPoly(ex, [np.array(P, np.int32)], 1)
for E in exc.get('outE', []): cv2.ellipse(ex, (int(E[0]), int(E[1])), (int(E[2]), int(E[3])), float(E[4]) * 180 / np.pi if len(E) > 4 else 0, 0, 360, 1, -1)
def terms(x, y):
    u = (x - 1300) / 300; v = (y - 470) / 300
    return np.stack([np.ones_like(u), u, v, u * u, u * v, v * v, u ** 3, u * u * v, u * v * v, v ** 3], -1)
out = dict(prev)
for k in parts.split(','):
    m = np.zeros((H, W), np.uint8)
    for ring in S[k]: m ^= cv2.fillPoly(np.zeros((H, W), np.uint8), [np.array(ring, np.int32)], 1)
    er = int(__import__('os').environ.get('ERODE', '17')); m = cv2.erode(m, np.ones((er, er), np.uint8)) & (1 - ex)
    ys, xs = np.nonzero(m)
    if len(xs) < 500: print(k, 'too small'); continue
    idx = np.arange(0, len(xs), max(1, len(xs) // 40000)); xs, ys = xs[idx], ys[idx]
    A = terms(xs.astype(np.float64), ys.astype(np.float64)); b = dc[ys, xs].astype(np.float64)
    lam = 1e-3 * len(b)
    c = np.linalg.solve(A.T @ A + lam * np.eye(10), A.T @ b)
    pv = np.array(prev.get(k, [0] * 10)); out[k] = [round(float(v), 5) for v in (pv + c)]
    res = b - A @ c
    print(k, 'n', len(b), 'mean dc %.4f' % b.mean(), 'rms before %.4f after %.4f' % (np.sqrt((b * b).mean()), np.sqrt((res * res).mean())))
json.dump(out, open(outp, 'w'))
