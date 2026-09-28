#!/usr/bin/env python3
# Track a region of the settled frame through the source frames (ECC), measurement only.
# track.py x0 y0 x1 y1 k0 k1 [translation|euclidean|affine] [maskname]
# prints, per frame, where the region's centre went (dx, dy), its scale and rotation, and the affine (settled -> frame)
import numpy as np, cv2, sys, os, frames
x0, y0, x1, y1, k0, k1 = map(int, sys.argv[1:7]); mode = sys.argv[7] if len(sys.argv) > 7 else 'translation'
mk = sys.argv[8] if len(sys.argv) > 8 else None
S = (frames.poseB() if os.environ.get('TPL') == 'B' else frames.static_target()).mean(2).astype(np.float32)
P = 120
X0, Y0, X1, Y1 = x0 - P, y0 - P, x1 + P, y1 + P
pad = lambda im: cv2.copyMakeBorder(im, P, P, P, P, cv2.BORDER_REPLICATE)[Y0 + P:Y1 + P, X0 + P:X1 + P].copy() if X0 < 0 or Y0 < 0 else im[Y0:Y1, X0:X1].copy()
Sb = cv2.copyMakeBorder(S, P, P, P, P, cv2.BORDER_REPLICATE)[Y0 + P:Y1 + P, X0 + P:X1 + P].copy()
m = np.zeros(Sb.shape, np.uint8); m[P:-P, P:-P] = 1
if mk:
    M = dict(np.load(f'{frames.CACHE}/masks.npz')); mm = cv2.copyMakeBorder(M[mk].astype(np.uint8), P, P, P, P, cv2.BORDER_CONSTANT, value=0)[Y0 + P:Y1 + P, X0 + P:X1 + P]
    m &= mm
MODE = {'translation': cv2.MOTION_TRANSLATION, 'euclidean': cv2.MOTION_EUCLIDEAN, 'affine': cv2.MOTION_AFFINE}[mode]
prev = np.eye(2, 3, dtype=np.float32)
ks = range(k0, k1 + 1) if k1 >= k0 else range(k0, k1 - 1, -1)
for k in ks:
    im = frames.pre(k).mean(2).astype(np.float32)
    Fb = cv2.copyMakeBorder(im, P, P, P, P, cv2.BORDER_REPLICATE)[Y0 + P:Y1 + P, X0 + P:X1 + P].copy()
    try:
        cc, Wm = cv2.findTransformECC(Fb, Sb, prev.copy(), MODE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 300, 1e-6), m, 5)
        prev = Wm
    except cv2.error as e:
        cc, Wm = 0, prev
    # Wm: frame-crop coords -> static-crop coords; invert: static -> frame
    A = np.vstack([Wm, [0, 0, 1]]); Ai = np.linalg.inv(A)
    c = np.array([(x1 + x0) / 2 - X0, (y1 + y0) / 2 - Y0, 1]); q = Ai @ c
    sc = np.sqrt(abs(np.linalg.det(Ai[:2, :2]))); rot = np.degrees(np.arctan2(Ai[1, 0], Ai[0, 0]))
    # affine in frame coordinates: p_frame = Af p_static + bf
    T = np.array([[1, 0, X0], [0, 1, Y0], [0, 0, 1]]); Af = T @ Ai @ np.linalg.inv(T)
    print(f'{k / 25:.2f} cc {cc:.3f} centre ({q[0] - c[0]:+.2f},{q[1] - c[1]:+.2f}) s {sc:.4f} rot {rot:+.3f} aff {Af[0,0]:.5f} {Af[0,1]:.5f} {Af[0,2]:.2f} {Af[1,0]:.5f} {Af[1,1]:.5f} {Af[1,2]:.2f}', flush=True)
