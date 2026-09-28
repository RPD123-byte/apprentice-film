#!/usr/bin/env python3
# Refit the flying owl's root track per frame (measurement script, not loaded by the film): each SOURCE frame 16.00–19.12
# is warped into the owl's frame with the current track (wing_local.py), and the similarity (shift, scale, bank) that
# best aligns its body + head edges (gradient magnitude inside the measured flying-body region) with the median body
# of the level-flight frames 17.84–19.12 is searched on a grid, then composed into the track. Prints JS rows
# [t, x, y, s, rot] for ROOT (s02.js). Usage: fit_root.py fly-reg.png
import cv2, numpy as np, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wing_local as wl
reg = (cv2.imread(sys.argv[1], 0) > 0).astype(np.uint8)
U0, V0 = wl.U0, wl.V0
# PART=head: the head, cups and band (v < -30); PART=body: the body, feet and tail (v > -10)
PART = os.environ.get('PART', 'all')
vv = np.arange(reg.shape[0])[:, None] + V0
if PART == 'head': reg = reg * (vv < -30)
if PART == 'body': reg = reg * (vv > -10)
reg = reg.astype(np.uint8)
def grad(I):
    I = cv2.GaussianBlur(I.astype(np.float32), (0, 0), 1.5); return np.hypot(cv2.Sobel(I, cv2.CV_32F, 1, 0), cv2.Sobel(I, cv2.CV_32F, 0, 1))
M = np.median(np.stack([wl.local(f)[0] for f in range(446, 479)]), 0)
ys, xs = np.nonzero(reg); y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
T = (grad(M) * cv2.dilate(reg, np.ones((5, 5), np.uint8)))[y0:y1, x0:x1]
rows = []
for f in ([int(v) for v in os.environ["FR"].split(",")] if os.environ.get("FR") else range(400, 479)):
    t = f / 25
    Lp, (x, y, s, rot) = wl.local(f)
    G = grad(Lp)
    best = None
    for dr in np.arange(-0.33, 0.151, 0.03):
        for ds in (0.9, 0.93, 0.96, 1.0, 1.04, 1.08, 1.12, 1.16, 1.2, 1.25):
            # transform the local image about the root (origin at (-U0,-V0) px): p' = ds*R(dr)*p
            c, sn = np.cos(dr) * ds, np.sin(dr) * ds
            A = np.float32([[c, -sn, 0], [sn, c, 0]]); A[:, 2] = np.float32([-U0, -V0]) - A[:, :2] @ np.float32([-U0, -V0])
            Gw = cv2.warpAffine(G, A, (G.shape[1], G.shape[0]), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP)
            pad = 40
            Sx = Gw[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad]
            r = cv2.matchTemplate(Sx, T, cv2.TM_CCORR_NORMED); _, mx, _, loc = cv2.minMaxLoc(r)
            if best is None or mx > best[0]: best = (mx, dr, ds, loc[0] - (x0 - max(0, x0 - pad)), loc[1] - (y0 - max(0, y0 - pad)))
    mx, dr, ds, du, dv = best
    # the source body sits at local p = ds*R(dr)*q + (du,dv) for template point q: new root = old root + s*R(rot)*(du,dv),
    # new scale s*ds, new bank rot+dr
    c, sn = np.cos(rot), np.sin(rot)
    nx, ny = x + s * (c * du - sn * dv), y + s * (sn * du + c * dv)
    rows.append((t, nx, ny, s * ds, rot + dr, mx))
    print(f'{f} {t:.2f} d=({du:+d},{dv:+d}) ds={ds:.2f} dr={dr:+.2f} score {mx:.2f}', file=sys.stderr, flush=True)
print('[' + ', '.join('[%.2f, %.1f, %.1f, %.3f, %.3f, %.2f]' % r for r in rows) + ']')
