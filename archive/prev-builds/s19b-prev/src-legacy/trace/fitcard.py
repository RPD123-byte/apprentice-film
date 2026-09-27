# Per-frame card homography during the lift (61.48–63.08), measured by direct image alignment: the source's own
# standing card (57.36, rectified to card units with the static quad) is the template; each frame is aligned to it
# on high-passed intensities with a robust loss (the owl in front of the card is rejected as outliers), started
# from the previous frame's fit. Output: the card's outer corners (TL, TR, BR, BL of the 465 x 648 card) per frame.
import sys, json, numpy as np, cv2
from scipy.optimize import least_squares
from common import frame
CW, CH, M = 465, 648, 14
C = np.float32([[0, 0], [CW, 0], [CW, CH], [0, CH]])
QS = np.float32([[1093.2, 86.9], [1578.4, 50.7], [1686.5, 802.5], [995.7, 774.1]])
def hp(g): return g - cv2.GaussianBlur(g, (0, 0), 12)
Hs = cv2.getPerspectiveTransform(C, QS)
src = np.mean([frame(1433), frame(1434)], 0).astype(np.float32)
# template in card units (1 px / unit) with a margin M
Tm = np.array([[1, 0, -M], [0, 1, -M], [0, 0, 1]], np.float64)
Hts = Hs @ Tm                                  # template px -> frame
T = cv2.warpPerspective(src, np.linalg.inv(Hts), (CW + 2 * M, CH + 2 * M), flags=cv2.WARP_INVERSE_MAP | cv2.INTER_LINEAR) if False else cv2.warpPerspective(src, Hts, (CW + 2 * M, CH + 2 * M), flags=cv2.WARP_INVERSE_MAP | cv2.INTER_LINEAR)
Thp = hp(T)
# template sample points: the card (rounded corners) plus a thin band outside its edge
mk = np.zeros(T.shape, np.uint8); cv2.rectangle(mk, (M - 6, M - 6), (M + CW + 6, M + CH + 6), 1, -1)
ys, xs = np.nonzero(mk)
sel = ((xs + ys) % 3 == 0)
xs, ys = xs[sel].astype(np.float32), ys[sel].astype(np.float32)
tv = Thp[ys.astype(int), xs.astype(int)]
tpts = np.stack([xs, ys, np.ones_like(xs)], 1)
def quad_to_H(q):
    return cv2.getPerspectiveTransform(C, np.float32(q).reshape(4, 2)).astype(np.float64) @ Tm
def resid(p, Ihp, tv):
    Hh = quad_to_H(p)
    q = tpts @ Hh.T; u = q[:, 0] / q[:, 2]; v = q[:, 1] / q[:, 2]
    n = len(u); w = 1024; hgt = (n + w - 1) // w; pad = hgt * w - n
    uu = np.concatenate([u, np.full(pad, -1e4)]).astype(np.float32).reshape(hgt, w); vv = np.concatenate([v, np.full(pad, -1e4)]).astype(np.float32).reshape(hgt, w)
    iv = cv2.remap(Ihp, uu, vv, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=np.nan).ravel()[:n]
    r = iv - tv
    r[~np.isfinite(r)] = 0
    return r
def fit(n, q0, scale=6.0, levels=(16, 8, 4, 1.5, 0)):
    # coarse to fine: blurred high-pass images first (wide basin), then sharp
    I = frame(n).astype(np.float32); Ihp = hp(I)
    p = np.float64(q0).ravel()
    for sg in levels:
        Il = cv2.GaussianBlur(Ihp, (0, 0), sg) if sg else Ihp
        Tl = cv2.GaussianBlur(Thp, (0, 0), sg) if sg else Thp
        tvl = Tl[ys.astype(int), xs.astype(int)]
        if sg == levels[0]: c0 = float(np.median(np.abs(resid(p, Ihp, tv))))
        sub = 5 if sg >= 8 else (2 if sg >= 4 else 1)
        global tpts
        full = tpts; tpts = full[::sub]
        r = least_squares(resid, p, args=(Il, tvl[::sub]), loss='soft_l1', f_scale=scale * (0.5 if sg else 1), diff_step=1e-3, max_nfev=60, x_scale=2.0)
        tpts = full
        p = r.x
    c1 = float(np.median(np.abs(resid(p, Ihp, tv))))
    return p.reshape(4, 2), c0, c1
if __name__ == '__main__':
    # sequential tracking: python3 fitcard.py t0,t1,... start.json out.json   (start.json: the pose at t0)
    times = [float(t) for t in sys.argv[1].split(',')]
    q = np.array(json.load(open(sys.argv[2]))[0][1:], float).reshape(4, 2)
    out = []; prev = prev2 = None
    for t in times:
        n = int(round(t * 25))
        if prev is not None and np.abs(frame(n) - frame(n - 1)).mean() < 4.5:
            # the source repeats a frame (61.56, 62.56): hold the pose
            out.append([t] + [round(float(v), 1) for v in prev.ravel()]); print(t, 'repeat', flush=True); continue
        if prev is None: q0 = q
        elif prev2 is None: q0 = prev
        else: q0 = prev + 0.6 * (prev - prev2)
        q, c0, c1 = fit(n, q0)
        prev2, prev = prev, q
        out.append([t] + [round(float(v), 1) for v in q.ravel()])
        print(t, 'median |r|', round(c0, 2), '->', round(c1, 2), np.round(q, 1).tolist(), flush=True)
        json.dump(out, open(sys.argv[3], 'w'))
