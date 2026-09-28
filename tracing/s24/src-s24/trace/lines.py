# Speed-line trace: in a frame rotated so the lines run horizontally, rows are split into bright runs, runs in
# neighbouring rows with matching ends are linked into bars, and each bar becomes one capsule
# (centre v, u0, u1, width = ink mass / core value, core value). Measurement only: output is line geometry.
import numpy as np, cv2
def rot_mats(theta_deg, W=2206, H=946):
    t = np.radians(theta_deg); c, s = np.cos(t), np.sin(t)
    oy = W * s
    M = np.float32([[c, s, 0], [-s, c, oy]])
    WR, HR = int(np.ceil(W * c + H * s)) + 1, int(np.ceil(W * s + H * c)) + 1
    return M, (WR, HR), (c, s, oy)
def rotate(img, theta, interp=cv2.INTER_LINEAR, fill=0):
    M, (WR, HR), _ = rot_mats(theta)
    return cv2.warpAffine(img, M, (WR, HR), flags=interp, borderMode=cv2.BORDER_CONSTANT, borderValue=fill)
def best_theta(u, ok, lo=29.5, hi=36.0, step=0.05):
    best = None
    for th in np.arange(lo, hi + 1e-9, step):
        R = rotate(np.where(ok, u, 0).astype(np.float32), th)
        V = rotate(ok.astype(np.float32), th)
        prof = R.sum(1) / np.maximum(V.sum(1), 1)
        sc = prof.var()
        if best is None or sc > best[1]: best = (th, sc)
    # refine
    lo2, hi2 = best[0] - step, best[0] + step
    for th in np.arange(lo2, hi2 + 1e-9, step / 5):
        R = rotate(np.where(ok, u, 0).astype(np.float32), th)
        V = rotate(ok.astype(np.float32), th)
        prof = R.sum(1) / np.maximum(V.sum(1), 1)
        sc = prof.var()
        if sc > best[1]: best = (th, sc)
    return best[0]
def runs_of(row, on):
    b = np.concatenate([[False], row > on, [False]])
    d = np.diff(b.astype(np.int8))
    return list(zip(np.where(d == 1)[0], np.where(d == -1)[0]))
def detect(u, occ, theta, on=26.0, min_len=18, tol=7.0):
    """u: pre-grade frame (0..255). occ: occluder mask (1 = not background: owl, scissors) -> list of bars in
    rotated coords [v, u0, u1, w, val, occ0, occ1]"""
    R = rotate(u.astype(np.float32), theta)
    O = rotate(occ.astype(np.uint8), theta, cv2.INTER_NEAREST, 1)   # outside the frame counts as occluded
    Ro = cv2.morphologyEx(R, cv2.MORPH_OPEN, np.ones((1, 9), np.uint8))
    Ro[O > 0] = 0
    HR = R.shape[0]
    rows = []
    for v in range(HR):
        rr = []
        for a, b in runs_of(Ro[v], on):
            if b - a < min_len: continue
            seg = Ro[v, a:b]
            rr.append([a, b, float(np.mean(seg[len(seg) // 8: len(seg) - len(seg) // 8 or None])), float(np.percentile(seg, 90))])
        rows.append(rr)
    # link
    bars = []; open_ = []
    for v in range(HR):
        nxt = []
        used = set()
        for r in rows[v]:
            best = None
            for bi in open_:
                B = bars[bi]; a, b = B['rows'][-1][1], B['rows'][-1][2]
                if abs(r[0] - a) < tol + 0.04 * (b - a) and abs(r[1] - b) < tol + 0.04 * (b - a):
                    sc = abs(r[0] - a) + abs(r[1] - b)
                    if bi not in used and (best is None or sc < best[0]): best = (sc, bi)
            if best is None:
                bars.append({'rows': [[v] + r]}); nxt.append(len(bars) - 1)
            else:
                used.add(best[1]); bars[best[1]]['rows'].append([v] + r); nxt.append(best[1])
        open_ = nxt
    out = []
    for B in bars:
        rs = np.array(B['rows'], np.float32)  # v, a, b, mean, p90
        pk = rs[:, 3].max()
        core = rs[rs[:, 3] >= 0.75 * pk]
        w = rs[:, 3].sum() / pk
        vc = (rs[:, 0] * rs[:, 3]).sum() / rs[:, 3].sum()
        u0 = float(np.median(core[:, 1])); u1 = float(np.median(core[:, 2]))
        val = float(np.median(core[:, 3]))
        # ends touching an occluder
        vi = int(round(vc)); o0 = int(O[vi, max(0, int(u0) - 3)]) if 0 <= vi < HR else 1; o1 = int(O[vi, min(O.shape[1] - 1, int(u1) + 3)]) if 0 <= vi < HR else 1
        out.append([vc, u0, u1, w, val, o0, o1, len(rs)])
    return out, R, O
def to_frame(bars, theta):
    """capsules in frame coords: [x0, y0, x1, y1, w, val]"""
    _, _, (c, s, oy) = rot_mats(theta)
    res = []
    for vc, u0, u1, w, val, *_ in bars:
        vv = vc - oy
        # inverse: x = u c - v s ; y = u s + v c
        x0, y0 = u0 * c - vv * s, u0 * s + vv * c
        x1, y1 = u1 * c - vv * s, u1 * s + vv * c
        res.append([x0, y0, x1, y1, w, val])
    return res
def render(caps, shape=(946, 2206), ss=2, soft=0.8):
    H, W = shape
    img = np.zeros((H * ss, W * ss), np.float32)
    for x0, y0, x1, y1, w, val in caps:
        m = np.zeros_like(img, np.uint8)
        cv2.line(m, (int(x0 * ss * 16), int(y0 * ss * 16)), (int(x1 * ss * 16), int(y1 * ss * 16)), 1, max(1, int(round(w * ss))), cv2.LINE_8, 4)
        img = np.where(m > 0, np.maximum(img, val), img)
    img = cv2.resize(img, (W, H), interpolation=cv2.INTER_AREA)
    return cv2.GaussianBlur(img, (0, 0), soft) if soft else img
def objects(u, occ, theta, open_len=61, thr=45, min_h=20, min_area=150, grow=5):
    """bright things that are not speed lines (scissors, glints): in the rotated frame, what a long horizontal
    opening removes, kept where the component is taller than a line. Returns a frame-coords mask."""
    R = rotate(u.astype(np.float32), theta)
    O = rotate(occ.astype(np.uint8), theta, cv2.INTER_NEAREST, 1)
    th = R - cv2.morphologyEx(R, cv2.MORPH_OPEN, np.ones((1, open_len), np.uint8))
    m = ((th > thr) & (O == 0)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros(n, bool)
    for i in range(1, n):
        if st[i, 3] >= min_h and st[i, 4] >= min_area: keep[i] = True
    obj = keep[lab].astype(np.uint8)
    # back to frame coords
    Mi, (WR, HR), _ = rot_mats(theta)
    obj_f = cv2.warpAffine(obj, Mi, (2206, 946), flags=cv2.INTER_NEAREST | cv2.WARP_INVERSE_MAP)
    return cv2.dilate(obj_f, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * grow + 1,) * 2))
