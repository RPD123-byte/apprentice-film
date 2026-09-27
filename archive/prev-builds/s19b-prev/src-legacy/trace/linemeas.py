# Card pose from its keylines (measurement only). Every line of the room card is a dark keyline: the paper's edge
# keyline (2.5 units outside the paper), the text box sides, the button line and the divider. Given rough frame
# positions of the visible ones (read off gridded frames, or predicted), each is refined to the darkest ridge within
# ±R px across it (robust line fit), then the homography (card corners) is solved from the line correspondences.
import numpy as np, cv2
from scipy.optimize import least_squares
from common import frame
CW, CH = 465, 648
C = np.float32([[0, 0], [CW, 0], [CW, CH], [0, CH]])
A = dict(x0=44.8, y0=153.8, x1=424.1, y1=601.2, btnY=538.8, divX=239.8)
K = 2.5
OUTMAX = None       # optional: the paper edge's outer side must be darker than this (graded grey)
MODEL = {  # name: ('u' or 'v', value)  -> the model line u = value or v = value (card units)
    'pL': ('u', -K), 'pR': ('u', CW + K), 'pT': ('v', -K), 'pB': ('v', CH + K),
    'bL': ('u', A['x0']), 'bR': ('u', A['x1']), 'bT': ('v', A['y0']), 'bB': ('v', A['y1']),
    'btn': ('v', A['btnY']), 'div': ('u', A['divX']),
}
def homog(src, dst):
    A = []; b = []
    for (x, y), (u, v) in zip(src, dst):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.append(u)
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y]); b.append(v)
    h = np.linalg.solve(np.array(A, float), np.array(b, float))
    return np.array([[h[0], h[1], h[2]], [h[3], h[4], h[5]], [h[6], h[7], 1.0]])
def Hq(q): return homog(np.float64(C), np.float64(q).reshape(4, 2))
def ph(H, pts):
    p = np.c_[pts, np.ones(len(pts))] @ H.T; return p[:, :2] / p[:, 2:3]
def refine(g, seg, R=12, n=24, blur=1.0, inner=None, kind='box'):
    b = cv2.GaussianBlur(g, (0, 0), blur).astype(np.float32)
    p0, p1 = np.array(seg[:2], float), np.array(seg[2:], float)
    t = p1 - p0; L = np.linalg.norm(t); t /= L; nrm = np.array([-t[1], t[0]])
    ss = np.arange(-R - 8, R + 8.01, 0.25); pts = []
    for u in np.linspace(0.04, 0.96, n):
        c = p0 + t * L * u
        xs = c[0] + nrm[0] * ss; ys = c[1] + nrm[1] * ss
        if xs.min() < 1 or ys.min() < 1 or xs.max() > g.shape[1] - 2 or ys.max() > g.shape[0] - 2: continue
        prof = cv2.remap(b, xs.astype(np.float32).reshape(1, -1), ys.astype(np.float32).reshape(1, -1), cv2.INTER_LINEAR)[0]
        # candidate minima: local minima that are keylines (darker than both sides by a margin) with paper on the
        # required side(s); take the one nearest the prediction
        cand = []
        sgn = 1.0 if inner is None else float(np.sign(np.dot(nrm, inner)))
        for i in range(2, len(prof) - 2):
            if abs(ss[i]) > R or not (prof[i] <= prof[i - 1] and prof[i] <= prof[i + 1]): continue
            lo = prof[max(0, i - 16):i + 1].max(); hi = prof[i:i + 17].max()
            if min(lo, hi) - prof[i] < 7: continue
            j_in = i + int(round(sgn * 6 / 0.25)); j_out = i - int(round(sgn * 6 / 0.25))
            def at(j): return prof[j] if 0 <= j < len(prof) else None
            pin, pout = at(j_in), at(j_out)
            if kind == 'paper' and (pin is None or pin < 150 or (OUTMAX and pout is not None and pout > OUTMAX)): continue
            if kind == 'box' and ((pin is not None and pin < 140) or (pout is not None and pout < 140)): continue
            cand.append((abs(ss[i]), i))
        if not cand: continue
        i = min(cand)[1]
        pts.append(c + nrm * ss[i])
    pts = np.array(pts)
    if len(pts) < 5: return None
    # robust line: iterate least squares dropping outliers
    keep = np.ones(len(pts), bool)
    for _ in range(4):
        P = pts[keep]; m = P.mean(0); U, S, Vt = np.linalg.svd(P - m); d = Vt[0]; nn = np.array([-d[1], d[0]])
        r = np.abs((pts - m) @ nn); keep = r < max(1.5, 2.5 * np.median(r[keep]))
    return pts[keep], m, d
def solve(lines, q0, prior=0.01):
    """lines: [(name, pts)], pts = refined frame points on that keyline"""
    def res(p):
        H = Hq(p.reshape(4, 2)); out = []
        for nm, pts in lines:
            ax, val = MODEL[nm]
            a, b = ((val, -200), (val, CH + 200)) if ax == 'u' else ((-200, val), (CW + 200, val))
            pa, pb = ph(H, np.array([a, b], float)); d = pb - pa; d /= np.linalg.norm(d); nn = np.array([-d[1], d[0]])
            out += list((pts - pa) @ nn)
        out += list((p - np.float64(q0).ravel()) * prior)
        return np.array(out)
    r = least_squares(res, np.float64(q0).ravel(), loss='soft_l1', f_scale=2.0, max_nfev=2000, x_scale=10)
    rr = res(r.x)[:-8]
    return r.x.reshape(4, 2), float(np.sqrt(np.mean(rr ** 2)))
def measure(t, rough, q0, R=12):
    g = frame(int(round(t * 25)))
    L = []
    for nm, seg in rough:
        r = refine(g, seg, R=R)
        if r is not None: L.append((nm, r[0]))
    q, rms = solve(L, q0)
    return q, rms, [(nm, len(p)) for nm, p in L]

def per_line(q, L):
    H = Hq(q); per = {}
    for nm, pts in L:
        ax, val = MODEL[nm]; a, b = ((val, -200), (val, CH + 200)) if ax == 'u' else ((-200, val), (CW + 200, val))
        pa, pb = ph(H, np.array([a, b], float)); d = (pb - pa) / np.linalg.norm(pb - pa); n = np.array([-d[1], d[0]])
        per[nm] = float(np.sqrt(np.mean(((pts - pa) @ n) ** 2)))
    return per
def model_seg(nm):
    ax, val = MODEL[nm]
    if nm in ('pL', 'pR'): return (val, 30), (val, CH - 30)
    if nm in ('pT', 'pB'): return (30, val), (CW - 30, val)
    if nm in ('bL', 'bR'): return (val, A['y0'] + 12), (val, A['y1'] - 12)
    if nm in ('bT', 'bB'): return (A['x0'] + 12, val), (A['x1'] - 12, val)
    if nm == 'btn': return (A['x0'] + 5, val), (A['x1'] - 5, val)
    return (val, A['btnY'] + 4), (val, A['y1'] - 4)
def clip_seg(p0, p1, W=2206, Hh=946, m=4):
    # clip a frame segment to the image (parametric), None if outside
    t0, t1 = 0.0, 1.0; d = p1 - p0
    for k, lo, hi in ((0, m, W - m), (1, m, Hh - m)):
        if abs(d[k]) < 1e-9:
            if p0[k] < lo or p0[k] > hi: return None
            continue
        a, b = (lo - p0[k]) / d[k], (hi - p0[k]) / d[k]
        if a > b: a, b = b, a
        t0, t1 = max(t0, a), min(t1, b)
    if t1 - t0 < 1e-3: return None
    return p0 + d * t0, p0 + d * t1
def inner_dir(q, nm, seg):
    H = Hq(q); c = ph(H, np.array([[CW / 2, CH / 2]], float))[0]
    m = np.array([(seg[0] + seg[2]) / 2, (seg[1] + seg[3]) / 2]); d = c - m
    return d / (np.linalg.norm(d) + 1e-9)
def robust(t, rough, q0, R=12, repredict=True, skip=()):
    g = frame(int(round(t * 25)))
    L = []
    for nm, seg in rough:
        r = refine(g, seg, R=R, inner=inner_dir(q0, nm, seg), kind='paper' if nm[0] == 'p' else 'box')
        if r is not None: L.append((nm, r[0]))
    def fit(L, q):
        while True:
            q2, rms = solve(L, q)
            if rms <= 2.5 or len(L) <= 4: return q2, rms, L
            best = None
            for i in range(len(L)):
                qq, rr = solve(L[:i] + L[i + 1:], q)
                if best is None or rr < best[1]: best = (i, rr)
            L = L[:best[0]] + L[best[0] + 1:]
    q, rms, L = fit(L, q0)
    if repredict:
        H = Hq(q); L2 = []
        for nm in MODEL:
            if nm in skip: continue
            a, b = model_seg(nm)
            P = ph(H, np.array([a, b], float)); cs = clip_seg(P[0], P[1])
            if cs is None or np.linalg.norm(cs[1] - cs[0]) < 40: continue
            sg = (*cs[0], *cs[1]); r = refine(g, sg, R=6, inner=inner_dir(q, nm, sg), kind='paper' if nm[0] == 'p' else 'box')
            if r is not None: L2.append((nm, r[0]))
        per = per_line(q, L2)
        L2 = [(nm, p) for nm, p in L2 if per[nm] < 4]
        if len(L2) >= 4: q, rms, L = fit(L2, q)
    return q, rms, [nm for nm, _ in L]
