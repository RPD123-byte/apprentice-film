# s16 tracer (measurement only; never loaded by the film).
# Reads source frames, inverts the film's grade, and writes GEOMETRY: tone-level outlines (polygons with a value)
# and ink strokes (centre-lines with a width and a value per point). No pixels are written to the output.
import cv2, numpy as np, json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
import grade as GR
from skimage.morphology import skeletonize, remove_small_objects
from skimage.filters import apply_hysteresis_threshold
from skimage.feature import hessian_matrix, hessian_matrix_eigvals
from scipy.spatial import cKDTree

SRC = '/Users/computer/apprentice-film-src'  # unused
FR = '/Users/computer/rootline/apprentice-film/snapshots/s16-h1-src'
W, H = 2206, 946

def frame(f):
    return cv2.imread(f'{FR}/f{f}.png')

PRE = '/Users/computer/rootline/apprentice-film/snapshots/s16-h1-src'
def pre(f):
    """pre-grade luminance (0..1) of source frame f (cached by snapshots/s16-p2-tools/cachepre.py)"""
    if os.path.exists(f'{PRE}/p{f}.npy'): return np.load(f'{PRE}/p{f}.npy')
    im = frame(f)[..., ::-1].astype(np.float32) / 255
    p = GR.ungrade(im, f / 25.0)
    return p.mean(2).astype(np.float32)

# ------------------------------------------------------------------ tone levels
def _area(a):
    x, y = a[:, 0], a[:, 1]
    return 0.5 * float(np.sum(x * np.roll(y, -1) - np.roll(x, -1) * y))

def offset_ring(a, d, grow=True):
    """move a closed polygon's vertices d px along their normals: grow=True enlarges the enclosed area (outer
    boundaries), grow=False shrinks it (holes, so the region around them grows)"""
    n = len(a)
    if n < 3: return a
    prev = np.roll(a, 1, 0); nxt = np.roll(a, -1, 0)
    def unit_normal(e):
        l = np.linalg.norm(e, axis=1, keepdims=True) + 1e-9
        return np.stack([e[:, 1], -e[:, 0]], 1) / l
    n1 = unit_normal(a - prev); n2 = unit_normal(nxt - a)
    nv = n1 + n2; ln = np.linalg.norm(nv, axis=1, keepdims=True)
    nv = np.where(ln > 1e-6, nv / (ln + 1e-9), n1)
    cosh = np.clip((nv * n1).sum(1, keepdims=True), 0.5, 1.0)       # miter, limited to 2 d
    off = nv * (d / cosh)
    A0 = abs(_area(a)); Ap = abs(_area(a + off))
    s = 1.0 if (Ap > A0) == grow else -1.0
    return a + s * off

OFFSET = 0.4   # half a pixel in theory; 0.4 measured best (the rasteriser counts boundary samples in)

def levels(B, mask, edges, minarea=8, eps=0.7, pad=0):
    """B: base (0..1). edges: thresholds t_1..t_K. Returns [[value, [rings...]], ...] painted in order.
    Each level k is the region B >= t_k (inside mask); its fill value is the mean of B in [t_k, t_k+1).
    Rings are in CANVAS units (pixel edges at integers): the contour through the boundary pixels' centres is moved
    half a pixel outward (holes inward) so a filled ring covers the measured pixels, not half a pixel less."""
    out = []
    ext = [*edges, 2.0]
    for k, t in enumerate(edges):
        m = ((B >= t) & mask).astype(np.uint8)
        if m.sum() < minarea: continue
        band = (B >= t) & (B < ext[k + 1]) & mask
        if band.sum() > 0: v = float(B[band].mean())
        else: v = float(np.clip(t + (min(ext[k + 1], 1.0) - t) / 2, 0, 1))
        cs, hier = cv2.findContours(m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
        rings = []
        for i, c in enumerate(cs):
            if abs(cv2.contourArea(c)) < minarea and len(c) < 12: continue
            a = cv2.approxPolyDP(c, eps, True).reshape(-1, 2).astype(float)
            outer = hier[0][i][3] == -1
            if len(a) < 3:
                if not outer: continue
                a = c.reshape(-1, 2).astype(float)          # a one- or two-pixel speck: keep it as its pixel centres
                if len(a) < 3: a = np.vstack([a, a[-1:] + 0.01, a[:1] + [0.01, 0]]) if len(a) else a
            a = offset_ring(a, OFFSET, grow=outer) + 0.5 - pad
            rings.append(a)
        out.append([v, rings])
    return out

def ring_mask(rings, shape, ss=4):
    """rasterise canvas-unit rings (even-odd) at ss x supersampling"""
    h, w = shape
    m = np.zeros((h * ss, w * ss), np.uint8)
    if rings: cv2.fillPoly(m, [(np.asarray(r) * ss - 0.5).round().astype(np.int32) for r in rings], 1, lineType=cv2.LINE_8)
    return m

def render_levels(L, shape, ss=4, blur=0.0, pad=0):
    h, w = shape
    im = np.zeros((h * ss, w * ss), np.float32)
    for v, rings in L:
        m = ring_mask([np.asarray(r) + pad for r in rings], shape, ss)
        im[m > 0] = v
    im = cv2.resize(im, (w, h), interpolation=cv2.INTER_AREA)
    if blur > 0: im = cv2.GaussianBlur(im, (0, 0), blur)
    return im

# ------------------------------------------------------------------ strokes
def _paths(sk):
    ys, xs = np.nonzero(sk)
    pts = set(zip(xs.tolist(), ys.tolist()))
    nbo = [(dx, dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if dx or dy]
    nb = lambda p: [(p[0] + dx, p[1] + dy) for dx, dy in nbo if (p[0] + dx, p[1] + dy) in pts]
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
    return [np.array(P, float) for P in paths if len(P) >= 3]

def _merge(paths, rad=7.0, align=0.7):
    def endinfo(P, which):
        if which == 0: p = P[0]; q = P[min(len(P) - 1, 5)]
        else: p = P[-1]; q = P[max(0, len(P) - 6)]
        t = p - q; return p, t / (np.linalg.norm(t) + 1e-9)
    E = []
    for i, P in enumerate(paths):
        for wh in (0, 1):
            p, t = endinfo(P, wh); E.append((i, wh, p, t))
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
            if np.dot(ti, u) + (-np.dot(tj, u)) < 1.2: continue
        cand.append((dist - 3 * np.dot(ti, -tj), a, b))
    cand.sort()
    link = {}
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

def _rdp(P, eps):
    if len(P) < 3: return list(P)
    a, b = P[0], P[-1]; ab = b - a; L = np.linalg.norm(ab) + 1e-9
    dd = np.abs(ab[0] * (P[1:-1, 1] - a[1]) - ab[1] * (P[1:-1, 0] - a[0])) / L
    i = int(np.argmax(dd)) + 1
    if dd[i - 1] > eps: return _rdp(P[:i + 1], eps)[:-1] + _rdp(P[i:], eps)
    return [a, b]

def strokes(Y, B, mask, polarity='dark', sigmas=(1.0,), hi=0.06, lo=0.03, minlen=5, dmin=0.03, rdp=0.6, smooth=5,
            merge=True, maxw=6, valley=0.03):
    """Ridges of ink darker (dark) / brighter (bright) than the base B, inside mask. Only true lines: the centre must
    be darker (brighter) than BOTH sides. Returns strokes [[x, y, w, a], ...]: w = width px (ink mass / depth),
    a = strength 0..1 (dark: fraction of the base's value taken away; bright: fraction of the way to white)."""
    s = 1.0 if polarity == 'dark' else -1.0
    D = np.maximum(0, s * (B - Y))
    g = Y if polarity == 'dark' else 1 - Y
    ridge = None
    for sg in sigmas:
        Hm = hessian_matrix(g, sigma=sg, order='rc', use_gaussian_derivatives=True)
        ev = hessian_matrix_eigvals(Hm)
        rr = np.maximum(0, ev[0]) * sg * sg
        ridge = rr if ridge is None else np.maximum(ridge, rr)
    ridge[(D < dmin) | (~mask)] = 0
    m = apply_hysteresis_threshold(ridge, lo, hi)
    m = remove_small_objects(m, max_size=4)
    sk = skeletonize(m).astype(np.uint8)
    paths = _paths(sk)
    if merge: paths = _merge(paths)
    gs = cv2.GaussianBlur(g, (0, 0), 0.5)
    res = []
    def sample(x, y, nr):
        prof = []
        for o in np.arange(-7, 7.01, 0.5):
            xi, yi = int(round(x + nr[0] * o)), int(round(y + nr[1] * o))
            prof.append(float(gs[yi, xi]) if 0 <= xi < gs.shape[1] and 0 <= yi < gs.shape[0] else 0.0)
        return np.array(prof)
    for P in paths:
        L = np.sum(np.hypot(*np.diff(P, axis=0).T))
        if L < minlen: continue
        if len(P) > smooth and smooth > 1:
            k = np.ones(smooth) / smooth; A = P.copy(); h = smooth // 2
            A[h:-h, 0] = np.convolve(P[:, 0], k, 'valid'); A[h:-h, 1] = np.convolve(P[:, 1], k, 'valid'); P = A
        # densely sampled (every ~1.5 px) so invalid parts can be cut out
        d = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(P, axis=0).T))])
        n = max(2, int(d[-1] / 1.5) + 1)
        ss = np.linspace(0, d[-1], n)
        Q = np.stack([np.interp(ss, d, P[:, 0]), np.interp(ss, d, P[:, 1])], 1)
        rows = []; cur = []
        for k in range(len(Q)):
            x, y = Q[k]
            t = Q[min(len(Q) - 1, k + 1)] - Q[max(0, k - 1)]; t = t / (np.linalg.norm(t) + 1e-9); nr = np.array([-t[1], t[0]])
            pr = sample(x, y, nr); c = len(pr) // 2
            # centre = darkest (in g) within +-1.5 px
            j = c - 3 + int(np.argmin(pr[c - 3:c + 4]))
            vc = pr[j]
            left = pr[:j].max() if j > 0 else vc; right = pr[j + 1:].max() if j < len(pr) - 1 else vc
            side = min(left, right)                       # the paper level the line is cut into
            dep = side - vc
            ok = dep >= valley
            if ok:
                # ink mass: sum of (side - profile) over the contiguous dip around the centre
                lo_ = j
                while lo_ > 0 and pr[lo_ - 1] < side - 0.2 * dep: lo_ -= 1
                hi_ = j
                while hi_ < len(pr) - 1 and pr[hi_ + 1] < side - 0.2 * dep: hi_ += 1
                mass = np.maximum(0, side - pr[lo_:hi_ + 1]).sum() * 0.5
                w = mass / max(dep, 1e-4)
                if w > maxw: ok = False
            if ok:
                off = (j - c) * 0.5
                a = dep / max(side, 1e-3)                  # fraction of the paper value removed
                cur.append([round(float(x + nr[0] * off), 1), round(float(y + nr[1] * off), 1), round(max(0.5, w), 2), round(min(1.0, a), 3)])
            else:
                if len(cur) >= 3: rows.append(cur)
                cur = []
        if len(cur) >= 3: rows.append(cur)
        for r in rows:
            A = np.array(r)
            Lr = np.sum(np.hypot(*np.diff(A[:, :2], axis=0).T))
            if Lr < minlen: continue
            # re-smooth the centre offsets a little and thin the points (RDP on position)
            if len(A) >= 5:
                kk = np.ones(3) / 3
                A[1:-1, 0] = np.convolve(A[:, 0], kk, 'valid'); A[1:-1, 1] = np.convolve(A[:, 1], kk, 'valid')
            keep = _rdp_idx(A[:, :2], rdp)
            res.append([[float(A[i, 0]), float(A[i, 1]), float(A[i, 2]), float(A[i, 3])] for i in keep])
    return res

def _rdp_idx(P, eps):
    def rec(i0, i1):
        if i1 - i0 < 2: return [i0, i1]
        a, b = P[i0], P[i1]; ab = b - a; L = np.linalg.norm(ab) + 1e-9
        seg = P[i0 + 1:i1]
        dd = np.abs(ab[0] * (seg[:, 1] - a[1]) - ab[1] * (seg[:, 0] - a[0])) / L
        k = int(np.argmax(dd))
        if dd[k] > eps:
            m = i0 + 1 + k
            return rec(i0, m)[:-1] + rec(m, i1)
        return [i0, i1]
    idx = rec(0, len(P) - 1)
    # keep width/strength detail: also keep points every ~6 samples
    extra = set(range(0, len(P), 4))
    return sorted(set(idx) | extra)

# ------------------------------------------------------------------ preview renderer (approximates the JS taper)
WSHRINK = 0.25   # the rasteriser below counts boundary samples in: narrow the ribbons so the ink mass matches the canvas

def render_strokes(im, S, ss=4, polarity='dark'):
    """alpha model: dark strokes = black at alpha a, bright strokes = white at alpha a (constant per stroke: its mean)"""
    h, w = im.shape
    big = cv2.resize(im, (w * ss, h * ss), interpolation=cv2.INTER_LINEAR)
    tgt = 0.0 if polarity == 'dark' else 1.0
    for st in S:
        if len(st) < 2: continue
        pts = np.array([[p[0], p[1]] for p in st]); ws = np.array([p[2] for p in st]); a = float(np.mean([p[3] for p in st]))
        n = len(pts); L, R = [], []
        for i in range(n):
            p0 = pts[max(0, i - 1)]; p1 = pts[min(n - 1, i + 1)]; d = p1 - p0; d = d / (np.linalg.norm(d) + 1e-9)
            nr = np.array([-d[1], d[0]]); hw = max(0.05, ws[i] / 2 - WSHRINK / 2)
            L.append(pts[i] + nr * hw); R.append(pts[i] - nr * hw)
        poly = np.array(L + R[::-1])
        m = np.zeros(big.shape, np.uint8)
        cv2.fillPoly(m, [((poly + 0.5) * ss - 0.5).round().astype(np.int32)], 1)
        big[m > 0] = big[m > 0] * (1 - a) + tgt * a
    return cv2.resize(big, (w, h), interpolation=cv2.INTER_AREA)

def js_levels(L, name):
    parts = []
    for v, rings in L:
        rs = []
        for r in rings:
            rs.append('[' + ','.join('%g,%g' % (round(p[0] * 2) / 2, round(p[1] * 2) / 2) for p in r) + ']')
        parts.append('[%g,[%s]]' % (round(v, 3), ','.join(rs)))
    return 'export const %s = [\n%s\n];\n' % (name, ',\n'.join(parts))

def js_strokes(S, name):
    lines = []
    for r in S:
        flat = []
        for x, y, w, v in r: flat += [round(x * 2) / 2, round(y * 2) / 2, round(w, 1), round(v, 2)]
        lines.append('[' + ','.join(('%g' % f) for f in flat) + ']')
    return 'export const %s = [\n%s\n];\n' % (name, ',\n'.join(lines))

# ------------------------------------------------------------------ gain fit
def stroke_poly(st):
    pts = np.array([[p[0], p[1]] for p in st]); ws = np.array([p[2] for p in st])
    n = len(pts); L, R = [], []
    for i in range(n):
        p0 = pts[max(0, i - 1)]; p1 = pts[min(n - 1, i + 1)]; d = p1 - p0; d = d / (np.linalg.norm(d) + 1e-9)
        nr = np.array([-d[1], d[0]]); hw = max(0.05, ws[i] / 2 - WSHRINK / 2)
        L.append(pts[i] + nr * hw); R.append(pts[i] - nr * hw)
    return np.array(L + R[::-1])

def coverage(poly, ss=4):
    x0, y0 = np.floor(poly.min(0)).astype(int) - 1; x1, y1 = np.ceil(poly.max(0)).astype(int) + 2
    w, h = x1 - x0, y1 - y0
    m = np.zeros((h * ss, w * ss), np.uint8)
    cv2.fillPoly(m, [(((poly - [x0, y0]) + 0.5) * ss - 0.5).round().astype(np.int32)], 1)
    c = m.reshape(h, ss, w, ss).mean((1, 3))
    return x0, y0, c

def fit_gains(Y, B, groups, box, blur=0.7, gmax=1.5, iters=2, method='fast'):
    """groups: list of (strokes, polarity). Fits one gain per stroke so B + sum(contributions) ~ Y (both blurred).
    Returns new stroke lists with a scaled by the gains (a <= 1)."""
    import scipy.sparse as sp
    from scipy.optimize import lsq_linear
    x0, y0, x1, y1 = box
    Wb, Hb = x1 - x0, y1 - y0
    rows, cols, vals, ub = [], [], [], []
    idx = []
    j = 0
    k = int(np.ceil(blur * 3)); gk = cv2.getGaussianKernel(2 * k + 1, blur); G2 = gk @ gk.T
    for gi, (S, pol) in enumerate(groups):
        for si, st in enumerate(S):
            if len(st) < 2: continue
            a = float(np.mean([p[3] for p in st]))
            px, py, c = coverage(stroke_poly(st))
            c = cv2.filter2D(np.pad(c, k), -1, G2, borderType=cv2.BORDER_CONSTANT); px -= k; py -= k
            h, w = c.shape
            yy, xx = np.nonzero(c > 1e-3)
            gx, gy = xx + px, yy + py
            ok = (gx >= x0) & (gx < x1) & (gy >= y0) & (gy < y1)
            if not ok.any(): continue
            gx, gy, cv = gx[ok], gy[ok], c[yy[ok], xx[ok]]
            base = B[gy, gx]
            contrib = (-a * base * cv) if pol == 'dark' else (a * (1 - base) * cv)
            rows.append((gy - y0) * Wb + (gx - x0)); cols.append(np.full(len(gx), j)); vals.append(contrib)
            ub.append(min(gmax, 1.0 / max(a, 1e-3)))
            idx.append((gi, si)); j += 1
    if j == 0:
        return [[list(map(list, st)) for st in S] for S, _ in groups], np.zeros(0)
    A = sp.csc_matrix((np.concatenate(vals), (np.concatenate(rows), np.concatenate(cols))), shape=(Wb * Hb, j))
    Yb = cv2.GaussianBlur(Y, (0, 0), blur)[y0:y1, x0:x1].ravel(); Bb = cv2.GaussianBlur(B, (0, 0), blur)[y0:y1, x0:x1].ravel()
    ub = np.array(ub)
    if method == 'exact':
        g = lsq_linear(A, Yb - Bb, bounds=(np.zeros(j), ub), lsmr_tol='auto', max_iter=200, verbose=0).x
    else:
        # fast: unconstrained sparse least squares, clip, fix the clipped ones, re-solve the rest (a few rounds)
        from scipy.sparse.linalg import lsqr
        g = np.ones(j); free = np.ones(j, bool); rhs = Yb - Bb
        for it in range(4):
            fixed = ~free
            r = rhs - (A[:, fixed] @ g[fixed] if fixed.any() else 0)
            if free.sum() == 0: break
            sol = lsqr(A[:, free], r, damp=0.02, atol=1e-6, btol=1e-6, iter_lim=400)[0]
            g[free] = sol
            out_lo = free & (g < 0); out_hi = free & (g > ub)
            g = np.clip(g, 0, ub)
            if not (out_lo.any() or out_hi.any()): break
            free = free & ~out_lo & ~out_hi
    out = [[list(map(list, st)) for st in S] for S, _ in groups]
    for (gi, si), gg in zip(idx, g):
        for p in out[gi][si]: p[3] = float(min(1.0, p[3] * gg))
    # drop strokes whose gain went to ~0
    out = [[st for st in S if np.mean([p[3] for p in st]) > 0.01] for S in out]
    return out, g

# ------------------------------------------------------------------ strokes, orientation-separated (hatching)
def strokes2(Y, B, mask, polarity='dark', sigmas=(0.8, 1.4), hi=0.02, lo=0.01, minlen=3, dmin=0.02, valley=0.012,
             nbins=8, maxw=6, rdp=0.6, gap=2):
    """Like strokes(), but the ridge mask is split by line orientation (nbins) before skeletonising, so crossing
    hatch lines are traced as long separate lines instead of a network of short pieces; a line survives up to `gap`
    consecutive samples that fail the valley test (where it crosses another line)."""
    s = 1.0 if polarity == 'dark' else -1.0
    D = np.maximum(0, s * (B - Y))
    g = Y if polarity == 'dark' else 1 - Y
    ridge = None; ang = None
    for sg in sigmas:
        Hr, Hc_, Hcc = hessian_matrix(g, sigma=sg, order='rc', use_gaussian_derivatives=True)
        # eigenvalues of [[Hrr, Hrc],[Hrc, Hcc]]
        tmp = np.sqrt(((Hr - Hcc) / 2) ** 2 + Hc_ ** 2)
        l1 = (Hr + Hcc) / 2 + tmp                      # largest: across a dark line
        rr = np.maximum(0, l1) * sg * sg
        # direction of the largest curvature (row, col) -> the line runs perpendicular to it
        th = 0.5 * np.arctan2(2 * Hc_, Hr - Hcc)      # angle of eigenvector in (r, c) space
        if ridge is None: ridge, ang = rr, th
        else:
            better = rr > ridge; ridge = np.where(better, rr, ridge); ang = np.where(better, th, ang)
    ridge[(D < dmin) | (~mask)] = 0
    m = apply_hysteresis_threshold(ridge, lo, hi)
    # the line direction in image (x, y): eigvec (r, c) = (cos th, sin th) -> across-line dir (x=c, y=r) = (sin, cos);
    # line direction angle = atan2(cos th, sin th) + pi/2, folded to [0, pi)
    lang = (np.arctan2(np.cos(ang), np.sin(ang)) + np.pi / 2) % np.pi
    gs = cv2.GaussianBlur(g, (0, 0), 0.5)
    def sample(x, y, nr):
        prof = []
        for o in np.arange(-7, 7.01, 0.5):
            xi, yi = int(round(x + nr[0] * o)), int(round(y + nr[1] * o))
            prof.append(float(gs[yi, xi]) if 0 <= xi < gs.shape[1] and 0 <= yi < gs.shape[0] else 0.0)
        return np.array(prof)
    allpaths = []
    for b in range(nbins):
        a0 = b * np.pi / nbins
        dd = np.abs(((lang - a0 - np.pi / (2 * nbins)) + np.pi / 2) % np.pi - np.pi / 2)
        mb = m & (dd <= np.pi / (2 * nbins) + 1e-6)
        mb = remove_small_objects(mb, max_size=3)
        if not mb.any(): continue
        sk = skeletonize(mb).astype(np.uint8)
        allpaths += _paths(sk)
    paths = _merge(allpaths, rad=4.0, align=0.85)
    res = []
    for P in paths:
        L = np.sum(np.hypot(*np.diff(P, axis=0).T))
        if L < minlen: continue
        if len(P) > 3:
            k = np.ones(3) / 3; A = P.copy()
            A[1:-1, 0] = np.convolve(P[:, 0], k, 'valid'); A[1:-1, 1] = np.convolve(P[:, 1], k, 'valid'); P = A
        d = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(P, axis=0).T))])
        n = max(2, int(d[-1] / 1.25) + 1)
        ss = np.linspace(0, d[-1], n)
        Q = np.stack([np.interp(ss, d, P[:, 0]), np.interp(ss, d, P[:, 1])], 1)
        rows = []; cur = []; bad = 0
        for k in range(len(Q)):
            x, y = Q[k]
            t = Q[min(len(Q) - 1, k + 1)] - Q[max(0, k - 1)]; t = t / (np.linalg.norm(t) + 1e-9); nr = np.array([-t[1], t[0]])
            pr = sample(x, y, nr); c = len(pr) // 2
            j = c - 2 + int(np.argmin(pr[c - 2:c + 3]))
            vc = pr[j]
            left = pr[:j].max() if j > 0 else vc; right = pr[j + 1:].max() if j < len(pr) - 1 else vc
            side = min(left, right); dep = side - vc
            ok = dep >= valley
            if ok:
                lo_ = j
                while lo_ > 0 and pr[lo_ - 1] < side - 0.2 * dep: lo_ -= 1
                hi_ = j
                while hi_ < len(pr) - 1 and pr[hi_ + 1] < side - 0.2 * dep: hi_ += 1
                mass = np.maximum(0, side - pr[lo_:hi_ + 1]).sum() * 0.5
                w = mass / max(dep, 1e-4)
                if w > maxw: ok = False
            if ok:
                off = (j - c) * 0.5
                cur.append([float(x + nr[0] * off), float(y + nr[1] * off), max(0.5, float(w)), min(1.0, float(dep / max(side, 1e-3)))])
                bad = 0
            else:
                bad += 1
                if bad > gap:
                    if len(cur) >= 3: rows.append(cur)
                    cur = []
        if len(cur) >= 3: rows.append(cur)
        for r in rows:
            A = np.array(r)
            if np.sum(np.hypot(*np.diff(A[:, :2], axis=0).T)) < minlen: continue
            if len(A) >= 5:
                kk = np.ones(3) / 3
                A[1:-1, 0] = np.convolve(A[:, 0], kk, 'valid'); A[1:-1, 1] = np.convolve(A[:, 1], kk, 'valid')
            keep = _rdp_idx(A[:, :2], rdp)
            res.append([[round(float(A[i, 0]), 2), round(float(A[i, 1]), 2), round(float(A[i, 2]), 2), round(float(A[i, 3]), 3)] for i in keep])
    return res

# ------------------------------------------------------------------ strokes, oriented line filters (hatching)
def denoise(Y, h=5):
    """grain removal before tracing (the film's grade adds its own grain back): non-local means on 8 bit"""
    u = (np.clip(Y, 0, 1) * 255).astype(np.uint8)
    return cv2.fastNlMeansDenoising(u, None, h, 5, 15).astype(np.float32) / 255

_KER = {}
def line_kernels(nb, su=2.0, sv=0.9, r=7):
    key = (nb, su, sv, r)
    if key in _KER: return _KER[key]
    ks = []
    yy, xx = np.mgrid[-r:r + 1, -r:r + 1].astype(np.float32)
    for b in range(nb):
        a = b * np.pi / nb                               # line direction (x, y) = (cos a, sin a)
        u = xx * np.cos(a) + yy * np.sin(a); v = -xx * np.sin(a) + yy * np.cos(a)
        G = np.exp(-0.5 * (u / su) ** 2 - 0.5 * (v / sv) ** 2)
        K = G * (v ** 2 / sv ** 4 - 1 / sv ** 2)         # d2/dv2 of the gaussian
        K -= K.mean(); K /= np.abs(K).sum() / 2
        ks.append(K.astype(np.float32))
    _KER[key] = ks
    return ks

def strokes3(Y, B, mask, polarity='dark', hi=0.035, lo=0.015, minlen=3, dmin=0.015, valley=0.01, nbins=12,
             maxw=6, rdp=0.5, gap=3, dom=0.6, su=2.0, sv=0.9):
    """Hatch-aware tracing: the image is filtered with oriented line detectors (nbins directions, elongated along
    the line), each direction is thresholded and skeletonised on its own (crossing lines do not cut each other),
    then widths/strengths are sampled across each line as in strokes()."""
    s = 1.0 if polarity == 'dark' else -1.0
    D = np.maximum(0, s * (B - Y))
    g = Y if polarity == 'dark' else 1 - Y
    ks = line_kernels(nbins, su, sv)
    R = np.stack([np.maximum(0, cv2.filter2D(g, -1, K, borderType=cv2.BORDER_REPLICATE)) for K in ks])
    Rm = R.max(0)
    ok0 = (D >= dmin) & mask
    gs = cv2.GaussianBlur(g, (0, 0), 0.5)
    def sample(x, y, nr):
        prof = []
        for o in np.arange(-7, 7.01, 0.5):
            xi, yi = int(round(x + nr[0] * o)), int(round(y + nr[1] * o))
            prof.append(float(gs[yi, xi]) if 0 <= xi < gs.shape[1] and 0 <= yi < gs.shape[0] else 0.0)
        return np.array(prof)
    allp = []
    for b in range(nbins):
        rb = np.where(ok0 & (R[b] >= dom * Rm), R[b], 0)
        mb = apply_hysteresis_threshold(rb, lo, hi)
        mb = remove_small_objects(mb, max_size=3)
        if not mb.any(): continue
        paths = _paths(skeletonize(mb).astype(np.uint8))
        allp += _merge(paths, rad=4.0, align=0.9)
    res = []
    for P in allp:
        L = np.sum(np.hypot(*np.diff(P, axis=0).T))
        if L < minlen: continue
        if len(P) > 3:
            k = np.ones(3) / 3; A = P.copy()
            A[1:-1, 0] = np.convolve(P[:, 0], k, 'valid'); A[1:-1, 1] = np.convolve(P[:, 1], k, 'valid'); P = A
        d = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(P, axis=0).T))])
        n = max(2, int(d[-1] / 1.25) + 1)
        ss = np.linspace(0, d[-1], n)
        Q = np.stack([np.interp(ss, d, P[:, 0]), np.interp(ss, d, P[:, 1])], 1)
        rows = []; cur = []; bad = 0
        for k in range(len(Q)):
            x, y = Q[k]
            t = Q[min(len(Q) - 1, k + 1)] - Q[max(0, k - 1)]; t = t / (np.linalg.norm(t) + 1e-9); nr = np.array([-t[1], t[0]])
            pr = sample(x, y, nr); c = len(pr) // 2
            j = c - 2 + int(np.argmin(pr[c - 2:c + 3]))
            vc = pr[j]
            # the paper level beside the line: the nearest local maxima on both sides (not the farthest)
            jl = j
            while jl > 0 and pr[jl - 1] >= pr[jl]: jl -= 1
            jr = j
            while jr < len(pr) - 1 and pr[jr + 1] >= pr[jr]: jr += 1
            side = min(pr[jl], pr[jr]); dep = side - vc
            okp = dep >= valley
            if okp:
                mass = np.maximum(0, side - pr[jl:jr + 1]).sum() * 0.5
                w = mass / max(dep, 1e-4)
                if w > maxw: okp = False
            if okp:
                off = (j - c) * 0.5
                cur.append([float(x + nr[0] * off), float(y + nr[1] * off), max(0.5, float(w)), min(1.0, float(dep / max(side, 1e-3)))])
                bad = 0
            else:
                bad += 1
                if bad > gap:
                    if len(cur) >= 3: rows.append(cur)
                    cur = []
        if len(cur) >= 3: rows.append(cur)
        for r in rows:
            A = np.array(r)
            if np.sum(np.hypot(*np.diff(A[:, :2], axis=0).T)) < minlen: continue
            if len(A) >= 5:
                kk = np.ones(3) / 3
                A[1:-1, 0] = np.convolve(A[:, 0], kk, 'valid'); A[1:-1, 1] = np.convolve(A[:, 1], kk, 'valid')
            keep = _rdp_idx(A[:, :2], rdp)
            res.append([[round(float(A[i, 0]), 2), round(float(A[i, 1]), 2), round(float(A[i, 2]), 2), round(float(A[i, 3]), 3)] for i in keep])
    return res

# ------------------------------------------------------------------ global gain fit (parallel coverage)
_G = {}
def _cols(args):
    """coverage columns of a chunk of strokes: (list of (pixel indices, values)) on the blurred image"""
    chunk, pol_list, blur, shape = args
    B = _G['B']
    Hh, Ww = shape
    k = int(np.ceil(blur * 3)); gk = cv2.getGaussianKernel(2 * k + 1, blur); G2 = gk @ gk.T
    out = []
    for st, pol in zip(chunk, pol_list):
        a = float(np.mean([p[3] for p in st]))
        px, py, c = coverage(stroke_poly(st))
        c = cv2.filter2D(np.pad(c, k), -1, G2, borderType=cv2.BORDER_CONSTANT); px -= k; py -= k
        yy, xx = np.nonzero(c > 1e-3)
        gx, gy = xx + px, yy + py
        ok = (gx >= 0) & (gx < Ww) & (gy >= 0) & (gy < Hh)
        gx, gy, cv = gx[ok], gy[ok], c[yy[ok], xx[ok]]
        base = B[gy, gx]
        contrib = (-a * base * cv) if pol == 'dark' else (a * (1 - base) * cv)
        out.append((gy * Ww + gx, contrib.astype(np.float32), a))
    return out

def _init_pool(B):
    _G['B'] = B

def fit_gains_global(Y, B, groups, blur=0.7, gmax=1.5, procs=8, chunk=200):
    import scipy.sparse as sp
    from scipy.sparse.linalg import lsqr
    from multiprocessing import Pool
    Hh, Ww = Y.shape
    flat = [(gi, si, st, pol) for gi, (S, pol) in enumerate(groups) for si, st in enumerate(S) if len(st) >= 2]
    jobs = [([f[2] for f in flat[i:i + chunk]], [f[3] for f in flat[i:i + chunk]], blur, (Hh, Ww)) for i in range(0, len(flat), chunk)]
    with Pool(procs, initializer=_init_pool, initargs=(B,)) as p:
        res = p.map(_cols, jobs)
    cols = [c for r in res for c in r]
    rows = np.concatenate([c[0] for c in cols]); vals = np.concatenate([c[1] for c in cols])
    cidx = np.concatenate([np.full(len(c[0]), j) for j, c in enumerate(cols)])
    ub = np.array([min(gmax, 1.0 / max(c[2], 1e-3)) for c in cols])
    n = len(cols)
    A = sp.csc_matrix((vals, (rows, cidx)), shape=(Hh * Ww, n))
    used = np.unique(rows)
    A = A[used]                                         # only pixels some stroke touches
    rhs = (cv2.GaussianBlur(Y, (0, 0), blur) - cv2.GaussianBlur(B, (0, 0), blur)).ravel()[used]
    g = np.ones(n); free = np.ones(n, bool)
    for it in range(4):
        fixed = ~free
        r = rhs - (A[:, fixed] @ g[fixed] if fixed.any() else 0)
        sol = lsqr(A[:, free], r, damp=0.02, atol=1e-6, btol=1e-6, iter_lim=500)[0]
        g[free] = sol
        lo_ = free & (g < 0); hi_ = free & (g > ub)
        g = np.clip(g, 0, ub)
        if not (lo_.any() or hi_.any()): break
        free = free & ~lo_ & ~hi_
    out = [[list(map(list, st)) for st in S] for S, _ in groups]
    for (gi, si, st, pol), gg in zip(flat, g):
        for p in out[gi][si]: p[3] = float(min(1.0, p[3] * gg))
    out = [[st for st in S if len(st) >= 2 and np.mean([p[3] for p in st]) > 0.01] for S in out]
    return out, g
