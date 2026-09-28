# s16 measurement helpers (never loaded by the film). They read source frames (pre-grade luminance, see grade.py /
# tr.py) and return GEOMETRY only:
#   - value study: smooth outlines of the light, measured on a heavily blurred frame (sigma >= 4 px), few levels.
#     This is the "value study that matches the source's light (compare blurred)" of STYLE.md; it carries no line
#     detail (features under ~10 px are gone), the drawing's texture is cut by the engraver (src/lib/engrave.js).
#   - direction regions: the dominant hatch direction (structure tensor, integration sigma 7 px), 12 bins.
#   - ink strokes: centre-lines of the drawing's major ink lines (the s12 method: Hessian ridge, hysteresis,
#     skeleton, re-joined, smoothed, RDP-simplified; width = ink mass / peak; one value per point).
#   - silhouettes / ink shapes: simplified outlines at one threshold.
# No pixels are written anywhere.
import cv2, numpy as np, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from skimage import measure
from skimage.morphology import skeletonize, remove_small_objects
from skimage.filters import apply_hysteresis_threshold
from skimage.feature import hessian_matrix, hessian_matrix_eigvals
from scipy.spatial import cKDTree

ROOT = '/Users/computer/rootline/apprentice-film'
PRE = ROOT + '/snapshots/s16-h1-src'
W, H, M = 2206, 946, 90


def pre(f):
    """pre-grade luminance 0..1 of source frame f (cache made by snapshots/s16-p2-tools/cachepre.py)"""
    return np.load(f'{PRE}/p{f}.npy').astype(np.float32)


def plateE():
    """the clean static plate (build_plate.py): pre-grade luminance, (H+2M, W+2M), origin at frame (-M, -M)"""
    return np.load(ROOT + '/snapshots/s16-h1-work/plateE.npy').astype(np.float32)


# ------------------------------------------------------------------ outlines
def rdp(P, eps):
    P = np.asarray(P, float)
    if len(P) < 3: return P
    keep = np.zeros(len(P), bool); keep[0] = keep[-1] = True
    st = [(0, len(P) - 1)]
    while st:
        a, b = st.pop()
        if b <= a + 1: continue
        A, B = P[a], P[b]; ab = B - A; L = np.hypot(*ab) + 1e-9
        d = np.abs(ab[0] * (P[a + 1:b, 1] - A[1]) - ab[1] * (P[a + 1:b, 0] - A[0])) / L
        i = int(np.argmax(d))
        if d[i] > eps:
            k = a + 1 + i; keep[k] = True; st += [(a, k), (k, b)]
    return P[keep]


def isolines(img, level, eps=1.5, minarea=20, off=(0, 0)):
    """closed sub-pixel outlines of {img > level} (outer rings and holes; fill even-odd), simplified"""
    p = np.pad(img, 1, constant_values=min(0.0, float(img.min()) - 1))
    out = []
    for c in measure.find_contours(p, level):
        xy = np.stack([c[:, 1] - 1 + off[0], c[:, 0] - 1 + off[1]], 1)
        if len(xy) < 4: continue
        x, y = xy[:, 0], xy[:, 1]
        a = 0.5 * abs(np.sum(x * np.roll(y, -1) - np.roll(x, -1) * y))
        if a < minarea: continue
        # rdp on a closed ring: split at the farthest point from the start
        j = int(np.argmax(np.hypot(x - x[0], y - y[0])))
        r = np.vstack([rdp(xy[:j + 1], eps)[:-1], rdp(np.vstack([xy[j:], xy[:1]]), eps)[:-1]])
        if len(r) >= 3: out.append(r)
    return out


def value_levels(Y, sigma, thresholds, eps=2.0, minarea=60, off=(0, 0), mask=None):
    """nested light outlines: [(value, rings)] painted in order; value = mean of the blurred frame in that band"""
    B = cv2.GaussianBlur(Y, (0, 0), sigma)
    if mask is not None: B = np.where(mask > 0, B, 0)
    ts = list(thresholds) + [2.0]
    out = []
    for k in range(len(ts) - 1):
        band = (B >= ts[k]) & (B < ts[k + 1])
        if band.sum() < 10: continue
        v = float(B[band].mean())
        rings = isolines(B, ts[k], eps, minarea, off)
        if rings: out.append((v, rings))
    return out, B


def orientation(Y, sd=1.0, si=7.0):
    """line direction (radians, 0..pi, image coords y down) and coherence"""
    g = cv2.GaussianBlur(Y, (0, 0), sd)
    ix = cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3) / 8; iy = cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3) / 8
    jxx = cv2.GaussianBlur(ix * ix, (0, 0), si); jyy = cv2.GaussianBlur(iy * iy, (0, 0), si); jxy = cv2.GaussianBlur(ix * iy, (0, 0), si)
    th = 0.5 * np.arctan2(2 * jxy, jxx - jyy) + np.pi / 2          # across the gradient = along the lines
    l1 = 0.5 * (jxx + jyy) + np.sqrt(0.25 * (jxx - jyy) ** 2 + jxy ** 2); l2 = 0.5 * (jxx + jyy) - np.sqrt(0.25 * (jxx - jyy) ** 2 + jxy ** 2)
    coh = ((l1 - l2) / (l1 + l2 + 1e-9)) ** 2
    return np.mod(th, np.pi), coh


def dir_regions(th, nb=12, smooth=5.0, eps=2.0, minarea=80, off=(0, 0), cls=None):
    """regions of one direction bin (and one class, if a class map is given): [(bin, cls, rings)]"""
    b = np.floor(th / np.pi * nb + 0.5).astype(int) % nb
    # circular mode filter: blurred one-hot votes, argmax
    votes = np.stack([cv2.GaussianBlur((b == k).astype(np.float32), (0, 0), smooth) for k in range(nb)])
    bb = votes.argmax(0)
    out = []
    classes = [None] if cls is None else sorted(set(np.unique(cls).tolist()))
    for c in classes:
        for k in range(nb):
            m = (bb == k) if c is None else ((bb == k) & (cls == c))
            if m.sum() < minarea: continue
            sm = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 1.0)
            rings = isolines(sm, 0.5, eps, minarea, off)
            if rings: out.append((k, c, rings))
    return out, bb


# ------------------------------------------------------------------ ink strokes (s12 method)
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


def _merge(paths, rad=8.0, align=0.75):
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
            if np.dot(ti, u) + (-np.dot(tj, u)) < 1.3: continue
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


def strokes(Y, polarity='dark', mask=None, sigmas=(1.0, 2.0), hi=0.035, lo=0.018, dmin=0.03, minlen=10,
            eps=0.7, smooth=7, win=13, off=(0, 0), maxw=None, edge=0.0):
    """centre-lines [[x, y, w, v], ...] of the ink lines: dark lines on light ground or pale lines on dark ground.
    w = ink mass / peak of the cross profile (px); v = the line's extreme value there (darkest / brightest)."""
    g0 = Y.astype(np.float32)
    Hh, Ww = g0.shape
    se = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (win, win))
    if polarity == 'dark':
        bg = cv2.GaussianBlur(cv2.dilate(g0, se), (0, 0), 3); D0 = bg - g0
    else:
        bg = cv2.GaussianBlur(cv2.erode(g0, se), (0, 0), 3); D0 = g0 - bg
    ridge = None
    for sg in sigmas:
        Hm = hessian_matrix(g0, sigma=sg, order='rc', use_gaussian_derivatives=True)
        ev = hessian_matrix_eigvals(Hm)
        rr = (np.maximum(0, ev[0]) if polarity == 'dark' else np.maximum(0, -ev[1])) * sg * sg
        ridge = rr if ridge is None else np.maximum(ridge, rr)
    ridge[D0 < dmin] = 0
    if mask is not None: ridge[mask == 0] = 0
    m = apply_hysteresis_threshold(ridge, lo, hi)
    m = remove_small_objects(m, 12)
    sk = skeletonize(m).astype(np.uint8)
    dt = cv2.distanceTransform(m.astype(np.uint8), cv2.DIST_L2, 3)
    gs = cv2.GaussianBlur(g0, (0, 0), 1.0)
    paths = _merge(_paths(sk))
    res = []
    for P in paths:
        L = np.sum(np.hypot(*np.diff(P, axis=0).T))
        if L < minlen: continue
        if len(P) > smooth:
            k = np.ones(smooth) / smooth; A = P.copy(); h = smooth // 2
            A[h:-h, 0] = np.convolve(P[:, 0], k, 'valid'); A[h:-h, 1] = np.convolve(P[:, 1], k, 'valid'); P = A
        S = rdp(P, eps)
        row = []; sides = []
        for k in range(len(S)):
            x, y = S[k]
            t = S[min(len(S) - 1, k + 1)] - S[max(0, k - 1)]; t = t / (np.linalg.norm(t) + 1e-9); nrm = np.array([-t[1], t[0]])
            prof = []
            for o in np.arange(-6, 6.01, 0.5):
                xi, yi = int(round(x + nrm[0] * o)), int(round(y + nrm[1] * o))
                prof.append(max(0.0, float(D0[yi, xi])) if 0 <= xi < Ww and 0 <= yi < Hh else 0.0)
            prof = np.array(prof); c = len(prof) // 2
            pk = prof[c - 3:c + 4].max()
            # width at half the peak (a dense hatch has no clean base line, so the full ink mass would spill over
            # into the neighbouring lines), linearly interpolated at both flanks
            cc = c - 3 + int(np.argmax(prof[c - 3:c + 4]))
            a = cc
            while a > 0 and prof[a - 1] > 0.5 * pk: a -= 1
            b = cc
            while b < len(prof) - 1 and prof[b + 1] > 0.5 * pk: b += 1
            fa = (prof[a] - 0.5 * pk) / max(1e-6, prof[a] - prof[a - 1]) if a > 0 else 0.0
            fb = (prof[b] - 0.5 * pk) / max(1e-6, prof[b] - prof[b + 1]) if b < len(prof) - 1 else 0.0
            w = min((b - a + min(1, fa) + min(1, fb)) * 0.5, 2 * float(dt[int(round(y)), int(round(x))]) + 1.5)
            if maxw: w = min(w, maxw)
            # the ground on both sides of the line (a line has ground on both sides; an edge has it on one side only)
            sv = []
            for sg_ in (-1, 1):
                xi, yi = int(round(x + nrm[0] * sg_ * (w / 2 + 2.5))), int(round(y + nrm[1] * sg_ * (w / 2 + 2.5)))
                sv.append(float(gs[yi, xi]) if 0 <= xi < Ww and 0 <= yi < Hh else 0.0)
            sides.append(sv)
            bgv = float(bg[int(round(y)), int(round(x))])
            v = bgv - pk if polarity == 'dark' else bgv + pk
            row.append([round(float(x + off[0]), 1), round(float(y + off[1]), 1), round(max(0.6, w), 1), round(float(np.clip(v, 0, 1)), 2)])
        if edge > 0 and sides:
            sd = np.array(sides)
            if polarity != 'dark': sd = 1 - sd
            ratio = np.median(sd.min(1) / np.maximum(1e-3, sd.max(1)))
            if ratio < edge: continue
        res.append(row)
    return res


# ------------------------------------------------------------------ JS output
def js_rings(rings, nd=0):
    f = (lambda v: '%d' % round(v)) if nd == 0 else (lambda v: ('%.1f' % v).rstrip('0').rstrip('.'))
    return ','.join('[' + ','.join(f(v) for p in r for v in p) + ']' for r in rings)


def js_strokes(S):
    return ',\n'.join('[' + ','.join(('%g' % v) for p in s for v in p) + ']' for s in S)


# ------------------------------------------------------------------ stroke raster (matches room.js drawStrokes)
def _catmull(pts, per=4):
    n = len(pts); out = []
    P = lambda i: pts[max(0, min(n - 1, i))]
    for i in range(n - 1):
        p0, p1, p2, p3 = P(i - 1), P(i), P(i + 1), P(i + 2)
        for j in range(per):
            t = j / per; t2 = t * t; t3 = t2 * t
            out.append(0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(pts[-1])
    return np.array(out)


def stroke_polys(S, pale=False, wk=1.0, dv=0.0, end=4.0, wmin=0.6):
    """ribbon polygons + tone of each stroke, as room.js drawStrokes draws them"""
    out = []
    for s in S:
        a = np.array(s, float)
        if len(a) < 2: continue
        pts, w, v = a[:, :2], a[:, 2], a[:, 3]
        ve = float(np.clip((v.max() if pale else v.min()) + dv, 0, 1))
        wm = w * v / max(0.05, ve) if pale else w * (1 - v) / max(0.05, 1 - ve)
        q = _catmull(pts, 4); n = len(a)
        L = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(q, axis=0).T))]); ln = L[-1]
        idx = np.arange(len(q)) / 4.0
        wa = np.interp(idx, np.arange(n), wm)
        e = np.minimum(1, np.minimum(L / end, (ln - L) / end))
        ww = np.maximum(wmin, wa * wk) * (0.35 + 0.65 * np.sqrt(np.maximum(0, e)))
        tg = np.gradient(q, axis=0); tg /= (np.hypot(tg[:, 0], tg[:, 1])[:, None] + 1e-9)
        nr = np.stack([-tg[:, 1], tg[:, 0]], 1)
        Lp = q + nr * ww[:, None] / 2; Rp = q - nr * ww[:, None] / 2
        out.append((np.vstack([Lp, Rp[::-1]]), ve))
    return out


def stroke_raster(S, shape, pale=False, off=(0, 0), ss=4, **kw):
    """coverage (0..1) and coverage*tone of the strokes on a grid of `shape` whose origin is frame (off)"""
    Hh, Ww = shape
    cov = np.zeros((Hh, Ww), np.float32); cv_ = np.zeros((Hh, Ww), np.float32)
    for poly, ve in stroke_polys(S, pale, **kw):
        p = poly - np.array(off, float)
        x0, y0 = np.floor(p.min(0)).astype(int) - 2; x1, y1 = np.ceil(p.max(0)).astype(int) + 2
        x0 = max(0, x0); y0 = max(0, y0); x1 = min(Ww, x1); y1 = min(Hh, y1)
        if x1 <= x0 or y1 <= y0: continue
        m = np.zeros(((y1 - y0) * ss, (x1 - x0) * ss), np.uint8)
        cv2.fillPoly(m, [np.round((p - [x0, y0]) * ss * 4).astype(np.int32)], 1, shift=2)
        c = cv2.resize(m.astype(np.float32), (x1 - x0, y1 - y0), interpolation=cv2.INTER_AREA)
        sub = cov[y0:y1, x0:x1]
        # "over" compositing of an opaque stroke with coverage c
        cv_[y0:y1, x0:x1] = cv_[y0:y1, x0:x1] * (1 - c) + c * ve
        cov[y0:y1, x0:x1] = sub + c * (1 - sub)
    return cov, cv_


def hatch_filter(S, rad=7.0, ang=0.35, need=2, frac=0.5, lmax=40.0, wmax=2.4):
    """split strokes into (lines, hatch): a hatch stroke is short, thin and runs beside >= `need` other strokes
    at about the same direction over most of its length (the regular hatching the engraver re-cuts)"""
    samp, own, dirs = [], [], []
    info = []
    for i, s in enumerate(S):
        a = np.array(s, float)[:, :2]
        L = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(a, axis=0).T))])
        n = max(2, int(L[-1] / 3) + 1); u = np.linspace(0, L[-1], n)
        p = np.stack([np.interp(u, L, a[:, 0]), np.interp(u, L, a[:, 1])], 1)
        t = np.gradient(p, axis=0); t /= (np.hypot(t[:, 0], t[:, 1])[:, None] + 1e-9)
        samp.append(p); own.append(np.full(n, i)); dirs.append(t)
        info.append((L[-1], float(np.mean(np.array(s)[:, 2]))))
    P = np.vstack(samp); O = np.concatenate(own); D = np.vstack(dirs)
    tree = cKDTree(P)
    lines, hatch = [], []
    for i, s in enumerate(S):
        L, w = info[i]
        if L >= lmax or w >= wmax: lines.append(s); continue
        p = samp[i]; t = dirs[i]; ok = 0
        for k in range(len(p)):
            nb = [j for j in tree.query_ball_point(p[k], rad) if O[j] != i and abs(np.dot(D[j], t[k])) > np.cos(ang)]
            if len(set(O[nb].tolist())) >= need: ok += 1
        (hatch if ok >= frac * len(p) else lines).append(s)
    return lines, hatch
