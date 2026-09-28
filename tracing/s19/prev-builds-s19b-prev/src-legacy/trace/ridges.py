# Ridge tracer for the s19 room (measurement only). A multi-scale Hessian ridge measure picks out the strokes of
# the scratchboard (bright lines on black, or dark lines inside bright areas); hysteresis threshold, skeleton,
# junction-split paths re-joined where their ends line up, smoothed, RDP-simplified. Each stroke is a list of
# [x, y, w, v]: frame px, full width px (ink mass / peak of the cross profile), value 0..1 at the spine.
import numpy as np, cv2
from skimage.feature import hessian_matrix, hessian_matrix_eigvals
from skimage.morphology import skeletonize, remove_small_objects
from skimage.filters import apply_hysteresis_threshold
from scipy.spatial import cKDTree

def ridge_measure(P, sigmas, polarity):
    """scale-normalised ridge strength, thinned by non-maximum suppression across the ridge (normal = the
    Hessian eigenvector of the strongest curvature)"""
    best = np.zeros_like(P); nx = np.zeros_like(P); ny = np.zeros_like(P)
    for sg in sigmas:
        Hrr, Hrc, Hcc = hessian_matrix(P, sigma=sg, order='rc', use_gaussian_derivatives=True)
        tmp = np.sqrt((Hrr - Hcc) ** 2 + 4 * Hrc ** 2)
        l1 = (Hrr + Hcc + tmp) / 2; l2 = (Hrr + Hcc - tmp) / 2      # l1 >= l2
        lam = l2 if polarity > 0 else l1
        r = np.maximum(0, -lam if polarity > 0 else lam) * sg * sg
        # eigenvector for lam: (Hrc, lam - Hrr) in (row, col)
        er, ec = Hrc, lam - Hrr
        bad = (np.abs(er) + np.abs(ec)) < 1e-9
        er = np.where(bad, 1.0, er); ec = np.where(bad, 0.0, ec)
        nn = np.hypot(er, ec); er /= nn; ec /= nn
        up = r > best; best[up] = r[up]; ny[up] = er[up]; nx[up] = ec[up]
    H, W = P.shape
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    a = cv2.remap(best, xx + nx, yy + ny, cv2.INTER_LINEAR)
    b = cv2.remap(best, xx - nx, yy - ny, cv2.INTER_LINEAR)
    thin = best * ((best >= a) & (best >= b))
    return thin, best, nx, ny

def chains(sk):
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
    return [np.array(P, float) for P in paths if len(P) >= 3]

def merge(paths, rad=9.0, align=0.75):
    def endinfo(P, which):
        if which == 0: p = P[0]; q = P[min(len(P) - 1, 5)]
        else: p = P[-1]; q = P[max(0, len(P) - 6)]
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
    cand.sort(); link = {}
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
            seen.add(i); parts.append(paths[i] if wh == 0 else paths[i][::-1])
            other = 2 * i + (1 - wh)
            if other in link: cur = link[other]
            else: break
        out.append(np.vstack(parts))
    for i, P in enumerate(paths):
        if i not in seen: out.append(P)
    return out

def follow(R, Rf, NX, NY, hi, lo, turn=0.6, maxlen=4000):
    """ridge following: from the strongest unvisited crest pixel, step 1 px along the ridge both ways, snapping
    to the crest across it each step; stop below lo, on a sharp turn, or on reaching an already traced stroke"""
    H, W = R.shape
    vis = np.zeros((H, W), np.uint8)
    ys, xs = np.nonzero(R > hi)
    order = np.argsort(-R[ys, xs])
    def samp(A, x, y):
        x0, y0 = int(np.floor(x)), int(np.floor(y))
        if x0 < 0 or y0 < 0 or x0 >= W - 1 or y0 >= H - 1: return 0.0
        fx, fy = x - x0, y - y0
        return (A[y0, x0] * (1 - fx) * (1 - fy) + A[y0, x0 + 1] * fx * (1 - fy) + A[y0 + 1, x0] * (1 - fx) * fy + A[y0 + 1, x0 + 1] * fx * fy)
    paths = []
    offs = (-1.5, -1.0, -0.5, 0.0, 0.5, 1.0, 1.5)
    for k in order:
        y, x = int(ys[k]), int(xs[k])
        if vis[y, x]: continue
        halves = []
        for sgn in (1, -1):
            px, py = float(x), float(y)
            tx, ty = -NY[y, x] * sgn, NX[y, x] * sgn
            pts = []
            for step in range(maxlen):
                qx, qy = px + tx, py + ty
                xi, yi = int(round(qx)), int(round(qy))
                if xi < 1 or yi < 1 or xi >= W - 1 or yi >= H - 1: break
                nx_, ny_ = NX[yi, xi], NY[yi, xi]
                best, bo = -1, 0
                for o in offs:
                    r = samp(Rf, qx + nx_ * o, qy + ny_ * o)
                    if r > best: best, bo = r, o
                qx, qy = qx + nx_ * bo, qy + ny_ * bo
                if best < lo: break
                xi, yi = int(round(qx)), int(round(qy))
                if vis[yi, xi] and step > 1: break
                dx, dy = qx - px, qy - py; d = np.hypot(dx, dy) or 1; dx /= d; dy /= d
                if dx * tx + dy * ty < np.cos(turn): break
                # new tangent from the local ridge, aligned with the motion
                ntx, nty = -NY[yi, xi], NX[yi, xi]
                if ntx * dx + nty * dy < 0: ntx, nty = -ntx, -nty
                tx, ty = 0.5 * (ntx + dx), 0.5 * (nty + dy); n = np.hypot(tx, ty) or 1; tx /= n; ty /= n
                px, py = qx, qy; pts.append((px, py))
            halves.append(pts)
        P = halves[1][::-1] + [(float(x), float(y))] + halves[0]
        if len(P) >= 3:
            A = np.array(P)
            paths.append(A)
            cv2.polylines(vis, [np.round(A).astype(np.int32)], False, 1, 1)
        else:
            vis[y, x] = 1
    return paths

def rdp(P, eps):
    if len(P) < 3: return list(P)
    a, b = P[0], P[-1]; ab = b - a; L = np.linalg.norm(ab) + 1e-9
    dd = np.abs(ab[0] * (P[1:-1, 1] - a[1]) - ab[1] * (P[1:-1, 0] - a[0])) / L
    i = int(np.argmax(dd)) + 1
    if dd[i - 1] > eps: return rdp(P[:i + 1], eps)[:-1] + rdp(P[i:], eps)
    return [a, b]

def trace(P, mask, polarity=1, sigmas=(1.0, 1.6, 2.5, 3.6), hi=0.05, lo=0.02, minlen=8, eps=0.8, bgr=7, maxw=16, smooth=5, psf=0.75, basemap=None, lenw=2.0):
    H, W = P.shape
    R, Rfull, NX, NY = ridge_measure(P, sigmas, polarity)
    R[mask == 0] = 0
    Rf = Rfull * (mask > 0)
    paths = follow(R, Rf, NX, NY, hi, lo)
    # Each cross profile is read as a bar of width w and height a on a background b, seen through the source's
    # softness (Gaussian PSF, sigma SP): peak/mass = erf(w / (2 sqrt2 SP)) / w gives w, then a = mass / w.
    from scipy.special import erf
    SP = psf
    wt = np.linspace(0.3, maxw, 600); rt = erf(wt / (2 * np.sqrt(2) * SP)) / wt     # decreasing in w
    Q = P * polarity
    Bq = None if basemap is None else basemap
    res = []
    offs = np.arange(-maxw / 2 - 3, maxw / 2 + 3.01, 0.5)
    c = len(offs) // 2
    for Pp in paths:
        L = np.sum(np.hypot(*np.diff(Pp, axis=0).T))
        if L < minlen: continue
        if len(Pp) > smooth + 2 and smooth > 1:
            kk = np.ones(smooth) / smooth; h = smooth // 2; A = Pp.copy()
            A[h:-h, 0] = np.convolve(Pp[:, 0], kk, 'valid'); A[h:-h, 1] = np.convolve(Pp[:, 1], kk, 'valid'); Pp = A
        # resample every ~2.5 px for measuring; simplified afterwards (geometry + width/value tolerance)
        seg = np.hypot(*np.diff(Pp, axis=0).T); cum = np.concatenate([[0], np.cumsum(seg)])
        nS = max(2, int(np.ceil(cum[-1] / 2.5)) + 1)
        u = np.linspace(0, cum[-1], nS)
        Sx = np.stack([np.interp(u, cum, Pp[:, 0]), np.interp(u, cum, Pp[:, 1])], 1)
        row = []
        for j in range(len(Sx)):
            x, y = Sx[j]
            t = Sx[min(len(Sx) - 1, j + 1)] - Sx[max(0, j - 1)]; t = t / (np.linalg.norm(t) + 1e-9); nrm = np.array([-t[1], t[0]])
            # average three parallel profiles (±1 px along the stroke) against grain
            prof = 0
            for sft in (-1.0, 0.0, 1.0):
                fx = x + nrm[0] * offs + t[0] * sft; fy = y + nrm[1] * offs + t[1] * sft
                prof = prof + cv2.remap(Q, fx.astype(np.float32).reshape(1, -1), fy.astype(np.float32).reshape(1, -1), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)[0]
            prof = np.convolve(prof / 3, [0.25, 0.5, 0.25], 'same')
            ci = c - 3 + int(np.argmax(prof[c - 3:c + 4]))
            for _ in range(8):                       # climb to the crest (the spine may sit up to ~4 px off it)
                if ci > 0 and prof[ci - 1] > prof[ci]: ci -= 1
                elif ci < len(prof) - 1 and prof[ci + 1] > prof[ci]: ci += 1
                else: break
            lo_ = ci
            while lo_ > 0 and prof[lo_ - 1] <= prof[lo_] + 0.003: lo_ -= 1
            hi_ = ci
            while hi_ < len(prof) - 1 and prof[hi_ + 1] <= prof[hi_] + 0.003: hi_ += 1
            b = max(prof[lo_], prof[hi_]); pk = prof[ci] - b
            M = np.clip(prof[lo_:hi_ + 1] - b, 0, None).sum() * 0.5
            if pk <= 1e-4 or M <= 1e-4: w = 0.7; a = max(0.0, pk)
            else:
                r = pk / M
                w = float(np.interp(-r, -rt, wt))
                w = max(w, M / 0.95, 0.8); a = M / w      # unresolvably thin lines keep their ink mass at >= 0.8 px
            xi, yi = min(W - 1, max(0, int(round(x)))), min(H - 1, max(0, int(round(y))))
            bb = 0.0 if Bq is None else min(b, float(Bq[yi, xi]) * polarity) if polarity > 0 else b
            v = (a + bb) * polarity if polarity > 0 else (prof[ci]) * polarity
            if polarity < 0: v = -b - a                 # dark strokes: background minus the bar's depth
            row.append([float(x), float(y), float(offs[ci]) if abs(offs[ci]) <= 3 else 0.0, nrm[0], nrm[1], round(float(min(maxw, max(0.5, w))), 1), round(float(min(1, max(0, v))), 3)])
        # snap the spine to the crest, with the offsets smoothed along the stroke (no zig-zag)
        o = np.array([r[2] for r in row])
        if len(o) >= 5:
            from scipy.ndimage import median_filter, uniform_filter1d
            o = uniform_filter1d(median_filter(o, 5, mode='nearest'), 3, mode='nearest')
        wv = np.array([[r[5], r[6]] for r in row])
        if len(wv) >= 3:
            from scipy.ndimage import median_filter, uniform_filter1d
            wv = uniform_filter1d(median_filter(wv, (3, 1), mode='nearest'), 3, axis=0, mode='nearest')
        row = [[round(r[0] + r[3] * o[k] + 0.5, 2), round(r[1] + r[4] * o[k] + 0.5, 2), round(float(wv[k, 0]), 2), round(float(wv[k, 1]), 3)] for k, r in enumerate(row)]
        ww = np.mean([r[2] for r in row])
        if L < max(minlen, lenw * ww): continue          # blobs (short and fat) are not strokes
        res.append(simplify(row, eps))
    return res

def simplify(row, eps, wtol=0.3, vtol=0.06):
    # keep a point if dropping it moves the spine by more than eps, or its width / value off the interpolation
    R = np.array(row, float)
    if len(R) <= 2: return row
    keep = [0]
    def ok(i0, i1):
        a, b = R[i0], R[i1]
        for k in range(i0 + 1, i1):
            f = (k - i0) / (i1 - i0); m = a + (b - a) * f
            ab = b[:2] - a[:2]; L = np.hypot(*ab) + 1e-9
            dgeo = abs(ab[0] * (R[k, 1] - a[1]) - ab[1] * (R[k, 0] - a[0])) / L
            if dgeo > eps or abs(R[k, 2] - m[2]) > wtol * max(1.0, m[2]) or abs(R[k, 3] - m[3]) > vtol: return False
        return True
    i = 0
    while i < len(R) - 1:
        j = i + 1
        while j + 1 < len(R) and ok(i, j + 1): j += 1
        keep.append(j); i = j
    return [row[k] for k in keep]
