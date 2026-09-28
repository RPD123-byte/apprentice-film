# align an SfM stretch to the s15 world: floor plane y = 0 (RANSAC on points below the camera path), camera height
# 0.33, world z = the mean travel direction projected on the floor. Prints per-frame camera (eye, yaw, pitch, roll)
# in the s15 convention and saves the aligned points.
import numpy as np, pickle, sys, cv2
import ba
from common import W, H
HC = 0.33
def align(out, floor_band=(0.25, 3.0), iters=3000, seed=1):
    X, C, rv = out['X'], out['C'], out['rv']
    # SfM world = camera-0 coords (x right, y down, z forward). floor = points "below" (y > 0 in cam coords), fit plane
    rng = np.random.default_rng(seed)
    # candidate floor points: below the camera path by a margin and within a forward range
    path = C
    cand = []
    for j, x in enumerate(X):
        k = np.argmin(np.linalg.norm(path - x, axis=1))
        dy = x[1] - path[k][1]
        if dy > 0.05 * np.linalg.norm(path[-1] - path[0]) / len(path) * 0 + 0.0: cand.append(j)
    P = X[cand]
    best = (0, None)
    for _ in range(iters):
        s = P[rng.choice(len(P), 3, replace=False)]
        n = np.cross(s[1] - s[0], s[2] - s[0]); ln = np.linalg.norm(n)
        if ln < 1e-9: continue
        n /= ln
        if n[1] < 0: n = -n
        if n[1] < 0.8: continue   # roughly horizontal (camera y down)
        d = (P - s[0]) @ n
        sc = np.median(np.abs((C - s[0]) @ n))
        inl = np.abs(d) < 0.02 * sc
        if inl.sum() > best[0]: best = (inl.sum(), (n, s[0], inl))
    n, p0, inl = best[1]
    # refine plane by least squares on inliers
    Q = P[inl]; c = Q.mean(0); u, s_, vt = np.linalg.svd(Q - c); n = vt[2]
    if n[1] < 0: n = -n
    h = np.median((c - C) @ n)   # camera height above the floor (floor is +n side, y down)
    return n, c, h, inl.sum(), len(P)
if __name__ == '__main__':
    out = pickle.load(open(sys.argv[1], 'rb'))
    n, c, h, ni, np_ = align(out)
    print('floor normal (cam0, y down)', n.round(3), 'height', round(float(h), 3), 'inliers', ni, '/', np_)
    C = out['C']; hs = (c - C) @ n
    print('per-frame height', np.round(hs, 3))
