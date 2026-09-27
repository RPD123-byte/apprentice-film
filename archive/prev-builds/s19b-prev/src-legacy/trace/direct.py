# Direct photometric refinement of the card homography (measurement only): the source's own standing card
# (57.32/57.36 average, rectified) is the template; the frame is compared on high-passed intensities over the card's
# upper part (v < VMAX units: text, text box, smiley — above the owl for most of the lift), robust loss (the owl and
# the room in front of / behind the card are outliers), coarse to fine. Also usable on the whole card.
import sys, json, numpy as np, cv2
from scipy.optimize import least_squares
import linemeas as LM
from common import frame
CW, CH, M = 465, 648, 14
QS = np.float64([[1093.2, 86.9], [1578.4, 50.7], [1686.5, 802.5], [995.7, 774.1]])
Tm = np.array([[1, 0, -M], [0, 1, -M], [0, 0, 1]], np.float64)
src = np.mean([frame(1433), frame(1434)], 0).astype(np.float32)
T = cv2.warpPerspective(src, LM.Hq(QS) @ Tm, (CW + 2 * M, CH + 2 * M), flags=cv2.WARP_INVERSE_MAP | cv2.INTER_LINEAR)
def hp(g, s=10): return g - cv2.GaussianBlur(g, (0, 0), s)
Thp = hp(T)
def pts(vmin=-8, vmax=440, step=2):
    ys, xs = np.mgrid[0:CH + 2 * M:step, 0:CW + 2 * M:step]
    u = xs.ravel() - M; v = ys.ravel() - M
    k = (u >= -8) & (u <= CW + 8) & (v >= vmin) & (v <= vmax)
    return u[k].astype(float), v[k].astype(float), xs.ravel()[k], ys.ravel()[k]
def sample(I, x, y):
    n = len(x); w = 1024; h = (n + w - 1) // w; pad = h * w - n
    xx = np.concatenate([x, np.full(pad, -1e4)]).astype(np.float32).reshape(h, w); yy = np.concatenate([y, np.full(pad, -1e4)]).astype(np.float32).reshape(h, w)
    return cv2.remap(I, xx, yy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=np.nan).ravel()[:n]
def refine(n, q0, vmax=440, levels=((8, 4), (4, 3), (2, 2), (0.8, 2)), fs=5.0, lam=0.0, qprior=None):
    I = frame(n).astype(np.float32); Ihp = hp(I)
    u, v, tx, ty = pts(vmax=vmax, step=1)
    q = np.float64(q0).ravel(); info = []
    GRID = np.array([(a, b) for a in np.linspace(0, CW, 7) for b in np.linspace(0, vmax, 7)], float)
    Pp = None if qprior is None else LM.ph(LM.Hq(np.array(qprior).reshape(4, 2)), GRID)
    for sg, st in levels:
        k = ((tx % st) == 0) & ((ty % st) == 0)
        # keep the template points that are in view at the start of this level (fixed set; one that leaves the
        # frame during the solve costs a constant, so moving the card out of view is never rewarded)
        P0 = LM.ph(LM.Hq(q.reshape(4, 2)), np.c_[u[k], v[k]])
        m = 6 + 3 * sg
        k[k] = (P0[:, 0] > m) & (P0[:, 0] < I.shape[1] - m) & (P0[:, 1] > m) & (P0[:, 1] < I.shape[0] - m)
        uu, vv = u[k], v[k]
        Il = cv2.GaussianBlur(Ihp, (0, 0), sg); Tl = cv2.GaussianBlur(Thp, (0, 0), sg)
        tv = Tl[ty[k], tx[k]]
        def f(p):
            H = LM.Hq(p.reshape(4, 2)); P = LM.ph(H, np.c_[uu, vv])
            iv = sample(Il, P[:, 0], P[:, 1]); r = iv - tv; r[~np.isfinite(r)] = 3 * fs
            if Pp is not None: r = np.r_[r, (LM.ph(H, GRID) - Pp).ravel() * lam]
            return r
        r = least_squares(f, q, loss='soft_l1', f_scale=fs, x_scale=3.0, max_nfev=80, diff_step=1e-4)
        q = r.x; info.append(round(float(np.median(np.abs(r.fun))), 2))
    return q.reshape(4, 2), info
if __name__ == '__main__':
    kp = json.load(open('/Users/computer/rootline/apprentice-film/snapshots/s19-fix2-ref/keyposes.json'))
    for t in sys.argv[1].split(','):
        q0 = np.array(kp[t], float).reshape(4, 2)
        q, info = refine(int(round(float(t) * 25)), q0 + np.array([[15, -10]] * 4))
        F = np.array([(85, 215), (380, 215), (44.8, 153.8), (424, 153.8), (0, 300), (465, 300)], float)
        d = np.hypot(*(LM.ph(LM.Hq(q), F) - LM.ph(LM.Hq(q0), F)).T)
        print(t, info, 'feature diffs vs keypose', np.round(d, 1).tolist(), flush=True)
