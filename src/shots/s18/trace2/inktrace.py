# s18 ink tracer (measurement only; nothing here is loaded by the film).
# Reads a pre-grade value image and writes an INK DRAWING in the s12 manner:
#   masses  - the lit faces: ONE threshold of the lightly blurred image, opened/closed so that anything thinner than
#             a few px is left to the strokes; outline + holes (even-odd), each with one smooth measured value field
#             (constant, plane or quadratic)
#   dark    - centre-lines of the dark strokes inside the lit faces (Hessian ridge, hysteresis, skeleton, re-joined,
#             smoothed, RDP), with a width per point (ink mass / peak of the cross profile) and one tone per stroke
#   bright  - the same for the white strokes on the black
#   dots    - small isolated white marks (area under the mass minimum) as round dots
# The film redraws all of it with Canvas2D (taper strokes, even-odd fills); no pixels are stored.
import numpy as np, cv2, math
from skimage.morphology import skeletonize, remove_small_objects
from skimage.filters import apply_hysteresis_threshold
from skimage.feature import hessian_matrix, hessian_matrix_eigvals
from scipy.spatial import cKDTree

def disk(r):
    k = int(math.ceil(r)); y, x = np.mgrid[-k:k + 1, -k:k + 1]
    return (x * x + y * y <= r * r + 1e-6).astype(np.uint8)

def rdp(P, eps):
    if len(P) < 3: return list(P)
    a, b = P[0], P[-1]; ab = b - a; L = np.linalg.norm(ab)
    if L < 1e-9: dd = np.linalg.norm(P[1:-1] - a, axis=1)
    else: dd = np.abs(ab[0] * (P[1:-1, 1] - a[1]) - ab[1] * (P[1:-1, 0] - a[0])) / L
    i = int(np.argmax(dd)) + 1
    if dd[i - 1] > eps: return rdp(P[:i + 1], eps)[:-1] + rdp(P[i:], eps)
    return [a, b]

def rdp_closed(R, eps):
    # split the ring at its two farthest points so RDP keeps the shape
    if len(R) < 8: return R
    i0 = 0; d = np.linalg.norm(R - R[0], axis=1); i1 = int(np.argmax(d))
    A = R[i0:i1 + 1]; B = np.vstack([R[i1:], R[:1]])
    return np.array(rdp(A, eps)[:-1] + rdp(B, eps)[:-1])

# ------------------------------------------------------------------------------------------------ lit masses
def lit_mask(P, T, rc=1.5, ro=2.5, blur=1.0, allowed=None, minA=60, order='co'):
    Pb = cv2.GaussianBlur(P, (0, 0), blur) if blur > 0 else P
    L = (Pb > T).astype(np.uint8)
    if allowed is not None: L &= allowed.astype(np.uint8)
    if order == 'co':
        if rc > 0: L = cv2.morphologyEx(L, cv2.MORPH_CLOSE, disk(rc))
        if ro > 0: L = cv2.morphologyEx(L, cv2.MORPH_OPEN, disk(ro))
    else:
        L0 = L
        if ro > 0: L = cv2.morphologyEx(L, cv2.MORPH_OPEN, disk(ro))
        if rc > 0: L = cv2.morphologyEx(L, cv2.MORPH_CLOSE, disk(rc)) & cv2.dilate(L0, disk(1.0))
    if allowed is not None: L &= allowed.astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(L, connectivity=8)
    keep = np.zeros_like(L)
    for i in range(1, n):
        if st[i, 4] >= minA: keep[lab == i] = 1
    # fill tiny holes (they are dark specks, drawn as strokes or lost)
    inv = (1 - keep).astype(np.uint8)
    n2, lab2, st2, _ = cv2.connectedComponentsWithStats(inv, connectivity=4)
    for i in range(1, n2):
        if st2[i, 4] < 12: keep[lab2 == i] = 1
    return keep

def mask_rings(M, up=4, eps=0.45, smooth=1.0):
    """outline + holes of a binary mask, sub-pixel (smooth, upsampled field), grouped per outer component"""
    F = cv2.GaussianBlur(M.astype(np.float32), (0, 0), smooth) if smooth > 0 else M.astype(np.float32)
    H, W = M.shape
    Fu = cv2.resize(F, (W * up, H * up), interpolation=cv2.INTER_CUBIC)
    B = (Fu > 0.5).astype(np.uint8)
    cs, hier = cv2.findContours(B, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = []
    if hier is None: return out
    hier = hier[0]
    for i, c in enumerate(cs):
        if hier[i][3] != -1: continue
        rings = []
        for j in [i] + [k for k in range(len(cs)) if hier[k][3] == i]:
            R = cs[j][:, 0, :].astype(np.float64)
            R = (R + 0.5) / up - 0.5
            if len(R) < 6: continue
            if cv2.contourArea(R.astype(np.float32)) < 3: continue
            R = rdp_closed(R, eps)
            if len(R) >= 3: rings.append(R)
        if rings: out.append(rings)
    return out

def rings_mask(rings, shape, off=(0, 0)):
    m = np.zeros(shape, np.uint8)
    pts = [np.round((R - np.array(off)) * 16).astype(np.int32) for R in rings]
    cv2.fillPoly(m, pts, 1, lineType=cv2.LINE_8, shift=4)
    return m

def fit_field(P, pm, kind='auto', lo_q=None):
    ys, xs = np.nonzero(pm); v = P[ys, xs].astype(np.float64)
    if len(v) == 0: return ['c', 0.0]
    if lo_q is not None:
        th = np.quantile(v, lo_q); sel = v >= th; xs, ys, v = xs[sel], ys[sel], v[sel]
    if kind == 'auto': kind = 'c' if len(v) < 300 else ('p' if len(v) < 3000 else 'q')
    if kind == 'c': return ['c', float(np.median(v))]
    cx, cy = xs.mean(), ys.mean(); sc = max(xs.std(), ys.std(), 1.0)
    u = (xs - cx) / sc; w = (ys - cy) / sc
    A = np.stack([np.ones_like(u), u, w] + ([u * u, u * w, w * w] if kind == 'q' else []), 1)
    keep = np.ones(len(v), bool)
    for _ in range(3):
        c, *_ = np.linalg.lstsq(A[keep], v[keep], rcond=None)
        r = v - A @ c; s = 1.4826 * np.median(np.abs(r[keep])) + 1e-3
        keep = np.abs(r) < 2.5 * s
    # express in absolute px: v = a + b x + c y (+ d x^2 + e xy + f y^2)
    if kind == 'p':
        a0, a1, a2 = c; b = a1 / sc; cc = a2 / sc; a = a0 - b * cx - cc * cy
        return ['p', float(a), float(b), float(cc)]
    a0, a1, a2, a3, a4, a5 = c
    # substitute u=(x-cx)/sc, w=(y-cy)/sc
    d = a3 / sc**2; e = a4 / sc**2; f = a5 / sc**2
    b = a1 / sc - 2 * d * cx - e * cy
    cc = a2 / sc - 2 * f * cy - e * cx
    a = a0 - a1 * cx / sc - a2 * cy / sc + d * cx * cx + e * cx * cy + f * cy * cy
    return ['q', float(a), float(b), float(cc), float(d), float(e), float(f)]

def eval_field(fd, xs, ys, dist=None):
    k = fd[0]
    if k == 'r':   # rim-shaded field: [ 'r', k, lam, inner field... ] ; v = inner - k * exp(-d / lam), d = depth inside
        v = eval_field(fd[3], xs, ys)
        if dist is not None: v = v - fd[1] * np.exp(-dist / fd[2])
        return v
    if k == 'c': return np.full(np.shape(xs), fd[1])
    if k == 'p': return fd[1] + fd[2] * xs + fd[3] * ys
    if k == 'qb':   # quadratic + soft shading blobs
        v = fd[1] + fd[2] * xs + fd[3] * ys + fd[4] * xs * xs + fd[5] * xs * ys + fd[6] * ys * ys
        for i in range(7, len(fd), 4):
            x, y, s, a = fd[i:i + 4]; v = v + a * np.exp(-((xs - x) ** 2 + (ys - y) ** 2) / (2 * s * s))
        return v
    return fd[1] + fd[2] * xs + fd[3] * ys + fd[4] * xs * xs + fd[5] * xs * ys + fd[6] * ys * ys

# ------------------------------------------------------------------------------------------------ ridges
def ridge_map(P, polarity, sigmas=(1.0, 1.8)):
    """polarity +1: dark lines on light (dark ridges); -1: bright lines on dark"""
    R = None
    for sg in sigmas:
        Hm = hessian_matrix(P, sigma=sg, order='rc', use_gaussian_derivatives=True)
        ev = hessian_matrix_eigvals(Hm)
        r = (np.maximum(0, ev[0]) if polarity > 0 else np.maximum(0, -ev[1])) * sg * sg
        R = r if R is None else np.maximum(R, r)
    return R

def skeleton_paths(m):
    sk = skeletonize(m).astype(np.uint8)
    ys, xs = np.nonzero(sk); pts = set(zip(xs.tolist(), ys.tolist()))
    def nb(p): return [(p[0] + dx, p[1] + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if (dx or dy) and (p[0] + dx, p[1] + dy) in pts]
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
    return [np.array(P, float) for P in paths if len(P) >= 2]

def join_paths(paths, rad=9.0, align=0.75):
    if not paths: return paths
    def endinfo(P, which):
        if which == 0: p = P[0]; q = P[min(len(P) - 1, 5)]
        else: p = P[-1]; q = P[max(0, len(P) - 6)]
        t = p - q; return p, t / (np.linalg.norm(t) + 1e-9)
    E = []
    for i, P in enumerate(paths):
        for wh in (0, 1): p, t = endinfo(P, wh); E.append((i, wh, p, t))
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

def trace_strokes(P, polarity, allowed, base, hi, lo, minlen=6, sigmas=(1.0, 1.8), eps=0.6, maxw=7.0, join=9.0, ridge=None, nms=False):
    """P: pre-grade 0..1. base: the local value the stroke sits on (for dark: the face value; for bright: the black).
    hi/lo: hysteresis thresholds on the ridge measure (x255 units). Returns list of rows [x, y, w, v]."""
    H, W = P.shape
    if nms:
        R, nm, _, _ = ridge_nms(P, polarity, sigmas)
        R = R * 255 * (allowed > 0)
        cand = nm & (R > lo)
        # hysteresis on the thin centre set (8-connected through 1-px gaps: dilate the seeds' labels)
        c8 = cv2.dilate(cand.astype(np.uint8), np.ones((3, 3), np.uint8))
        n_, lab = cv2.connectedComponents(c8, connectivity=8)
        strong = np.unique(lab[cand & (R > hi)]); strong = strong[strong > 0]
        m = cand & np.isin(lab, strong)
    else:
        R = ridge_map(P, polarity, sigmas) * 255 if ridge is None else ridge
        R = R * (allowed > 0)
        m = apply_hysteresis_threshold(R, lo, hi)
        m = remove_small_objects(m, 6)
    paths = skeleton_paths(m)
    if nms: paths = prune_paths(paths)
    paths = join_paths(paths, rad=join)
    D = (base - P) if polarity > 0 else (P - base)
    res = []
    for Pp in paths:
        L = np.sum(np.hypot(*np.diff(Pp, axis=0).T)) if len(Pp) > 1 else 0
        if L < minlen: continue
        if len(Pp) > 5:
            k = np.ones(5) / 5; A = Pp.copy()
            A[2:-2, 0] = np.convolve(Pp[:, 0], k, 'valid'); A[2:-2, 1] = np.convolve(Pp[:, 1], k, 'valid'); Pp = A
        S = np.array(rdp(Pp, eps))
        # resample long segments so width can vary along them
        Q = [S[0]]
        for a, b in zip(S[:-1], S[1:]):
            n = max(1, int(math.ceil(np.linalg.norm(b - a) / 8)))
            for t in range(1, n + 1): Q.append(a + (b - a) * t / n)
        S = np.array(Q)
        row = []
        for k in range(len(S)):
            x, y = S[k]
            t = S[min(len(S) - 1, k + 1)] - S[max(0, k - 1)]; t = t / (np.linalg.norm(t) + 1e-9); nrm = np.array([-t[1], t[0]])
            os_ = np.arange(-7, 7.01, 0.5)
            px = x + nrm[0] * os_; py = y + nrm[1] * os_
            prof = cv2.remap(D.astype(np.float32), px.astype(np.float32)[None, :], py.astype(np.float32)[None, :], cv2.INTER_LINEAR, borderValue=0)[0]
            c0 = len(prof) // 2
            c = c0 - 3 + int(np.argmax(prof[c0 - 3:c0 + 4]))
            pk = float(prof[c])
            # the stroke's share of the ink: out from the peak to where the profile stops falling (the paper, or
            # half-way to the next stroke), so that dense hatching is split between its strokes without overlap
            lo_ = c
            while lo_ > 0 and prof[lo_ - 1] < prof[lo_] and prof[lo_ - 1] > 0.03 * max(pk, 0.05): lo_ -= 1
            hi_ = c
            while hi_ < len(prof) - 1 and prof[hi_ + 1] < prof[hi_] and prof[hi_ + 1] > 0.03 * max(pk, 0.05): hi_ += 1
            I = float(prof[lo_:hi_ + 1].sum() - 0.5 * (prof[lo_] + prof[hi_])) * 0.5
            w = min(maxw, max(0.0, I) / max(pk, 1e-3))
            xi, yi = int(round(min(W - 1, max(0, x)))), int(round(min(H - 1, max(0, y))))
            bv = float(base[yi, xi]) if np.ndim(base) else float(base)
            v = (bv - pk) if polarity > 0 else (bv + pk)
            row.append([float(x), float(y), max(0.5, w), min(1.0, max(0.0, v)), pk])
        res.append(row)
    return res

def find_dots(P, lit, thr, amin=3, amax=60, allowed=None):
    B = (cv2.GaussianBlur(P, (0, 0), 0.7) > thr).astype(np.uint8)
    B[lit > 0] = 0
    if allowed is not None: B &= allowed.astype(np.uint8)
    n, lab, st, cen = cv2.connectedComponentsWithStats(B, connectivity=8)
    out = []
    for i in range(1, n):
        a = st[i, 4]
        if a < amin or a > amax: continue
        ys, xs = np.nonzero(lab == i)
        v = float(P[ys, xs].mean())
        out.append([float(cen[i][0]), float(cen[i][1]), math.sqrt(a / math.pi), v])
    return out

# ------------------------------------------------------------------------------------------------ preview renderer
# (approximates the Canvas2D renderer in ../ink.js closely enough to iterate on thresholds)
def stroke_poly(pts, ws):
    pts = np.asarray(pts, float); n = len(pts)
    L = []; R = []
    for i in range(n):
        a = pts[max(0, i - 1)]; b = pts[min(n - 1, i + 1)]; d = b - a; dn = np.linalg.norm(d) or 1; d = d / dn
        hw = ws[i] / 2
        L.append([pts[i][0] - d[1] * hw, pts[i][1] + d[0] * hw]); R.append([pts[i][0] + d[1] * hw, pts[i][1] - d[0] * hw])
    return np.array(L + R[::-1])

def stroke_widths(row, polarity, cal):
    """one tone per stroke, widths rescaled so that width x contrast (ink mass) matches the measurement"""
    xs = [r[0] for r in row]; ys = [r[1] for r in row]; w = np.array([r[2] for r in row]); v = np.array([r[3] for r in row]); pk = np.array([r[4] for r in row])
    if polarity > 0: tone = max(0.0, v.min() + cal.get('dv', 0.0))
    else: tone = min(1.0, v.max() + cal.get('bv', 0.0))
    return tone

def render_preview(D, shape, soft=0.6, up=4, wk=(1.0, 1.0), img0=None, alpha=False):
    H, W = shape
    img = np.zeros((H, W), np.float32) if img0 is None else img0.astype(np.float32).copy()
    AL = np.zeros((H, W), np.float32)
    def comp(poly_list, val_fn, bbox_pad=2):
        allp = np.vstack(poly_list)
        x0 = int(max(0, np.floor(allp[:, 0].min()) - bbox_pad)); x1 = int(min(W, np.ceil(allp[:, 0].max()) + bbox_pad + 1))
        y0 = int(max(0, np.floor(allp[:, 1].min()) - bbox_pad)); y1 = int(min(H, np.ceil(allp[:, 1].max()) + bbox_pad + 1))
        if x1 <= x0 or y1 <= y0: return
        m = np.zeros(((y1 - y0) * up, (x1 - x0) * up), np.uint8)
        pts = [np.round(((p - [x0, y0]) * up + (up - 1) / 2) * 16).astype(np.int32) for p in poly_list]
        # even-odd via XOR of each ring
        for p in pts:
            t = np.zeros_like(m); cv2.fillPoly(t, [p], 1, lineType=cv2.LINE_8, shift=4); m ^= t
        a = cv2.resize(m.astype(np.float32), (x1 - x0, y1 - y0), interpolation=cv2.INTER_AREA)
        yy, xx = np.mgrid[y0:y1, x0:x1]
        v = val_fn(xx, yy)
        img[y0:y1, x0:x1] = img[y0:y1, x0:x1] * (1 - a) + v * a
        AL[y0:y1, x0:x1] = AL[y0:y1, x0:x1] * (1 - a) + a
    def rimfill(rings, fd):
        if fd[0] != 'r': return lambda xx, yy, fd=fd: np.clip(eval_field(fd, xx, yy), 0, 1)
        def f(xx, yy, rings=rings, fd=fd):
            x0, y0 = int(xx[0, 0]), int(yy[0, 0]); h, w = xx.shape
            m = np.zeros((h, w), np.uint8)
            for R in rings:
                t = np.zeros_like(m); cv2.fillPoly(t, [np.round((R - [x0, y0]) * 16).astype(np.int32)], 1, shift=4); m ^= t
            d = cv2.distanceTransform(m, cv2.DIST_L2, 5)
            return np.clip(eval_field(fd, xx, yy, dist=d), 0, 1)
        return f
    for rings, fd in D.get('base', []) + D['masses']:
        comp(rings, rimfill(rings, fd))
    for rings, fd in D.get('specks', []):
        comp(rings, lambda xx, yy, fd=fd: np.clip(eval_field(fd, xx, yy), 0, 1))
    for (pol, key), k in zip(((1, 'dark'), (-1, 'bright')), wk):
        for st in D.get(key, []):
            tone, pts, ws = st
            if len(pts) < 2: continue
            comp([stroke_poly(pts, np.asarray(ws) * k)], lambda xx, yy, t=tone: t)
    for x, y, r, v in D.get('dots', []):
        a = np.linspace(0, 2 * np.pi, 12, endpoint=False)
        comp([np.stack([x + r * np.cos(a), y + r * np.sin(a)], 1)], lambda xx, yy, v=v: v)
    if alpha:
        # premultiplied softening of the layer
        if soft > 0:
            pm = cv2.GaussianBlur(img * AL if img0 is None else img, (0, 0), soft); AL = cv2.GaussianBlur(AL, (0, 0), soft)
            img = pm
        return img, AL
    if soft > 0: img = cv2.GaussianBlur(img, (0, 0), soft)
    return img

def finalize(rows, polarity, base, wmin=0.6, wmax=8.0, dv=0.0, tone_q=None):
    """rows from trace_strokes -> [tone, pts, widths]: one tone per stroke (its darkest / brightest measured value),
    widths rescaled so width x contrast (the ink mass) matches the measurement."""
    out = []
    H, W = np.shape(base) if np.ndim(base) else (0, 0)
    for row in rows:
        if len(row) < 2: continue
        A = np.array(row)
        v = A[:, 3]; pk = A[:, 4]; w = A[:, 2]
        if np.ndim(base):
            xi = np.clip(np.round(A[:, 0]).astype(int), 0, W - 1); yi = np.clip(np.round(A[:, 1]).astype(int), 0, H - 1)
            bv = base[yi, xi]
        else: bv = np.full(len(A), float(base))
        if tone_q is None: tone_q = 0.3
        if polarity > 0:
            tone = float(np.clip(np.quantile(v, tone_q) + dv, 0, 1))
            con = np.maximum(bv - tone, 0.05)
        else:
            tone = float(np.clip(np.quantile(v, 1 - tone_q) + dv, 0, 1))
            con = np.maximum(tone - bv, 0.05)
        ws = np.clip(w * pk / con, wmin, wmax)
        # ends: taper the last ~3 px toward the measured (already small) end widths
        out.append([tone, A[:, :2].tolist(), ws.tolist()])
    return out

def residual_specks(P, R, sign, thr, amin=4, amax=150, allowed=None, blur=0.8, sm=0.8):
    """small marks the strokes missed: connected regions where the source is darker (sign -1) / brighter (+1) than
    the drawing by more than thr; returned as filled shapes [rings, value] with their measured mean value."""
    Df = cv2.GaussianBlur(P - R, (0, 0), blur) * sign
    B = (Df > thr).astype(np.uint8)
    if allowed is not None: B &= allowed.astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(B, connectivity=8)
    out = []
    H, W = P.shape
    for i in range(1, n):
        a = st[i, 4]
        if a < amin or a > amax: continue
        x, y, w, h = st[i, :4]
        x0, y0 = max(0, x - 3), max(0, y - 3); x1, y1 = min(W, x + w + 3), min(H, y + h + 3)
        m = (lab[y0:y1, x0:x1] == i).astype(np.uint8)
        for rings in mask_rings(m, smooth=sm):
            rings = [Rr + [x0, y0] for Rr in rings]
            ys, xs = np.nonzero(m)
            v = float(np.median(P[y0:y1, x0:x1][ys, xs]))
            out.append([rings, ['c', v]])
    return out

# ------------------------------------------------------------------------------------------------ NMS ridges
def ridge_nms(P, polarity, sigmas=(0.8, 1.3, 2.0), aniso_pow=0.5):
    """Steger-style line centres: multi-scale Hessian response (scale-normalised), non-maximum suppression across the
    line (along the principal-curvature direction), anisotropy weighting (lines, not blobs). Returns (R, nms mask)."""
    H, W = P.shape
    Rb = np.zeros((H, W), np.float32); NX = np.zeros((H, W), np.float32); NY = np.zeros((H, W), np.float32)
    for sg in sigmas:
        Hrr, Hrc, Hcc = hessian_matrix(P, sigma=sg, order='rc', use_gaussian_derivatives=True)
        tr = Hrr + Hcc; dif = np.sqrt((Hrr - Hcc) ** 2 + 4 * Hrc ** 2)
        l1 = 0.5 * (tr + dif); l2 = 0.5 * (tr - dif)     # l1 >= l2
        if polarity > 0: lam = l1; other = l2; resp = np.maximum(0, l1)
        else: lam = l2; other = l1; resp = np.maximum(0, -l2)
        an = (np.abs(lam) - np.abs(other)) / (np.abs(lam) + np.abs(other) + 1e-9)
        resp = resp * sg * sg * np.clip(an, 0, 1) ** aniso_pow
        # eigenvector (row, col) for lam: (Hrc, lam - Hrr) or (lam - Hcc, Hrc)
        vy = Hrc; vx = lam - Hrr
        vy2 = lam - Hcc; vx2 = Hrc
        use2 = (np.abs(vy) + np.abs(vx)) < (np.abs(vy2) + np.abs(vx2))
        vy = np.where(use2, vy2, vy); vx = np.where(use2, vx2, vx)
        # (vy, vx) is in (row, col) order: vector components dy=vy?  eigvec of [[rr,rc],[rc,cc]] is (r, c) = (Hrc, lam-Hrr)
        n = np.sqrt(vx * vx + vy * vy) + 1e-12
        ny_, nx_ = vy / n, vx / n
        # careful: for [[a,b],[b,c]] v=(b, lam-a) is (row comp, col comp); so row comp = Hrc, col comp = lam - Hrr
        ny_, nx_ = (Hrc / n) * np.where(use2, 0, 1) + ((lam - Hcc) / n) * np.where(use2, 1, 0), ((lam - Hrr) / n) * np.where(use2, 0, 1) + (Hrc / n) * np.where(use2, 1, 0)
        better = resp > Rb
        Rb = np.where(better, resp, Rb); NX = np.where(better, nx_, NX); NY = np.where(better, ny_, NY)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    Rb = Rb.astype(np.float32); NX = NX.astype(np.float32); NY = NY.astype(np.float32)
    Ra = cv2.remap(Rb, (xx + NX).astype(np.float32), (yy + NY).astype(np.float32), cv2.INTER_LINEAR, borderValue=0)
    Rc = cv2.remap(Rb, (xx - NX).astype(np.float32), (yy - NY).astype(np.float32), cv2.INTER_LINEAR, borderValue=0)
    nms = (Rb >= Ra) & (Rb >= Rc) & (Rb > 0)
    return Rb, nms, NX, NY

def prune_paths(paths, spur=4.0):
    """drop short branches that end freely next to a longer path (skeleton spurs)"""
    if len(paths) < 2: return paths
    L = [np.sum(np.hypot(*np.diff(Pp, axis=0).T)) if len(Pp) > 1 else 0 for Pp in paths]
    keep = []
    ends = {}
    for i, Pp in enumerate(paths):
        for e in (tuple(Pp[0].astype(int)), tuple(Pp[-1].astype(int))): ends.setdefault(e, []).append(i)
    for i, Pp in enumerate(paths):
        if L[i] >= spur: keep.append(Pp); continue
        a, b = tuple(Pp[0].astype(int)), tuple(Pp[-1].astype(int))
        ja = len(ends.get(a, [])) > 1; jb = len(ends.get(b, [])) > 1
        if ja and jb: keep.append(Pp)   # a short bridge between junctions stays
        elif not ja and not jb: keep.append(Pp)
        # else: a spur - dropped
    return keep

# ------------------------------------------------------------------------------------------------ soft shading
def fit_blobs(res, m, n=10, sigmas=(6, 10, 16, 26), minamp=0.03):
    """greedy soft shading: Gaussian blobs [cx, cy, s, a] (pixel-index coords) fitted to a residual inside mask m"""
    R = res.astype(np.float32) * m
    H, W = R.shape; yy, xx = np.mgrid[0:H, 0:W]
    out = []
    mf = m.astype(np.float32)
    for _ in range(n):
        best = None
        for s in sigmas:
            num = cv2.GaussianBlur(R, (0, 0), s); den = cv2.GaussianBlur(mf, (0, 0), s) + 1e-6
            # amplitude estimate at every centre = local weighted mean of the residual (blob shape = the kernel)
            k2 = cv2.GaussianBlur(mf, (0, 0), s / math.sqrt(2)) + 1e-6
            amp = num / den
            score = np.abs(amp) * np.sqrt(den) * m
            i = int(np.argmax(score)); y, x = divmod(i, W)
            sc = float(score[y, x])
            if best is None or sc > best[0]: best = (sc, x, y, s, float(amp[y, x]))
        sc, x, y, s, a = best
        if abs(a) < minamp: break
        g = np.exp(-((xx - x) ** 2 + (yy - y) ** 2) / (2 * s * s)).astype(np.float32)
        # least-squares amplitude for this blob inside the mask
        a = float((R * g).sum() / ((g * g * mf).sum() + 1e-6))
        if abs(a) < minamp: break
        R = R - a * g * mf
        out.append([float(x), float(y), float(s), a])
    return out

def eval_blobs(blobs, xs, ys):
    v = np.zeros(np.shape(xs), np.float32)
    for x, y, s, a in blobs: v += a * np.exp(-((xs - x) ** 2 + (ys - y) ** 2) / (2 * s * s))
    return v
