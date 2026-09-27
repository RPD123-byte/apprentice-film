#!/usr/bin/env python3
# trace3.py: r3 stroke tracer for s06 (measurement only; the film never loads this or any image).
# Differences from trace/trace.py (which skeletonised hysteresis blobs, so close parallel hatching merged into
# crackle): the centre-lines come from NON-MAXIMUM SUPPRESSION of a scale-normalised Hessian ridge measure across the
# line's own normal, with the scale chosen per pixel, so lines 3-4 px apart stay separate; the centre is refined to
# sub-pixel by a parabola fit across the normal; chains are joined by end direction and smoothed before measuring.
# Each point stores x, y, width (ink mass / peak of the cross profile), the value at the centre and the local ground
# — no pixels are kept.
#
# as a module: trace(pre, mask, **params) -> list of strokes [[x,y,w,v,b], ...]
import cv2, numpy as np
from scipy import ndimage as ndi
from skimage.morphology import skeletonize
from skimage.filters import apply_hysteresis_threshold
from scipy.spatial import cKDTree


def ground_of(pre, r=7, blur=2.0, mode='close'):
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (r, r))
    g = cv2.GaussianBlur(pre, (0, 0), 0.7)
    if mode == 'close': gr = cv2.erode(cv2.dilate(g, k), k)
    else: gr = cv2.dilate(cv2.erode(g, k), k)
    return cv2.GaussianBlur(gr, (0, 0), blur)


def hessian(D, s):
    Dxx = ndi.gaussian_filter(D, s, order=(0, 2)); Dyy = ndi.gaussian_filter(D, s, order=(2, 0)); Dxy = ndi.gaussian_filter(D, s, order=(1, 1))
    return Dxx, Dxy, Dyy


def ridge_field(D, sigmas, gamma=1.5):
    """bright ridges of D: strength (scale-normalised -lambda_min), unit normal (nx, ny), best sigma."""
    best = np.zeros_like(D); nx = np.zeros_like(D); ny = np.zeros_like(D); sg = np.zeros_like(D)
    for s in sigmas:
        Dxx, Dxy, Dyy = hessian(D, s)
        tr = (Dxx + Dyy) / 2; q = np.sqrt(((Dxx - Dyy) / 2) ** 2 + Dxy ** 2)
        lmin = tr - q
        r = np.maximum(0, -lmin) * s ** gamma
        # eigenvector of lmin: angle th + 90deg where th = 0.5 atan2(2Dxy, Dxx - Dyy) is the lmax direction
        th = 0.5 * np.arctan2(2 * Dxy, Dxx - Dyy) + np.pi / 2
        m = r > best
        best[m] = r[m]; nx[m] = np.cos(th[m]); ny[m] = np.sin(th[m]); sg[m] = s
    return best, nx, ny, sg


def bil(A, x, y):
    h, w = A.shape
    x = np.clip(x, 0, w - 1.001); y = np.clip(y, 0, h - 1.001)
    i = np.floor(x).astype(int); j = np.floor(y).astype(int); a = x - i; b = y - j
    return A[j, i] * (1 - a) * (1 - b) + A[j, i + 1] * a * (1 - b) + A[j + 1, i] * (1 - a) * b + A[j + 1, i + 1] * a * b


def nms(R, nx, ny):
    h, w = R.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    r1 = bil(R, xx + nx, yy + ny); r2 = bil(R, xx - nx, yy - ny)
    return (R >= r1) & (R >= r2)


def chains_of(sk):
    ys, xs = np.nonzero(sk); pts = set(zip(xs.tolist(), ys.tolist()))
    nb = lambda p: [(p[0] + dx, p[1] + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if (dx or dy) and (p[0] + dx, p[1] + dy) in pts]
    deg = {p: len(nb(p)) for p in pts}
    used = set(); paths = []
    def walk(p0, p1):
        path = [p0, p1]; used.add((p0, p1)); used.add((p1, p0))
        while True:
            cur = path[-1]
            if deg[cur] != 2: break
            nx_ = [q for q in nb(cur) if q != path[-2] and (cur, q) not in used]
            if not nx_: break
            q = nx_[0]; used.add((cur, q)); used.add((q, cur)); path.append(q)
        return path
    for p in sorted(pts):
        if deg[p] != 2:
            for q in nb(p):
                if (p, q) not in used: paths.append(walk(p, q))
    for p in sorted(pts):
        for q in nb(p):
            if (p, q) not in used: paths.append(walk(p, q))
    return [np.array(Q, float) for Q in paths if len(Q) >= 2]


def join(paths, radius=6.0, mincos=0.8):
    def endinfo(Q, which):
        k = min(len(Q) - 1, 4)
        if which == 0: p = Q[0]; q = Q[k]
        else: p = Q[-1]; q = Q[-1 - k]
        t = p - q; return p, t / (np.linalg.norm(t) + 1e-9)
    E = []
    for i, Q in enumerate(paths):
        for wh in (0, 1): p, t = endinfo(Q, wh); E.append((i, wh, p, t))
    link = {}
    if E:
        tree = cKDTree(np.array([e[2] for e in E]))
        cand = []
        for a, b in tree.query_pairs(radius):
            i, wi, pi, ti = E[a]; j, wj, pj, tj = E[b]
            if i == j: continue
            dv = pj - pi; dist = np.linalg.norm(dv)
            if np.dot(ti, -tj) < mincos: continue
            if dist > 1.5:
                u = dv / dist
                if np.dot(ti, u) < 0.7 or -np.dot(tj, u) < 0.7: continue
            cand.append((dist - 4 * np.dot(ti, -tj), a, b))
        cand.sort()
        for sc, a, b in cand:
            if a in link or b in link: continue
            link[a] = b; link[b] = a
    seen = set(); out = []
    for start in range(len(E)):
        i, wh = E[start][0], E[start][1]
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
        out.append(np.vstack(parts))
    for i, Q in enumerate(paths):
        if i not in seen: out.append(Q)
    return out


def resample(Q, step):
    d = np.hypot(*np.diff(Q, axis=0).T); S = np.concatenate([[0], np.cumsum(d)]); L = S[-1]
    if L < 1e-6: return Q[:1]
    n = max(2, int(round(L / step)) + 1)
    s = np.linspace(0, L, n)
    return np.stack([np.interp(s, S, Q[:, 0]), np.interp(s, S, Q[:, 1])], 1)


def smooth_open(Q, k):
    if len(Q) < 2 * k + 1 or k < 1: return Q
    A = Q.copy(); ker = np.ones(2 * k + 1) / (2 * k + 1)
    for c in range(2):
        e = np.concatenate([np.repeat(Q[:1, c], k), Q[:, c], np.repeat(Q[-1:, c], k)])
        A[:, c] = np.convolve(e, ker, 'valid')
    A[0], A[-1] = Q[0], Q[-1]
    return A


def trace(pre, mask, sigmas=(0.9, 1.3, 1.9, 2.8), gamma=1.5, lo=0.012, hi=0.03, dmin=0.03, ground_r=7, ground_blur=2.0,
          minlen=6, step=2.0, smooth=2, prof=7, join_r=6.0, bright=False, ground=None, maxw=None, subpix=True):
    """pre: ungraded value 0..1 (full frame); mask: bool (where strokes may be). Returns strokes, debug dict."""
    ys, xs = np.nonzero(mask)
    if len(xs) == 0: return [], {}
    P = int(4 * max(sigmas) + prof + 4)
    H, W = pre.shape
    cx0, cy0, cx1, cy1 = max(0, xs.min() - P), max(0, ys.min() - P), min(W, xs.max() + P + 1), min(H, ys.max() + P + 1)
    G = pre[cy0:cy1, cx0:cx1].astype(np.float32)
    M = mask[cy0:cy1, cx0:cx1]
    if bright: G = 1 - G
    gr = ground_of(G, ground_r, ground_blur) if ground is None else (1 - ground if bright else ground)[cy0:cy1, cx0:cx1]
    D = np.maximum(0, gr - G)
    R, nx, ny, sg = ridge_field(D, sigmas, gamma)
    keep = nms(R, nx, ny) & M & (cv2.GaussianBlur(D, (0, 0), 0.8) >= dmin)
    Rk = np.where(keep, R, 0)
    m = apply_hysteresis_threshold(Rk, lo, hi)
    sk = skeletonize(m | (ndi.binary_dilation(m) & keep)) if False else skeletonize(m)
    paths = chains_of(sk)
    paths = [Q for Q in paths if len(Q) >= 2]
    chains = join(paths, join_r)
    D0 = D
    out = []
    for Q in chains:
        L = np.sum(np.hypot(*np.diff(Q, axis=0).T))
        if L < minlen: continue
        Q = smooth_open(Q, smooth)
        # sub-pixel: move each point to the parabola peak of D across the local normal
        if subpix:
            Q2 = Q.copy()
            for k in range(len(Q)):
                a = Q[max(0, k - 2)]; b = Q[min(len(Q) - 1, k + 2)]; t = b - a; t /= (np.linalg.norm(t) + 1e-9); n_ = np.array([-t[1], t[0]])
                vals = [float(bil(D0, np.array(Q[k, 0] + n_[0] * o), np.array(Q[k, 1] + n_[1] * o))) for o in (-1, 0, 1)]
                den = vals[0] - 2 * vals[1] + vals[2]
                if den < -1e-6:
                    off = 0.5 * (vals[0] - vals[2]) / den
                    if abs(off) <= 1: Q2[k] = Q[k] + n_ * off
            Q = smooth_open(Q2, 1)
        S = resample(Q, step)
        if len(S) < 2: continue
        row = []
        for k in range(len(S)):
            x, y = S[k]
            t = S[min(len(S) - 1, k + 1)] - S[max(0, k - 1)]; t = t / (np.linalg.norm(t) + 1e-9); n_ = np.array([-t[1], t[0]])
            offs = np.arange(-prof, prof + 0.01, 0.5)
            pr = bil(D0, x + n_[0] * offs, y + n_[1] * offs)
            c = len(pr) // 2
            pk = pr[c - 2:c + 3].max()
            lo_, hi_ = c, c
            while lo_ > 0 and pr[lo_ - 1] > 0.15 * pk and pr[lo_ - 1] <= pr[lo_] + 0.03 * pk: lo_ -= 1
            while hi_ < len(pr) - 1 and pr[hi_ + 1] > 0.15 * pk and pr[hi_ + 1] <= pr[hi_] + 0.03 * pk: hi_ += 1
            I = pr[lo_:hi_ + 1].sum() * 0.5
            ww = I / max(pk, 1e-4)
            if maxw: ww = min(ww, maxw)
            bgv = float(bil(gr, np.array(x), np.array(y)))
            cv = bgv - pk
            if bright: bgv, cv = 1 - bgv, 1 - cv
            row.append([round(float(x + cx0), 2), round(float(y + cy0), 2), round(max(0.5, float(ww)), 2), round(float(cv), 4), round(float(bgv), 4)])
        out.append(row)
    dbg = {'box': (cx0, cy0, cx1, cy1), 'R': R, 'keep': keep, 'sk': sk, 'D': D, 'ground': gr}
    return out, dbg


def draw_dbg(pre, strokes, box, zoom=2, color=(0, 0, 255)):
    x0, y0, x1, y1 = box
    im = cv2.cvtColor((np.clip(pre[y0:y1, x0:x1], 0, 1) * 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
    im = cv2.resize(im, None, fx=zoom, fy=zoom, interpolation=cv2.INTER_CUBIC) // 2 + 60
    for s in strokes:
        A = np.asarray(s, np.float64).reshape(-1, 5)
        p = (A[:, :2] - [x0, y0]) * zoom
        cv2.polylines(im, [np.round(p * 8).astype(np.int32)], False, color, 1, cv2.LINE_AA, shift=3)
    return im
