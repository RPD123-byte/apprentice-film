# Ridge tracer for s05 (measurement script, not loaded by the film).
# ridge_paths(Y, polarity, ...) -> list of strokes, each an (n,4) array: x, y, width (px), value (0..1, pre-grade)
# Y: float32 luminance 0..1 (pre-grade). polarity +1 = bright lines on darker ground, -1 = dark lines on lighter ground.
import numpy as np, cv2
from skimage.feature import hessian_matrix, hessian_matrix_eigvals
from skimage.morphology import skeletonize, remove_small_objects
from skimage.filters import apply_hysteresis_threshold
from scipy.spatial import cKDTree
import os
SIGMAS = tuple(float(v) for v in os.environ.get('SIGMAS', '1.0,1.6').split(','))

ORIENT_BINS = int(os.environ.get('OBINS', 0))     # >0: trace each line direction separately (crosshatching)

def ridge_strength(Y, polarity, sigmas=(1.0, 1.6), with_angle=False):
    R = None; ANG = None
    for sg in sigmas:
        Hrr, Hrc, Hcc = hessian_matrix(Y, sigma=sg, order='rc', use_gaussian_derivatives=True)
        ev = hessian_matrix_eigvals([Hrr, Hrc, Hcc])          # ev[0] >= ev[1]
        r = (np.maximum(0, -ev[1]) if polarity > 0 else np.maximum(0, ev[0])) * sg * sg
        if with_angle:
            # the line runs along the eigenvector of the other eigenvalue; angle of the curvature direction:
            # 0.5*atan2(2 Hrc, Hrr - Hcc) is the direction (in (row, col)) of the larger eigenvalue's eigenvector
            th = 0.5 * np.arctan2(2 * Hrc, Hrr - Hcc)            # principal axis (row, col) of ev[0]
            if polarity > 0: th = th + np.pi / 2                   # bright line: curvature along ev[1]'s axis
            # line direction = perpendicular to the curvature axis; express as an angle in [0, pi) in (x, y)
            ang = np.mod(th + np.pi / 2, np.pi)
        if R is None: R, ANG = r, (ang if with_angle else None)
        else:
            if with_angle: ANG = np.where(r > R, ang, ANG)
            R = np.maximum(R, r)
    return (R, ANG) if with_angle else R

def _paths_from_skeleton(sk):
    ys, xs = np.nonzero(sk); pts = set(zip(xs.tolist(), ys.tolist()))
    def nb(p): return [(p[0]+dx, p[1]+dy) for dx in (-1,0,1) for dy in (-1,0,1) if (dx or dy) and (p[0]+dx, p[1]+dy) in pts]
    deg = {p: len(nb(p)) for p in pts}
    used = set(); paths = []
    def walk(p0, p1):
        path = [p0, p1]; used.add((p0, p1)); used.add((p1, p0))
        while True:
            cur = path[-1]
            if deg[cur] != 2: break
            nx = [q for q in nb(cur) if q != path[-2] and (cur, q) not in used]
            if not nx: break
            q = nx[0]; used.add((cur, q)); used.add((q, cur)); path.append(q)
        return path
    for p in sorted(pts):
        if deg[p] != 2:
            for q in nb(p):
                if (p, q) not in used: paths.append(walk(p, q))
    for p in sorted(pts):
        for q in nb(p):
            if (p, q) not in used: paths.append(walk(p, q))
    return [np.array(P, float) for P in paths if len(P) >= 2]

def _link(paths, rad=6.0, align=0.7):
    def endinfo(P, which):
        if which == 0: p = P[0]; q = P[min(len(P)-1, 5)]
        else: p = P[-1]; q = P[max(0, len(P)-6)]
        t = p - q; return p, t / (np.linalg.norm(t) + 1e-9)
    E = []
    for i, P in enumerate(paths):
        for wh in (0, 1): p, t = endinfo(P, wh); E.append((i, wh, p, t))
    if not E: return paths
    tree = cKDTree(np.array([e[2] for e in E]))
    cand = []
    for a, b in tree.query_pairs(rad):
        i, wi, pi, ti = E[a]; j, wj, pj, tj = E[b]
        if i == j: continue
        dv = pj - pi; dist = np.linalg.norm(dv)
        if np.dot(ti, -tj) < align: continue
        if dist > 1.5:
            u = dv / dist
            if np.dot(ti, u) + (-np.dot(tj, u)) < 1.3: continue
        cand.append((dist - 3 * np.dot(ti, -tj), a, b))
    cand.sort()
    link = {}
    for sc, a, b in cand:
        if a in link or b in link: continue
        link[a] = b; link[b] = a
    seen = set(); chains = []
    for start in range(len(E)):
        i = E[start][0]
        if i in seen or start in link: continue
        cur = start; parts = []
        while True:
            i, wh = E[cur][0], E[cur][1]
            if i in seen: break
            seen.add(i)
            parts.append(paths[i] if wh == 0 else paths[i][::-1])
            other = 2 * i + (1 - wh)
            if other in link: cur = link[other]
            else: break
        chains.append(np.vstack(parts))
    for i, P in enumerate(paths):
        if i not in seen: chains.append(P)
    return chains

def rdp(P, eps):
    if len(P) < 3: return list(P)
    a, b = P[0], P[-1]; ab = b - a; L = np.linalg.norm(ab) + 1e-9
    dd = np.abs(ab[0] * (P[1:-1, 1] - a[1]) - ab[1] * (P[1:-1, 0] - a[0])) / L
    i = int(np.argmax(dd)) + 1
    if dd[i-1] > eps: return rdp(P[:i+1], eps)[:-1] + rdp(P[i:], eps)
    return [a, b]

def bilinear(img, x, y):
    H, W = img.shape
    x = np.clip(x, 0, W - 1.001); y = np.clip(y, 0, H - 1.001)
    x0 = np.floor(x).astype(int); y0 = np.floor(y).astype(int); fx = x - x0; fy = y - y0
    return (img[y0, x0] * (1-fx) * (1-fy) + img[y0, x0+1] * fx * (1-fy) + img[y0+1, x0] * (1-fx) * fy + img[y0+1, x0+1] * fx * fy)

def ridge_paths(Y, polarity, hi, lo, minlen=5, sigmas=SIGMAS, mask=None, eps=0.6, smooth=5, maxw=7.0):
    if ORIENT_BINS > 0:
        R, ANG = ridge_strength(Y, polarity, sigmas, with_angle=True)
        if mask is not None: R = R * mask
        paths = []
        K = ORIENT_BINS
        b = np.floor(ANG / (np.pi / K) + 0.5).astype(int) % K
        for kk in range(K):
            Rk = np.where(b == kk, R, 0)
            m = apply_hysteresis_threshold(Rk, lo, hi)
            m = remove_small_objects(m, 6)
            paths += _paths_from_skeleton(skeletonize(m))
        paths = _link(paths)
    else:
        R = ridge_strength(Y, polarity, sigmas)
        if mask is not None: R = R * mask
        m = apply_hysteresis_threshold(R, lo, hi)
        m = remove_small_objects(m, 6)
        sk = skeletonize(m)
        paths = _link(_paths_from_skeleton(sk))
    Ys = cv2.GaussianBlur(Y, (0, 0), 0.6)
    out = []
    offs = np.arange(-7, 7.01, 0.5)
    for P in paths:
        L = np.sum(np.hypot(*np.diff(P, axis=0).T)) if len(P) > 1 else 0
        if L < minlen: continue
        if len(P) > smooth and smooth > 1:
            k = np.ones(smooth) / smooth; h = smooth // 2; A = P.copy()
            A[h:-h, 0] = np.convolve(P[:, 0], k, 'valid'); A[h:-h, 1] = np.convolve(P[:, 1], k, 'valid'); P = A
        S = np.array(rdp(P, eps))
        if len(S) < 2: continue
        # densify so that width/value are sampled at least every 4 px
        Q = [S[0]]
        for k in range(1, len(S)):
            d = np.linalg.norm(S[k] - S[k-1]); n = int(np.ceil(d / 4.0))
            for j in range(1, n + 1): Q.append(S[k-1] + (S[k] - S[k-1]) * j / n)
        S = np.array(Q)
        rows = []
        for k in range(len(S)):
            x, y = S[k]
            t = S[min(len(S)-1, k+1)] - S[max(0, k-1)]; t = t / (np.linalg.norm(t) + 1e-9); nrm = np.array([-t[1], t[0]])
            prof = bilinear(Ys, x + nrm[0] * offs, y + nrm[1] * offs) * polarity
            c = len(offs) // 2
            j = c - 2 + int(np.argmax(prof[c-2:c+3])); pk = prof[j]
            # base: the lower flank on each side (min within 6 px)
            bl = prof[max(0, j-12):j+1].min(); br = prof[j:j+13].min(); base = max(bl, br)
            half = (pk + base) / 2
            a = j
            while a > 0 and prof[a-1] > half: a -= 1
            b = j
            while b < len(prof) - 1 and prof[b+1] > half: b += 1
            # sub-sample edges
            def cross(i0, i1):
                v0, v1 = prof[i0], prof[i1]
                return offs[i0] + (offs[i1] - offs[i0]) * ((v0 - half) / (v0 - v1 + 1e-9))
            ea = cross(a, a-1) if a > 0 else offs[a]
            eb = cross(b, b+1) if b < len(prof) - 1 else offs[b]
            w = min(maxw, max(0.5, eb - ea))
            cx, cy = x + nrm[0] * (ea + eb) / 2, y + nrm[1] * (ea + eb) / 2
            rows.append([cx + 0.5, cy + 0.5, w, pk * polarity, (pk - base)])   # canvas coords (pixel centre = i + 0.5)
        rows = np.array(rows)
        out.append(rows)
    return out, R
