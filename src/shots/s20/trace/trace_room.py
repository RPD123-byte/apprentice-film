# Room tracer for s20 (MEASUREMENT script, not loaded by the film). Input: a pre-grade composite (composite.py) —
# output: control data only, no pixels:
#   levels  — the surface value study: a median-filtered (line-free) copy of the drawing posterised into value bands,
#             each band's outline rings (with holes; fill even-odd), RDP-simplified;
#   bright  — centre-lines of the white ink lines (Hessian ridges brighter than the surface): x, y, width, value;
#   dark    — centre-lines of the dark ink lines on lit surfaces (valleys): x, y, width, value.
# The film redraws these with its own taper engine (s20/roomtrace.js).
import numpy as np, cv2, json
from skimage.morphology import skeletonize, remove_small_objects
from skimage.filters import apply_hysteresis_threshold
from skimage.feature import hessian_matrix, hessian_matrix_eigvals
from scipy.spatial import cKDTree

LEVELS = [0.035, 0.07, 0.11, 0.16, 0.22, 0.29, 0.37, 0.46, 0.56, 0.67, 0.78, 0.88]

def rdp(P, eps):
    if len(P) < 3: return list(P)
    a, b = P[0], P[-1]; ab = b - a; L = np.linalg.norm(ab) + 1e-9
    dd = np.abs(ab[0] * (P[1:-1, 1] - a[1]) - ab[1] * (P[1:-1, 0] - a[0])) / L
    i = int(np.argmax(dd)) + 1
    if dd[i - 1] > eps: return rdp(P[:i + 1], eps)[:-1] + rdp(P[i:], eps)
    return [a, b]

def regions(base, mask, levels=LEVELS, eps=1.1, minarea=14, blur=0.8):
    b = cv2.GaussianBlur(base, (0, 0), blur) if blur else base
    out = []
    for k, T in enumerate(levels):
        hi = levels[k + 1] if k + 1 < len(levels) else 1.01
        band = (base > T) & (base <= hi) & (mask > 0)
        v = float(np.median(base[band])) if band.sum() > 50 else (T + min(hi, 1.0)) / 2
        m = ((b > T) & (mask > 0)).astype(np.uint8)
        cs, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
        rings = []
        for c in cs:
            if abs(cv2.contourArea(c)) < minarea: continue
            a = cv2.approxPolyDP(c, eps, True)[:, 0, :]
            if len(a) < 3: continue
            rings.append(a.astype(np.int32).tolist())
        out.append({'t': T, 'v': round(v, 3), 'rings': rings})
    return out

def _paths(m):
    sk = skeletonize(m).astype(np.uint8)
    ys, xs = np.nonzero(sk); pts = set(zip(xs.tolist(), ys.tolist()))
    nb = lambda p: [(p[0] + dx, p[1] + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if (dx or dy) and (p[0] + dx, p[1] + dy) in pts]
    deg = {p: len(nb(p)) for p in pts}
    used = set(); paths = []
    def walkp(p0, p1):
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
                if (p, q) not in used: paths.append(walkp(p, q))
    for p in sorted(pts):
        for q in nb(p):
            if (p, q) not in used: paths.append(walkp(p, q))
    paths = [np.array(P, float) for P in paths if len(P) >= 3]
    # re-join ends that line up
    if not paths: return []
    E = []
    for i, P in enumerate(paths):
        for wh in (0, 1):
            if wh == 0: p = P[0]; q = P[min(len(P) - 1, 5)]
            else: p = P[-1]; q = P[max(0, len(P) - 6)]
            t = p - q; E.append((i, wh, p, t / (np.linalg.norm(t) + 1e-9)))
    tree = cKDTree(np.array([e[2] for e in E]))
    cand = []
    for a, b in tree.query_pairs(7.0):
        i, wi, pi, ti = E[a]; j, wj, pj, tj = E[b]
        if i == j: continue
        dv = pj - pi; dist = np.linalg.norm(dv)
        if np.dot(ti, -tj) < 0.75: continue
        if dist > 1.5:
            u = dv / dist
            if np.dot(ti, u) + (-np.dot(tj, u)) < 1.3: continue
        cand.append((dist - 3 * np.dot(ti, -tj), a, b))
    cand.sort(); link = {}
    for sc, a, b in cand:
        if a in link or b in link: continue
        link[a] = b; link[b] = a
    seen = set(); chains = []
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
        chains.append(np.vstack(parts))
    for i, P in enumerate(paths):
        if i not in seen: chains.append(P)
    return chains

def strokes(f, base, mask, polarity, sig=1.1, hi=0.10, lo=0.05, cmin=0.05, minlen=6, smooth=5, eps=0.6, sigs=(1.1, 2.0)):
    """polarity +1 = bright lines (ridges above the surface), -1 = dark lines."""
    # work on the mask's bounding box only (+ a margin for the filters), then shift the points back
    ys, xs = np.nonzero(mask)
    if len(xs) == 0: return []
    pad = 12
    y0, y1 = max(0, ys.min() - pad), min(f.shape[0], ys.max() + pad + 1)
    x0, x1 = max(0, xs.min() - pad), min(f.shape[1], xs.max() + pad + 1)
    if (y1 - y0) * (x1 - x0) < 0.9 * f.size:
        res = strokes(f[y0:y1, x0:x1], base[y0:y1, x0:x1], mask[y0:y1, x0:x1], polarity, sig, hi, lo, cmin, minlen, smooth, eps, sigs)
        return [[[p[0] + x0, p[1] + y0] + p[2:] for p in row] for row in res]
    H, W = f.shape
    r = (f - base) * polarity
    ridge = None
    for sg in sigs:
        Hm = hessian_matrix(f, sigma=sg, order='rc', use_gaussian_derivatives=True)
        ev = hessian_matrix_eigvals(Hm)       # ev[0] >= ev[1]
        rr = (np.maximum(0, -ev[1]) if polarity > 0 else np.maximum(0, ev[0])) * sg * sg
        ridge = rr if ridge is None else np.maximum(ridge, rr)
    ridge[(r < cmin) | (mask == 0)] = 0
    m = apply_hysteresis_threshold(ridge, lo, hi)
    m = remove_small_objects(m, 8)
    dt = cv2.distanceTransform(m.astype(np.uint8), cv2.DIST_L2, 3)
    chains = _paths(m)
    rp = np.maximum(0, r)
    res = []
    for P in chains:
        L = np.sum(np.hypot(*np.diff(P, axis=0).T))
        if L < minlen: continue
        if len(P) > smooth and smooth > 1:
            k = np.ones(smooth) / smooth; A = P.copy(); h = smooth // 2
            A[h:-h, 0] = np.convolve(P[:, 0], k, 'valid'); A[h:-h, 1] = np.convolve(P[:, 1], k, 'valid'); P = A
        S = np.array(rdp(P, eps))
        row = []
        for k in range(len(S)):
            x, y = S[k]
            t = S[min(len(S) - 1, k + 1)] - S[max(0, k - 1)]; t = t / (np.linalg.norm(t) + 1e-9); nrm = np.array([-t[1], t[0]])
            prof = []; vals = []
            for o in np.arange(-7, 7.01, 0.5):
                xi, yi = int(round(x + nrm[0] * o)), int(round(y + nrm[1] * o))
                if 0 <= xi < W and 0 <= yi < H: prof.append(float(rp[yi, xi])); vals.append(float(f[yi, xi]))
                else: prof.append(0.0); vals.append(0.0)
            prof = np.array(prof); vals = np.array(vals); c = len(prof) // 2
            win = prof[c - 3:c + 4]; pk = win.max(); ic = c - 3 + int(np.argmax(win))
            lo_ = ic
            while lo_ > 0 and prof[lo_ - 1] > 0.2 * pk: lo_ -= 1
            hi_ = ic
            while hi_ < len(prof) - 1 and prof[hi_ + 1] > 0.2 * pk: hi_ += 1
            I = prof[lo_:hi_ + 1].sum() * 0.5
            w = min(I / max(pk, 1e-3), 2 * float(dt[min(H - 1, int(round(y))), min(W - 1, int(round(x)))]) + 2.0)
            v = float(vals[ic]); bv = float(base[min(H - 1, max(0, int(round(y)))), min(W - 1, max(0, int(round(x))))])
            row.append([round(float(x), 1), round(float(y), 1), round(max(0.5, w), 1), round(min(1, max(0, v)), 3), round(bv, 3)])
        res.append(row)
    return res

def surfaces(f, mode='median', K=9, C=5):
    u8 = np.clip(f * 255, 0, 255).astype(np.uint8)
    if mode == 'median':
        return cv2.medianBlur(u8, K).astype(np.float32) / 255
    # 'close': dark lines narrower than C removed (lit surface), bright lines kept
    se = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (C, C))
    c = cv2.morphologyEx(u8, cv2.MORPH_CLOSE, se)
    return cv2.medianBlur(c, 3).astype(np.float32) / 255

def opened(f, C=5):
    u8 = np.clip(f * 255, 0, 255).astype(np.uint8)
    se = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (C, C))
    return cv2.medianBlur(cv2.morphologyEx(u8, cv2.MORPH_OPEN, se), 3).astype(np.float32) / 255

def trace(f, mask, mode='median', K=9, C=5, use_bright=True, **kw):
    base = surfaces(f, mode, K, C)
    out = {'levels': regions(base, mask, **kw.get('reg', {}))}
    out['bright'] = strokes(f, opened(f, C), mask, +1, **kw.get('bright', {})) if use_bright else []
    out['dark'] = strokes(f, base, mask, -1, **kw.get('dark', {}))
    return out, base
