#!/usr/bin/env python3
# s02 value-study correction (not loaded by the film): fit a smooth value offset  D = sum a_i * gauss(x - p_i, s_i)
# so that  blur(render) + D ~ blur(source)  in pre-grade paint values (0..255), inside a mask, by greedy matching
# pursuit with round Gaussians (sigma 28 / 48 / 80 px, |a| <= 60: soft shading, never spots). Writes control points only: [x, y, sigma, a] (world px), appended to
# prev.json. The film turns D into a gain on its own blurred drawing (hand/tone.js), so ink stays ink.
#   tone_fit.py render_raw.png source_pre.npy mask.png prev.json|- out.json N [SIGMAS]
# render_raw.png: the shot's pre-grade paint (lab --raw); source_pre.npy: the source averaged over held frames with the
# film's grade inverted (common.ungrade); mask.png: white where the correction may act (weights).
import sys, json, numpy as np, cv2
rp, sp, mp, prev, outp, N = sys.argv[1:7]; N = int(N)
SIG = [float(v) for v in sys.argv[7].split(',')] if len(sys.argv) > 7 else [28, 48, 80]
AMAX = float(sys.argv[8]) if len(sys.argv) > 8 else 60
R = cv2.imread(rp, 0).astype(np.float32); S = np.load(sp).astype(np.float32); M = (cv2.imread(mp, 0) > 127).astype(np.float32)
q = 4                                   # work at 1/4 resolution
def dn(a): return cv2.resize(a, (a.shape[1] // q, a.shape[0] // q), interpolation=cv2.INTER_AREA)
Rb = dn(cv2.GaussianBlur(R, (0, 0), 6)); Sb = dn(cv2.GaussianBlur(S, (0, 0), 6)); w = dn(M)
r = (Sb - Rb) * (w > 0.05)
blobs = [] if prev == '-' else json.load(open(prev))
# residual after previous blobs
H, W = r.shape; yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
def g(x, y, s): return np.exp(-((xx - x / q) ** 2 + (yy - y / q) ** 2) / (2 * (s / q) ** 2))
for (x, y, s, a) in blobs: r -= a * g(x, y, s) * (w > 0.05)
for it in range(N):
    best = None
    for s in SIG:
        sq = s / q
        num = cv2.GaussianBlur(w * r, (0, 0), sq); den = cv2.GaussianBlur(w, (0, 0), sq / np.sqrt(2)) + 1e-6
        sc = num * num / den * (den > 0.35 * den.max())      # only where the blob sits mostly inside the mask
        iy, ix = np.unravel_index(np.argmax(sc), sc.shape)
        if best is None or sc[iy, ix] > best[0]: best = (sc[iy, ix], ix * q, iy * q, s)
    _, x, y, s = best
    G = g(x, y, s); a0 = float((w * r * G).sum() / ((w * G * G).sum() + 1e-6)); a = max(-AMAX, min(AMAX, a0))
    r -= a * G * (w > 0.05)
    if a != a0: w = w * (1 - 0.9 * (G > 0.5))     # clamped: do not keep hammering the same spot
    blobs.append([int(x), int(y), s, round(a, 2)])
json.dump(blobs, open(outp, 'w'))
print('blobs', len(blobs), 'rms residual', float(np.sqrt((w * r * r).sum() / w.sum())))
