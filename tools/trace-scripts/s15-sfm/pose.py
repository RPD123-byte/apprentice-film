import cv2, numpy as np, sys
from common import *
f = float(sys.argv[1]) if len(sys.argv) > 1 else 819
Kf = K(f)
for a, b in zip(FRAMES[:-1], FRAMES[1:]):
    P, Q, frac = corr(a, b)
    E, inl = cv2.findEssentialMat(P, Q, Kf, cv2.RANSAC, 0.999, 1.0)
    n, R, t, m2 = cv2.recoverPose(E, P, Q, Kf, mask=inl.copy())
    rv = cv2.Rodrigues(R)[0].ravel() * 180 / np.pi
    t = t.ravel()
    foe = (Kf @ t) / t[2] if abs(t[2]) > 1e-6 else [np.nan] * 3
    print(f'{a/25:.2f}->{b/25:.2f} frac={frac:.2f} n={len(P):5d} inl={inl.mean():.2f} rot=({rv[0]:+5.2f},{rv[1]:+5.2f},{rv[2]:+5.2f}) t=({t[0]:+.2f},{t[1]:+.2f},{t[2]:+.2f}) foe=({foe[0]:6.0f},{foe[1]:5.0f})')
