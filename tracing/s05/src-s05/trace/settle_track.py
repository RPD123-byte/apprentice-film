#!/usr/bin/env python3
# (masks: a layer name from masks.npz, or lapbase / lid from masks_lap.npz, both written by masks.py)
# Per-region motion through the camera settle (23.12-23.52): ECC affine of a settled-frame region (optionally masked
# by a layer) into each source frame, chained backward from 23.56. Prints where the region's centre goes and the
# affine's scale/rotation. Measurement only.  settle_track.py name x0 y0 x1 y1 [mask] [blur]
import numpy as np, cv2, sys, os, frames
name = sys.argv[1]; x0, y0, x1, y1 = map(int, sys.argv[2:6]); mk = sys.argv[6] if len(sys.argv) > 6 and sys.argv[6] != '-' else None
bl = float(sys.argv[7]) if len(sys.argv) > 7 else 0
S = frames.static_target().mean(2).astype(np.float32)
P = 200
Sb = cv2.copyMakeBorder(S, P, P, P, P, cv2.BORDER_REPLICATE)[y0:y1 + 2 * P, x0:x1 + 2 * P].copy()
m = np.zeros(Sb.shape, np.uint8); m[P:-P, P:-P] = 1
if mk:
    M = dict(np.load(f'{frames.CACHE}/masks.npz')); M.update(dict(np.load(f'{frames.CACHE}/masks_lap.npz')))
    mm = np.zeros(S.shape, bool)
    for n in mk.split('+'): mm |= M[n]
    m &= cv2.copyMakeBorder(mm.astype(np.uint8), P, P, P, P, cv2.BORDER_CONSTANT, value=0)[y0:y1 + 2 * P, x0:x1 + 2 * P]
if bl > 0: Sb = cv2.blur(Sb, (int(bl) * 2 + 1, 1))
prev = np.eye(2, 3, dtype=np.float32)
out = []
for k in range(589, 577, -1):
    F = frames.pre(k).mean(2).astype(np.float32)
    Fb = cv2.copyMakeBorder(F, P, P, P, P, cv2.BORDER_REPLICATE)[y0:y1 + 2 * P, x0:x1 + 2 * P].copy()
    try:
        cc, Wm = cv2.findTransformECC(Fb, Sb, prev.copy(), cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 400, 1e-7), m, 7)
        prev = Wm
    except cv2.error:
        cc, Wm = 0, prev
    A = np.vstack([Wm, [0, 0, 1]]); Ai = np.linalg.inv(A)
    T = np.array([[1, 0, x0 - P], [0, 1, y0 - P], [0, 0, 1]]); Af = T @ Ai @ np.linalg.inv(T)   # settled -> frame
    c = np.array([(x0 + x1) / 2, (y0 + y1) / 2, 1]); q = Af @ c
    sc = np.sqrt(abs(np.linalg.det(Af[:2, :2]))); rot = np.degrees(np.arctan2(Af[1, 0], Af[0, 0]))
    out.append((k / 25, cc, q[0] - c[0], q[1] - c[1], sc, rot, Af[:2].ravel().tolist()))
    print(f'{name} {k / 25:.2f} cc {cc:.3f} centre ({q[0] - c[0]:+.1f},{q[1] - c[1]:+.1f}) s {sc:.4f} rot {rot:+.2f}', flush=True)
import json
json.dump(out, open(f'{frames.TRACKS}/settle_{name}.json', 'w'))
