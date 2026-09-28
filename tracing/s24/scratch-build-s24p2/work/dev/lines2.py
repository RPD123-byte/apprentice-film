# Speed-line trace v2: components in the frame rotated to the median line angle; each component is fitted as one
# straight bar (PCA of its bright pixels: endpoints, ink-mass width, core value); a component the bar leaves
# largely unexplained is split by peeling (fit the dominant bar, remove its pixels, fit the rest).
# Measurement only: output is line geometry (frame px) + grey values.
import numpy as np, cv2
from lines import rot_mats, rotate
def fit_bar(ys, xs, vals):
    pts = np.stack([xs, ys], 1).astype(np.float64)
    w8 = vals / vals.sum()
    c = (pts * w8[:, None]).sum(0)
    C = ((pts - c).T * w8) @ (pts - c)
    ev, evec = np.linalg.eigh(C)
    d = evec[:, 1]
    if d[0] < 0: d = -d
    t = (pts - c) @ d; nrm = (pts - c) @ np.array([-d[1], d[0]])
    p95 = np.percentile(vals, 92)
    core = vals >= 0.72 * p95
    val = float(np.median(vals[core])) if core.sum() > 3 else float(p95)
    tc = t[vals >= 0.5 * val] if (vals >= 0.5 * val).sum() > 3 else t
    t0, t1 = np.percentile(tc, 0.5), np.percentile(tc, 99.5)
    L = max(t1 - t0, 1.0)
    w = float(vals.sum() / (val * L))
    off = float(np.median(nrm[core])) if core.sum() > 3 else 0.0
    cc = c + off * np.array([-d[1], d[0]])
    return dict(c=cc, d=d, t0=t0, t1=t1, w=w, val=val, L=L, nrm=nrm - off, t=t)
def bar_pixels(b, ys, xs, pad=0.8):
    pts = np.stack([xs, ys], 1).astype(np.float64)
    t = (pts - b['c']) @ b['d']; n = (pts - b['c']) @ np.array([-b['d'][1], b['d'][0]])
    return (np.abs(n) <= b['w'] / 2 + pad) & (t >= b['t0'] - 2) & (t <= b['t1'] + 2)
def detect2(u, occ, theta, on=22.0, min_area=25, max_peel=6):
    R = rotate(u.astype(np.float32), theta)
    O = rotate(occ.astype(np.uint8), theta, cv2.INTER_NEAREST, 1)
    Ro = cv2.morphologyEx(R, cv2.MORPH_OPEN, np.ones((1, 7), np.uint8))
    B = ((Ro > on) & (O == 0)).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(B, connectivity=4)
    bars = []
    for i in range(1, n):
        if st[i, 4] < min_area: continue
        x0, y0, w_, h_ = st[i, :4]
        sub = lab[y0:y0 + h_, x0:x0 + w_] == i
        ys, xs = np.nonzero(sub); vals = R[y0:y0 + h_, x0:x0 + w_][sub]
        ys = ys + y0; xs = xs + x0
        left = np.ones(len(ys), bool)
        for it in range(max_peel):
            if left.sum() < min_area: break
            b = fit_bar(ys[left], xs[left], vals[left])
            # if the component is thick (two lines side by side), refit on the brighter half's rows
            inb = bar_pixels(b, ys, xs) & left
            if inb.sum() < 0.3 * left.sum() and it > 0: break
            b['n'] = int(inb.sum())
            touch0 = O[int(np.clip(b['c'][1] + b['d'][1] * (b['t0'] - 4), 0, O.shape[0] - 1)), int(np.clip(b['c'][0] + b['d'][0] * (b['t0'] - 4), 0, O.shape[1] - 1))]
            touch1 = O[int(np.clip(b['c'][1] + b['d'][1] * (b['t1'] + 4), 0, O.shape[0] - 1)), int(np.clip(b['c'][0] + b['d'][0] * (b['t1'] + 4), 0, O.shape[1] - 1))]
            bars.append([b['c'][0] + b['d'][0] * b['t0'], b['c'][1] + b['d'][1] * b['t0'], b['c'][0] + b['d'][0] * b['t1'], b['c'][1] + b['d'][1] * b['t1'], b['w'], b['val'], int(touch0), int(touch1)])
            left &= ~inb
            if left.sum() < 0.15 * len(ys): break
    return bars, R, O
def to_frame2(bars, theta):
    _, _, (c, s, oy) = rot_mats(theta)
    res = []
    for u0, v0, u1, v1, w, val, o0, o1 in bars:
        a = [u0 * c - (v0 - oy) * s, u0 * s + (v0 - oy) * c]
        b = [u1 * c - (v1 - oy) * s, u1 * s + (v1 - oy) * c]
        res.append([a[0], a[1], b[0], b[1], w, val, o0, o1])
    return res
def render2(caps, shape=(946, 2206), ss=4, soft=0.6, cap=True):
    """max-composited bars with round-ish ends (anti-aliased by supersampling)"""
    H, W = shape
    img = np.zeros((H * ss, W * ss), np.float32)
    for x0, y0, x1, y1, w, val, *_ in caps:
        m = np.zeros((H * ss, W * ss), np.uint8)
        th = max(1, int(round(w * ss)))
        cv2.line(m, (int(round(x0 * ss)), int(round(y0 * ss))), (int(round(x1 * ss)), int(round(y1 * ss))), 1, th, cv2.LINE_8)
        np.maximum(img, m * np.float32(val), out=img)
    img = cv2.resize(img, (W, H), interpolation=cv2.INTER_AREA)
    return cv2.GaussianBlur(img, (0, 0), soft) if soft else img
