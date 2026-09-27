# Per-frame card pose during the lift by chamfer alignment: edge points of the source's own standing card (57.36,
# rectified to card units with the static quad: paper outline, text box, buttons, text, smiley, trash) are
# projected by a homography (the card's 4 corners are the parameters) onto the distance transform of each frame's
# edges; robust least squares, coarse (truncated DT, wide basin) to fine, each frame started from the previous
# one's motion. Measurement only.
import sys, json, numpy as np, cv2
from scipy.optimize import least_squares
from common import frame
CW, CH, M = 465, 648, 12
C = np.float32([[0, 0], [CW, 0], [CW, CH], [0, CH]])
QS = np.float32([[1093.2, 86.9], [1578.4, 50.7], [1686.5, 802.5], [995.7, 774.1]])
Hs = cv2.getPerspectiveTransform(C, QS).astype(np.float64)
Tm = np.array([[1, 0, -M], [0, 1, -M], [0, 0, 1]], np.float64)
src = np.mean([frame(1433), frame(1434)], 0).astype(np.float32)
T = cv2.warpPerspective(src, Hs @ Tm, (CW + 2 * M, CH + 2 * M), flags=cv2.WARP_INVERSE_MAP | cv2.INTER_LINEAR)
def edges(g, lo=25, hi=60, sg=1.4):
    return cv2.Canny(np.clip(cv2.GaussianBlur(g, (0, 0), sg), 0, 255).astype(np.uint8), lo, hi)
Et = edges(T)
ys, xs = np.nonzero(Et)
tp = np.stack([xs - M, ys - M, np.ones_like(xs)], 1).astype(np.float64)       # card units
tp = tp[::2]
def H_of(p): return cv2.getPerspectiveTransform(C, np.float32(p).reshape(4, 2)).astype(np.float64)
def proj(p):
    q = tp @ H_of(p).T; return q[:, 0] / q[:, 2], q[:, 1] / q[:, 2]
def sample(D, u, v):
    n = len(u); w = 1024; h = (n + w - 1) // w; pad = h * w - n
    uu = np.concatenate([u, np.full(pad, -1e4)]).astype(np.float32).reshape(h, w); vv = np.concatenate([v, np.full(pad, -1e4)]).astype(np.float32).reshape(h, w)
    return cv2.remap(D, uu, vv, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=-1).ravel()[:n]
def fit(n, p0, trunc=(40, 16, 6), fscale=(10, 4, 2)):
    I = frame(n).astype(np.float32)
    E = edges(I)
    D = cv2.distanceTransform((E == 0).astype(np.uint8), cv2.DIST_L2, 5).astype(np.float32)
    p = np.float64(p0).ravel()
    for tr, fs in zip(trunc, fscale):
        Dt = np.minimum(D, tr)
        def res(pp):
            u, v = proj(pp); d = sample(Dt, u, v)
            d[d < 0] = tr * 0.5            # off frame: neutral
            return d
        r = least_squares(res, p, loss='soft_l1', f_scale=fs, diff_step=1e-3, max_nfev=150, x_scale=3.0)
        p = r.x
    u, v = proj(p); d = sample(np.minimum(D, 20), u, v); d = d[d >= 0]
    return p.reshape(4, 2), float(np.median(d)), float(np.mean(d < 2))
if __name__ == '__main__':
    times = [float(t) for t in sys.argv[1].split(',')]
    init = json.load(open(sys.argv[2])); out = sys.argv[3]
    init = {round(r[0], 2): np.array(r[1:], float).reshape(4, 2) for r in init}
    res = []; prev = None; prev2 = None
    for t in times:
        if prev is None: p0 = init[round(t, 2)]
        elif prev2 is None: p0 = prev[1]
        else: p0 = prev[1] + 0.6 * (prev[1] - prev2[1])    # damped constant velocity
        q, med, frac = fit(int(round(t * 25)), p0)
        prev2, prev = prev, (t, q)
        res.append([t] + [round(float(v), 1) for v in q.ravel()])
        print(t, 'median edge dist', round(med, 2), 'within 2px', round(frac, 2), np.round(q, 1).tolist(), flush=True)
        json.dump(res, open(out, 'w'))
