# Stroke rasterisation (anti-aliased coverage, like a canvas fill) + the joint value-study / stroke-value fit.
import numpy as np, cv2
from sim import stroke_poly
SS = 4

def cover(s, wscale=1.0, shape=None, caps=(True, True)):
    """coverage patch of one stroke: (x0, y0, patch float32 0..1) in the layer's pixel grid"""
    pg = stroke_poly(s, wscale, caps=caps)
    if pg is None: return None
    x0 = int(np.floor(pg[:, 0].min())) - 1; y0 = int(np.floor(pg[:, 1].min())) - 1
    x1 = int(np.ceil(pg[:, 0].max())) + 2; y1 = int(np.ceil(pg[:, 1].max())) + 2
    w, h = x1 - x0, y1 - y0
    m = np.zeros((h * SS, w * SS), np.uint8)
    cv2.fillPoly(m, [np.round((pg - [x0, y0]) * SS - 0.5).astype(np.int32)], 1)
    for j, i in ((0, 0), (1, len(s) - 1)):
        if not caps[j]:
            cx, cy = (s[i, :2] - [x0, y0]) * SS - 0.5; cv2.circle(m, (int(round(cx)), int(round(cy))), int(round(s[i, 2] * wscale * SS / 2)), 1, -1)
    c = cv2.resize(m.astype(np.float32), (w, h), interpolation=cv2.INTER_AREA)
    return x0, y0, c

def paste(dst, x0, y0, patch, fn):
    """apply fn(dst_region, patch_region) -> new values, with clipping"""
    H, W = dst.shape
    X0, Y0, X1, Y1 = max(0, x0), max(0, y0), min(W, x0 + patch.shape[1]), min(H, y0 + patch.shape[0])
    if X1 <= X0 or Y1 <= Y0: return
    p = patch[Y0 - y0:Y1 - y0, X0 - x0:X1 - x0]
    dst[Y0:Y1, X0:X1] = fn(dst[Y0:Y1, X0:X1], p)

def stroke_layers(shape, strokes, vals, wsc, caps=None):
    """painter's composite of the strokes over an unknown base: returns (a, s) with render = base * a + s"""
    a = np.ones(shape, np.float32); s = np.zeros(shape, np.float32)
    for pol in (-1, 1):
        for i, st in enumerate(strokes[pol]):
            cv = cover(st, wsc[pol][i], caps=caps[pol][i] if caps else (True, True))
            if cv is None: continue
            x0, y0, c = cv; v = vals[pol][i]
            paste(a, x0, y0, c, lambda d, p: d * (1 - p))
            paste(s, x0, y0, c, lambda d, p: d * (1 - p) + v * p)
    return a, s

def fit_base(I, a, s, known, region, sigma=2.0, amin=0.25):
    """value study consistent with the drawing model: base = (I - s) / a where the strokes leave it visible"""
    from fill import pushpull
    est = np.where(a > amin, (I - s) / np.maximum(a, amin), 0).astype(np.float32)
    wgt = np.where(known & (a > amin), a * a, 0).astype(np.float32)
    num = cv2.GaussianBlur(est * wgt, (0, 0), sigma); den = cv2.GaussianBlur(wgt, (0, 0), sigma)
    ok = den > 0.02
    B = np.where(ok, num / np.maximum(den, 1e-4), 0).astype(np.float32)
    B = pushpull(B, ok)
    return np.clip(B, 0, 1)

SOFT = float(__import__('os').environ.get('SOFT', 0))
SCALES = tuple(float(v) for v in __import__('os').environ.get('SCALES', '0.75,0.9,1.0,1.15,1.3').split(','))

def fit_strokes(I, B, strokes, vals, wsc, scales=None, refit_w=True, caps=None, soft=None):
    """per stroke: best width scale and value against I over the base B (each stroke alone over the base)"""
    scales = scales or SCALES; soft = SOFT if soft is None else soft
    bl = (lambda x: cv2.GaussianBlur(x, (0, 0), soft, borderType=cv2.BORDER_REPLICATE)) if soft > 0 else (lambda x: x)
    for pol in (-1, 1):
        for i, st in enumerate(strokes[pol]):
            best = None
            for sc in (scales if refit_w else (wsc[pol][i],)):
                cv = cover(st, sc, caps=caps[pol][i] if caps else (True, True))
                if cv is None: continue
                x0, y0, c = cv
                H, W = I.shape
                X0, Y0, X1, Y1 = max(0, x0), max(0, y0), min(W, x0 + c.shape[1]), min(H, y0 + c.shape[0])
                if X1 <= X0 or Y1 <= Y0: continue
                p = c[Y0 - y0:Y1 - y0, X0 - x0:X1 - x0]; Ii = I[Y0:Y1, X0:X1]; Bi = B[Y0:Y1, X0:X1]
                bp = bl(p); bB = bl(Bi * (1 - p))
                den = (bp * bp).sum()
                if den < 1e-3: continue
                v = float(np.clip((bp * (Ii - bB)).sum() / den, 0, 1))
                err = ((bB + v * bp - Ii) ** 2).sum()
                if best is None or err < best[0]: best = (err, sc, v)
            if best: wsc[pol][i], vals[pol][i] = best[1], best[2]
    return vals, wsc

def joint_values(I, B, strokes, vals, wsc, caps, soft=None, region=None, damp=0.02):
    """all stroke values at once (sparse least squares): render = B * A + sum_i v_i c'_i, c'_i = the stroke's coverage
    left visible by the strokes drawn after it (dark strokes first, then the white ones, in list order), softened by
    the final blur; fitted to I over region. Returns new vals (clipped to 0..1)."""
    import scipy.sparse as sp
    from scipy.sparse.linalg import lsqr
    soft = SOFT if soft is None else soft
    H, W = I.shape
    order = [(-1, i) for i in range(len(strokes[-1]))] + [(1, i) for i in range(len(strokes[1]))]
    covs = {}
    for pol, i in order:
        cv = cover(strokes[pol][i], wsc[pol][i], caps=caps[pol][i] if caps else (True, True))
        covs[(pol, i)] = cv
    occ = np.ones((H, W), np.float32)
    vis = {}
    for key in reversed(order):
        cv = covs[key]
        if cv is None: continue
        x0, y0, c = cv
        X0, Y0, X1, Y1 = max(0, x0), max(0, y0), min(W, x0 + c.shape[1]), min(H, y0 + c.shape[0])
        if X1 <= X0 or Y1 <= Y0: continue
        p = c[Y0 - y0:Y1 - y0, X0 - x0:X1 - x0]
        vis[key] = (X0, Y0, p * occ[Y0:Y1, X0:X1])
        occ[Y0:Y1, X0:X1] *= (1 - p)
    A = occ
    bl = (lambda x: cv2.GaussianBlur(x, (0, 0), soft, borderType=cv2.BORDER_CONSTANT)) if soft > 0 else (lambda x: x)
    base = cv2.GaussianBlur(B * A, (0, 0), soft) if soft > 0 else B * A
    rhs = (I - base)
    reg = np.ones((H, W), bool) if region is None else region
    idx = -np.ones((H, W), np.int64); idx[reg] = np.arange(reg.sum())
    rows, cols, data = [], [], []
    keys = [k for k in order if k in vis]
    m = int(np.ceil(soft * 3)) + 1 if soft > 0 else 0
    for j, key in enumerate(keys):
        X0, Y0, p = vis[key]
        pp = np.pad(p, m); pp = bl(pp) if m else pp
        ys, xs = np.nonzero(pp > 1e-3)
        gy, gx = ys + Y0 - m, xs + X0 - m
        ok = (gy >= 0) & (gy < H) & (gx >= 0) & (gx < W)
        gy, gx, v = gy[ok], gx[ok], pp[ys[ok], xs[ok]]
        r = idx[gy, gx]; sel = r >= 0
        rows.append(r[sel]); cols.append(np.full(sel.sum(), j)); data.append(v[sel])
    if not keys: return vals
    Mx = sp.csr_matrix((np.concatenate(data), (np.concatenate(rows), np.concatenate(cols))), shape=(int(reg.sum()), len(keys)))
    x0v = np.array([vals[k[0]][k[1]] for k in keys])
    # solve for the change from the current values, damped (keeps weakly seen strokes near their own measurement)
    b = rhs[reg] - Mx @ x0v
    dx = lsqr(Mx, b, damp=damp, iter_lim=400)[0]
    xv = np.clip(x0v + dx, 0, 1)
    for k, v in zip(keys, xv): vals[k[0]][k[1]] = float(v)
    return vals
