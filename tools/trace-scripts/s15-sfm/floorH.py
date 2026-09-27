# floor-plane homography between consecutive frames (SIFT, lower image) -> R, t/d, n per pair
import cv2, numpy as np, pickle
from common import *
f = 819; Kf = K(f)
sift = cv2.SIFT_create(nfeatures=8000, contrastThreshold=0.015)
bf = cv2.BFMatcher(cv2.NORM_L2)
feats = {}
def feat(i):
    if i not in feats:
        g = cv2.imread(f'{SRC}/f{i}.png', 0)
        m = owlmask(i, 1.1).astype(np.uint8) * 255; m[:560] = 0
        k, d = sift.detectAndCompute(g, m)
        feats[i] = (np.float32([p.pt for p in k]), d)
    return feats[i]
out = {}
for a, b in zip(FRAMES[:-1], FRAMES[1:]):
    pa, da = feat(a); pb, db = feat(b)
    if da is None or db is None or len(da) < 10 or len(db) < 10: print(a, 'few'); continue
    mm = bf.knnMatch(da, db, k=2)
    good = [m[0] for m in mm if len(m) == 2 and m[0].distance < 0.8 * m[1].distance]
    P = pa[[m.queryIdx for m in good]]; Q = pb[[m.trainIdx for m in good]]
    if len(P) < 12: print(f'{a/25:.2f} n={len(P)}'); continue
    Hm, inl = cv2.findHomography(P, Q, cv2.RANSAC, 3.0)
    inl = inl.ravel().astype(bool)
    n, Rs, Ts, Ns = cv2.decomposeHomographyMat(Hm, Kf)
    best = None
    for R, T, N in zip(Rs, Ts, Ns):
        N = N.ravel(); T = T.ravel()
        if N[1] > 0: N = -N; T = -T  # normal toward camera: floor below (y down) -> plane normal in cam coords points -y
        score = -N[1]
        if best is None or score > best[0]: best = (score, R, T, N)
    _, R, T, N = best
    rv = cv2.Rodrigues(R)[0].ravel() * 180 / np.pi
    # camera displacement in camera-1 coords (units of camera height d): c = -R^T T
    c = -R.T @ T
    xs = P[inl, 0]; ys = P[inl, 1]
    out[(a, b)] = dict(R=R, T=T, N=N, c=c, ninl=int(inl.sum()))
    print(f'{a/25:.2f} n={len(P):4d} inl={inl.sum():4d} x[{np.percentile(xs,10):5.0f},{np.percentile(xs,90):5.0f}] y[{np.percentile(ys,10):4.0f},{np.percentile(ys,90):4.0f}] N=({N[0]:+.2f},{N[1]:+.2f},{N[2]:+.2f}) rot=({rv[0]:+5.2f},{rv[1]:+5.2f},{rv[2]:+5.2f}) move/h=({c[0]:+.3f},{c[1]:+.3f},{c[2]:+.3f})', flush=True)
pickle.dump(out, open('floorH.pkl', 'wb'))
