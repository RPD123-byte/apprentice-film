# Speed-line trace v3: rows of the frame rotated to the median line angle are split into bright runs; runs in
# neighbouring rows that overlap (most of the shorter one inside the other) are linked into one bar; each bar gets a
# small tilt (weighted regression of row position on run centre), end points from its runs, an ink-mass width and
# its core value. Measurement only: output is line geometry (frame px) + grey values.
import numpy as np, cv2
from lines import rot_mats, rotate, runs_of
BG = 4.0
VALLEY = 0.4
def detect3(u, occ, theta, on=20.0, min_len=12, min_mass=0, sx=4.0):
    R = rotate(u.astype(np.float32), theta)
    O = rotate(occ.astype(np.uint8), theta, cv2.INTER_NEAREST, 1)
    Ro = cv2.GaussianBlur(R, (0, 0), sigmaX=sx, sigmaY=0.3)
    Ro[O > 0] = 0
    HR = R.shape[0]
    bars = []; open_ = []
    for v in range(HR):
        runs = []
        for a, b in runs_of(Ro[v], on):
            if b - a < min_len: continue
            seg = Ro[v, a:b]
            runs.append((a, b, float(seg.mean()), float(np.percentile(seg, 80))))
        nxt = []; taken = {}
        for (a, b, mn, p8) in runs:
            best = None
            for bi in open_:
                B = bars[bi]; ea, eb = B['ext']
                ov = min(b, eb) - max(a, ea)
                if ov <= 0: continue
                la, lb = b - a, eb - ea
                if ov / min(la, lb) < 0.7: continue
                # a much shorter run of a clearly different value next to a long bar starts its own bar
                if la < 0.5 * lb and abs(p8 - B['core']) > 0.3 * B['core'] and p8 > B['core']: continue
                # a valley row (much dimmer than the bar's core) ends the bar: two lines lying close together
                if len(B['rows']) >= 2 and mn < VALLEY * B['core']: continue
                sc = ov / max(la, lb)
                if best is None or sc > best[0]: best = (sc, bi)
            if best is not None and best[1] in taken:
                # two runs want the same bar: the better overlap keeps it
                if taken[best[1]][0] >= best[0]: best = None
            row = [v, a, b, mn, p8]
            if best is None:
                bars.append({'rows': [row], 'ext': (a, b), 'core': p8}); bi = len(bars) - 1
            else:
                bi = best[1]; B = bars[bi]; B['rows'].append(row)
                if b - a > B['ext'][1] - B['ext'][0]: B['ext'] = (a, b)
                B['core'] = max(B['core'], p8)
            taken[bi] = (best[0] if best else 1.0, bi)
            nxt.append(bi)
        open_ = list(dict.fromkeys(nxt))
    out = []
    for B in bars:
        rs = np.array(B['rows'], np.float64)  # v a b mean p80
        core = np.percentile(rs[:, 4], 80)
        vA, vB = max(0, int(rs[:, 0].min()) - 3), min(R.shape[0] - 1, int(rs[:, 0].max()) + 3)
        uA, uB = int(rs[:, 1].min()), int(rs[:, 2].max())
        patch = R[vA:vB + 1, uA:uB].astype(np.float64)
        msk = np.zeros_like(patch, bool)
        for v, a, b, *_ in rs: msk[int(v) - vA, int(a) - uA:int(b) - uA] = True
        msk = cv2.dilate(msk.astype(np.uint8), np.ones((7, 1), np.uint8)) > 0
        pw = np.where(msk, np.clip(patch - BG, 0, None), 0)
        colm = pw.sum(0)
        good = colm > 0.25 * core
        if good.sum() < 3: continue
        us = np.arange(uA, uB)[good].astype(np.float64)
        vs = ((pw * (np.arange(vA, vB + 1)[:, None])).sum(0)[good] / colm[good])
        wt = colm[good]
        if len(us) > 8 and us.max() - us.min() > 20:
            A = np.c_[np.ones_like(us), us - us.mean()]
            co = np.linalg.lstsq(A * wt[:, None] ** 0.5, vs * wt ** 0.5, rcond=None)[0]
        else:
            co = [float((vs * wt).sum() / wt.sum()), 0.0]
        slope = float(np.clip(co[1], -0.06, 0.06))
        u0, u1 = float(us.min()), float(us.max() + 1)
        v0 = co[0] + slope * (u0 - us.mean()); v1 = co[0] + slope * (u1 - us.mean())
        w = float(np.median(wt) / core) if core > 0 else 1.0
        if w > 12 and core < 60: continue
        # brightness along the bar: column mass in the first and last thirds (as a value at each end)
        n3 = max(1, len(wt) // 3)
        va = float(np.median(wt[:n3]) / w); vb = float(np.median(wt[-n3:]) / w)
        out.append([u0, v0, u1, v1, w, float(core), va, vb])
    return out, R, O
def to_frame3(bars, theta):
    _, _, (c, s, oy) = rot_mats(theta)
    res = []
    for u0, v0, u1, v1, w, val, va, vb in bars:
        a = [u0 * c - (v0 - oy) * s, u0 * s + (v0 - oy) * c]
        b = [u1 * c - (v1 - oy) * s, u1 * s + (v1 - oy) * c]
        res.append([a[0], a[1], b[0], b[1], w, val, va, vb])
    return res
from scipy.ndimage import map_coordinates
def refine(caps, u, occ=None, iters=2):
    """re-centre each bar on the source: perpendicular profiles along it -> centroid offsets fitted linearly in t;
    width from the profile mass / core value"""
    out = []
    for c in caps:
        x0, y0, x1, y1, w, val, mass = c
        for it in range(iters):
            L = np.hypot(x1 - x0, y1 - y0)
            if L < 20: break
            d = np.array([x1 - x0, y1 - y0]) / L; n = np.array([-d[1], d[0]])
            m = max(3, int(L / 30))
            ts = np.linspace(0.08, 0.92, m)
            half = w / 2 + 3.0
            ss = np.arange(-half, half + 1e-6, 0.25)
            T, O, Wt, Ms = [], [], [], []
            for t in ts:
                p = np.array([x0, y0]) + d * L * t
                pts = p[None, :] + ss[:, None] * n[None, :]
                if occ is not None:
                    xi = np.clip(pts[:, 0].astype(int), 0, u.shape[1] - 1); yi = np.clip(pts[:, 1].astype(int), 0, u.shape[0] - 1)
                    if occ[yi, xi].any(): continue
                if pts[:, 0].min() < 0 or pts[:, 1].min() < 0 or pts[:, 0].max() > u.shape[1] - 1 or pts[:, 1].max() > u.shape[0] - 1: continue
                prof = map_coordinates(u, [pts[:, 1], pts[:, 0]], order=1)
                bg = min(prof[:4].mean(), prof[-4:].mean())
                q = np.clip(prof - bg, 0, None)
                if q.sum() < 1: continue
                T.append(t); O.append((q * ss).sum() / q.sum()); Wt.append(q.sum()); Ms.append(q.sum() * 0.25)
            if len(T) < 2: break
            T = np.array(T); O = np.array(O); Wt = np.array(Wt)
            A = np.c_[np.ones_like(T), T]
            co = np.linalg.lstsq(A * Wt[:, None] ** 0.5, O * Wt ** 0.5, rcond=None)[0]
            co = np.clip(co, -4, 4)
            s0, s1 = co[0], co[0] + co[1]
            x0, y0 = x0 + n[0] * s0, y0 + n[1] * s0
            x1, y1 = x1 + n[0] * s1, y1 + n[1] * s1
            mm = float(np.median(Ms))
            if val > 1: w = float(np.clip(mm / val, 0.5, 24))
        out.append([x0, y0, x1, y1, w, val, mass])
    return out
