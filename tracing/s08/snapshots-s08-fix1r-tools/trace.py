# Half-level tracing of flat colour regions on the source's first frames (F0, average of frames 764-767).
import cv2, numpy as np, os, sys
sys.path.insert(0, 'snapshots/s08-fix1r-tools')
from cam import f0
from skimage import measure
CACHE = 'snapshots/s08-fix1r-tools/S0.npy'
def srcF0(ks=range(764, 768)):
    if os.path.exists(CACHE): return np.load(CACHE)
    S = sum(f0(cv2.imread(f'snapshots/s08-p4-src/f{k}.png').astype(np.float32), k) for k in ks) / len(ks)
    np.save(CACHE, S); return S
def med(S, x, y, r=2): return np.median(S[y - r:y + r + 1, x - r:x + r + 1].reshape(-1, 3), 0)
def catmull(pts, per=3):
    n = len(pts); out = []
    for i in range(n):
        p0, p1, p2, p3 = pts[(i - 1) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        for j in range(per):
            t = j / per; t2 = t * t; t3 = t2 * t
            out.append(0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    return np.array(out)
def field(S, box, col, dark, others=(), sig=0.0):
    """t = projection of the pixel colour on dark->col (0 dark, 1 band); zeroed where another band colour is nearer"""
    x0, y0, x1, y1 = box
    P = S[y0:y1, x0:x1].astype(np.float64)
    if sig: P = cv2.GaussianBlur(P, (0, 0), sig)
    c = np.array(col, float); d = np.array(dark, float); v = c - d
    t = ((P - d) @ v) / (v @ v)
    dc = np.linalg.norm(P - c, axis=-1)
    for o in others:
        do = np.linalg.norm(P - np.array(o, float), axis=-1)
        t = np.where(do < dc, np.minimum(t, 0.0), t)
    return t
def contour(t, box, seed, level=0.5, eps=0.6):
    x0, y0 = box[0], box[1]
    tp = np.pad(t, 1, constant_values=0)
    cs = measure.find_contours(tp, level)
    best = None
    for c in cs:
        pts = np.c_[c[:, 1] - 1 + x0, c[:, 0] - 1 + y0]
        if len(pts) < 8: continue
        if cv2.pointPolygonTest(pts.astype(np.float32), (float(seed[0]), float(seed[1])), False) > 0:
            a = cv2.contourArea(pts.astype(np.float32))
            if best is None or a < best[0]: best = (a, pts)
    if best is None: return None
    pts = best[1]
    ap = cv2.approxPolyDP(pts.astype(np.float32).reshape(-1, 1, 2), eps, True).reshape(-1, 2)
    return ap.astype(float)
def overlay(S, box, polys, sc=4, out='ov.jpg', R=None):
    x0, y0, x1, y1 = box
    ims = []
    for base in ([S] if R is None else [R, S]):
        im = cv2.resize(np.clip(base[y0:y1, x0:x1], 0, 255).astype(np.uint8), None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
        for pts, colr in polys:
            q = catmull(np.array(pts, float))
            q = ((q - [x0, y0]) * sc).astype(np.int32)
            cv2.polylines(im, [q], True, colr, 1, cv2.LINE_AA)
        ims.append(im)
    cv2.imwrite(out, np.hstack(ims) if len(ims) > 1 else ims[0])
def fmt(pts): return ','.join(f'{v:.1f}' for p in pts for v in p)
def lines_field(S, box, bands, dark, sig=0.0):
    """per band: t on the dark->band line; each pixel is given to the band whose line it lies nearest (others get t=0)"""
    x0, y0, x1, y1 = box
    P = S[y0:y1, x0:x1].astype(np.float64)
    if sig: P = cv2.GaussianBlur(P, (0, 0), sig)
    d = np.array(dark, float); Q = P - d
    T, Rr = [], []
    for c in bands:
        v = np.array(c, float) - d
        t = (Q @ v) / (v @ v)
        r = np.linalg.norm(Q - t[..., None] * v, axis=-1) / (np.linalg.norm(v) * np.maximum(np.abs(t), 0.15))
        T.append(t); Rr.append(r)
    T = np.array(T); Rr = np.array(Rr); best = Rr.argmin(0)
    return [np.where(best == i, T[i], np.minimum(T[i], 0.0)) for i in range(len(bands))]
