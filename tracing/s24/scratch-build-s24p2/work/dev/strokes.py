# Fine dark ink strokes the tone levels miss: residual of (tone raster, softened like the film) minus the plate,
# Hessian ridge measure on the plate, hysteresis threshold, skeleton split at junctions, each branch ordered, smoothed,
# RDP-simplified; per point: width = ink mass / peak depth of the residual profile, value = the plate's darkest value
# at the ridge. Measurement only: output is centre lines with width and grey value.
import sys, json; sys.path.insert(0, '.')
import numpy as np, cv2
from skimage.morphology import skeletonize, remove_small_objects
from skimage.filters import apply_hysteresis_threshold
from skimage.feature import hessian_matrix, hessian_matrix_eigvals
from scipy.ndimage import map_coordinates, convolve
from tone import raster, rdp
def strokes(P, M, levels_json, offset=(0, 0), HI=14, LO=6, MINL=10, SIG=1.0, soft=0.6, eps=0.6, box=None):
    ox, oy = offset
    L = [{'v': l['v'], 'paths': [np.array(p) - [ox, oy] for p in l['paths']]} for l in levels_json]
    H, W = P.shape
    R = raster(L, (H, W), ss=2)
    R = cv2.GaussianBlur(R, (0, 0), soft)
    Pm = np.where(M > 0, P, 0).astype(np.float32)
    D = np.clip(R - Pm, 0, None) * (cv2.erode(M, np.ones((5, 5), np.uint8)) > 0)
    Hm = hessian_matrix(Pm, sigma=SIG, order='rc', use_gaussian_derivatives=True)
    ev = hessian_matrix_eigvals(Hm)
    ridge = np.maximum(0, ev[0]) * SIG * SIG
    ridge[D < 5] = 0
    m = apply_hysteresis_threshold(ridge, LO, HI)
    m = remove_small_objects(m, 8)
    sk = skeletonize(m).astype(np.uint8)
    # split at junctions
    nbc = convolve(sk, np.ones((3, 3), np.uint8), mode='constant') - 1
    junc = (sk > 0) & (nbc > 2)
    sk2 = sk.copy(); sk2[cv2.dilate(junc.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0] = 0
    n, lab = cv2.connectedComponents(sk2, connectivity=8)
    out = []
    ys_all, xs_all = np.nonzero(sk2)
    order = np.argsort(lab[ys_all, xs_all])
    labs = lab[ys_all, xs_all][order]; ys_all = ys_all[order]; xs_all = xs_all[order]
    starts = np.searchsorted(labs, np.arange(1, n)); ends = np.searchsorted(labs, np.arange(1, n), side='right')
    for ci in range(n - 1):
        ys, xs = ys_all[starts[ci]:ends[ci]], xs_all[starts[ci]:ends[ci]]
        if len(ys) < MINL * 0.7: continue
        pts = set(zip(xs.tolist(), ys.tolist()))
        def nb(p): return [(p[0] + dx, p[1] + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if (dx or dy) and (p[0] + dx, p[1] + dy) in pts]
        ends_ = [p for p in pts if len(nb(p)) <= 1]
        cur = ends_[0] if ends_ else next(iter(pts))
        path = [cur]; seen = {cur}
        while True:
            nx = [q for q in nb(cur) if q not in seen]
            if not nx: break
            # prefer 4-neighbours
            nx.sort(key=lambda q: abs(q[0] - cur[0]) + abs(q[1] - cur[1]))
            cur = nx[0]; path.append(cur); seen.add(cur)
        Pp = np.array(path, float)
        Ls = np.sum(np.hypot(*np.diff(Pp, axis=0).T)) if len(Pp) > 1 else 0
        if Ls < MINL: continue
        if len(Pp) > 5:
            k = np.ones(5) / 5; A = Pp.copy(); A[2:-2, 0] = np.convolve(Pp[:, 0], k, 'valid'); A[2:-2, 1] = np.convolve(Pp[:, 1], k, 'valid'); Pp = A
        S = rdp(Pp, eps)
        if len(S) < 2: S = Pp[[0, -1]]
        row = []
        for j in range(len(S)):
            x, y = S[j]
            t = S[min(len(S) - 1, j + 1)] - S[max(0, j - 1)]; t = t / (np.linalg.norm(t) + 1e-9); nrm = np.array([-t[1], t[0]])
            ss = np.arange(-5, 5.01, 0.5)
            Q = np.array([x, y])[None] + ss[:, None] * nrm[None]
            prof = map_coordinates(D, [Q[:, 1], Q[:, 0]], order=1)
            pv = map_coordinates(Pm, [Q[:, 1], Q[:, 0]], order=1)
            c = len(ss) // 2
            pk = prof[c - 2:c + 3].max()
            lo = c
            while lo > 0 and prof[lo - 1] > 0.2 * pk: lo -= 1
            hi = c
            while hi < len(prof) - 1 and prof[hi + 1] > 0.2 * pk: hi += 1
            w = float(np.clip(prof[lo:hi + 1].sum() * 0.5 / max(pk, 1), 0.6, 6))
            v = float(pv[c - 2:c + 3].min())
            row.append([round(x + ox, 2), round(y + oy, 2), round(w, 2), round(v, 1)])
        out.append(row)
    return out
