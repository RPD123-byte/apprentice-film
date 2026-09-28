# the lens shard's rigid motion (similarity) frame to frame, ECC on the blurred grey inside the shard mask, chained
# from 2848 (measurement only)
import cv2, numpy as np, json
M = '/Users/computer/rootline/apprentice-film/snapshots/s26c-meas'
exec(open('slabfit.py').read().split('def rectMask')[0])
Q2 = 2
def prep(F):
    s = cv2.imread(f'{M}/src/{F}.png'); g = cv2.cvtColor(s, cv2.COLOR_BGR2GRAY).astype(np.float32)
    g = cv2.GaussianBlur(g, (0, 0), 3); g = cv2.resize(g, (W // Q2, H // Q2), interpolation=cv2.INTER_AREA)
    m = cv2.resize(maskF(F), (W // Q2, H // Q2), interpolation=cv2.INTER_NEAREST)
    m = cv2.erode(m, np.ones((15, 15), np.uint8))
    return g, m
G = {F: prep(F) for F in range(2844, 2854)}
def ecc(Fa, Fb, init):
    ga, ma = G[Fa]; gb, mb = G[Fb]
    warp = init.astype(np.float32).copy()
    try:
        cc, warp = cv2.findTransformECC(ga, gb, warp, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 200, 1e-5), ma, 5)
    except cv2.error as e:
        return None, init
    return cc, warp
# warp maps template (Fa) coords to input (Fb) coords: xb = W xa. Chain from 2848 outward.
T = {2848: np.eye(2, 3, dtype=np.float32)}
for a, b in [(2848, 2849), (2849, 2850), (2850, 2851), (2851, 2852), (2852, 2853), (2848, 2847), (2847, 2846), (2846, 2845), (2845, 2844)]:
    init = np.eye(2, 3, dtype=np.float32)
    # initial guess: shift of the mask centroids
    ya, xa = np.nonzero(G[a][1]); yb, xb = np.nonzero(G[b][1])
    if len(xa) and len(xb): init[0, 2] = xb.mean() - xa.mean(); init[1, 2] = yb.mean() - ya.mean()
    cc, w = ecc(a, b, init)
    A = np.vstack([w, [0, 0, 1]]); Ta = np.vstack([T[a], [0, 0, 1]])
    T[b] = (A @ Ta)[:2]
    print(a, '->', b, 'cc', None if cc is None else round(cc, 3), np.round(w, 3).tolist())
out = {}
for F, t in sorted(T.items()):
    t = t.copy(); t[:, 2] *= Q2   # to full res (linear part unchanged)
    out[F] = t.tolist()
    s = np.sqrt(abs(np.linalg.det(t[:, :2]))); ang = np.degrees(np.arctan2(t[1, 0], t[0, 0]))
    print(F, 'scale %.3f rot %.1f t (%.0f, %.0f)' % (s, ang, t[0, 2], t[1, 2]))
json.dump(out, open(f'{M}/slabmotion.json', 'w'))
