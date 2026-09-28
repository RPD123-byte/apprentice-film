# pairwise SIFT matches (owl masked) between consecutive unique frames -> saved keypoint pairs + E fits
import cv2, numpy as np, sys, pickle
from common import *
f = 819; Kf = K(f)
sift = cv2.SIFT_create(nfeatures=6000, contrastThreshold=0.02)
feats = {}
def feat(i):
    if i not in feats:
        g = cv2.imread(f'{SRC}/f{i}.png', 0)
        m = owlmask(i).astype(np.uint8) * 255
        k, d = sift.detectAndCompute(g, m)
        feats[i] = (np.float32([p.pt for p in k]), d)
    return feats[i]
bf = cv2.BFMatcher(cv2.NORM_L2)
res = {}
for a, b in zip(FRAMES[:-1], FRAMES[1:]):
    pa, da = feat(a); pb, db = feat(b)
    mm = bf.knnMatch(da, db, k=2)
    good = [m[0] for m in mm if len(m) == 2 and m[0].distance < 0.8 * m[1].distance]
    P = pa[[m.queryIdx for m in good]]; Q = pb[[m.trainIdx for m in good]]
    # motion gate: at most 300 px per frame
    ok = np.hypot(*(Q - P).T) < 350
    P, Q = P[ok], Q[ok]
    E, inl = cv2.findEssentialMat(P, Q, Kf, cv2.RANSAC, 0.999, 1.5)
    n, R, t, m2 = cv2.recoverPose(E, P, Q, Kf, mask=inl.copy())
    inl = inl.ravel().astype(bool)
    rv = cv2.Rodrigues(R)[0].ravel() * 180 / np.pi; t = t.ravel()
    foe = (Kf @ t) / t[2]
    res[(a, b)] = (P[inl], Q[inl])
    print(f'{a/25:.2f}->{b/25:.2f} n={len(P):4d} inl={inl.sum():4d} rot=({rv[0]:+5.2f},{rv[1]:+5.2f},{rv[2]:+5.2f}) t=({t[0]:+.2f},{t[1]:+.2f},{t[2]:+.2f}) foe=({foe[0]:6.0f},{foe[1]:5.0f})', flush=True)
pickle.dump(res, open('sift_pairs.pkl', 'wb'))
