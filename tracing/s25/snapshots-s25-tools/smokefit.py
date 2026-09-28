#!/usr/bin/env python3
# smokefit.py F0 F1 -- the chaos smoke as soft gaussian puffs per frame: the brightness the frame adds over the clean
# chaos plate (approximately ungraded: S-curve, vignette and flicker undone), blurred sigma 6, with the owls (their
# measured hulls), chips and thin lines left out; greedy fit of up to N gaussians. Writes ../s25-meas/smoke.json
# {frame: [x, y, sx, sy, a, ...]} (frame px, a = added value 0..1).
import cv2, numpy as np, json, sys, os
from extract2 import OLD
HERE = os.path.dirname(os.path.abspath(__file__)); MEAS = os.path.join(HERE, '..', 's25-meas')
SRC = os.path.join(HERE, '..', 's25-src', 'f%05d.png')
H, W = 946, 2206
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
qx = ((xx + 0.5) / W - 0.5) * 2; qy = ((yy + 0.5) / H - 0.5) * 2
VIG = 1 - 0.38 * np.clip((qx * qx + qy * qy) / 2, 0, 1) ** 1.15
LUT_S = np.linspace(0, 1, 4096)
LUT_F = LUT_S * 0.65 + 0.35 * LUT_S * LUT_S * (3 - 2 * LUT_S)
def inv(g, t):
    fl = 1 + 0.018 * np.sin(t * 2 * np.pi * 0.9) + 0.012 * np.sin(t * 2 * np.pi * 2.3 + 1.0)
    v = np.clip(g.astype(np.float32) / 255 / (VIG * fl), 0, 1)
    return np.interp(v, LUT_F, LUT_S).astype(np.float32)
SCHED = json.load(open(os.path.join(MEAS, 'sched.json')))
FX = json.load(open(os.path.join(MEAS, 'fxrows.json')))
def fxmask(f):
    m = np.zeros((H, W), np.uint8)
    i = f - FX['CHIPS_F0']
    if 0 <= i < len(FX['CHIPS']):
        r = FX['CHIPS'][i]
        for k in range(0, len(r) - 5, 6):
            x, y, w, h, a, v = r[k:k + 6]
            box = cv2.boxPoints(((x, y), (w + 8, h + 8), np.degrees(a)))
            cv2.fillPoly(m, [np.round(box).astype(np.int32)], 1)
    i = f - FX['SLASH_F0']
    if 0 <= i < len(FX['SLASH']):
        for cx, cy, a, b, rot, t0, t1, w, v in FX['SLASH'][i]:
            ts = np.linspace(t0, t1, 80); c, s_ = np.cos(rot), np.sin(rot)
            pts = np.stack([cx + a * np.cos(ts) * c - b * np.sin(ts) * s_, cy + a * np.cos(ts) * s_ + b * np.sin(ts) * c], 1)
            cv2.polylines(m, [np.round(pts).astype(np.int32)], False, 1, int(w * 2 + 10))
    return m
ECHOES = [
  (102.38, 102.74, [[102.38, 540, 225, 0.46], [102.56, 457, 240, 0.46], [102.6, 430, 236, 0.46], [102.64, 566, 309, 0.5], [102.68, 784, 345, 0.52], [102.72, 918, 447, 0.55]]),
  (102.38, 102.74, [[102.38, 1900, 205, 0.46], [102.56, 1773, 280, 0.46], [102.6, 1620, 369, 0.48], [102.64, 1454, 433, 0.5], [102.72, 1268, 529, 0.52]]),
  (102.42, 102.7, [[102.42, 1740, 600, 0.44], [102.56, 1824, 665, 0.44], [102.64, 1647, 633, 0.46], [102.7, 1400, 560, 0.5]]),
  (102.42, 102.7, [[102.42, 98, 793, 0.44], [102.5, 107, 736, 0.44], [102.6, 492, 726, 0.46], [102.66, 657, 641, 0.48], [102.7, 800, 580, 0.5]])]
def echomask(f):
    m = np.zeros((H, W), np.uint8); t = f / 25
    for t0, t1, keys in ECHOES:
        if t < t0 or t > t1: continue
        ts = [k[0] for k in keys]
        x = np.interp(t, ts, [k[1] for k in keys]); y = np.interp(t, ts, [k[2] for k in keys]); s = np.interp(t, ts, [k[3] for k in keys])
        cv2.ellipse(m, (int(x), int(y)), (int(330 * s), int(230 * s)), 0, 0, 360, 1, -1)
    return m
def owlmask(f):
    m = np.zeros((H, W), np.uint8)
    keys = []
    i = f - SCHED['CHAOS_F0']
    if 0 <= i < len(SCHED['CHAOS']): keys.append(SCHED['CHAOS'][i])
    i = f - SCHED['ECHO_F0']
    if 0 <= i < len(SCHED['ECHO']): keys += SCHED['ECHO'][i]
    for r in keys:
        k, A = r[0], np.array(r[1:7]).reshape(3, 2).T  # canvas order a b c d e f -> [[a c e],[b d f]]
        if k not in OLD: continue
        for ring in OLD[k]['mask']:
            p = np.array(ring, float).reshape(-1, 2); q = (A[:, :2] @ p.T).T + A[:, 2]
            cv2.fillPoly(m, [np.round(q).astype(np.int32)], 1)
    return cv2.dilate(m, np.ones((15, 15), np.uint8))
V = 0.93  # the smoke's own value (pre-grade): smoke is laid OVER the page with alpha
def fit(f, N=20, sigs=(26, 40, 60, 90, 130, 200)):
    """alpha of grey smoke (value V) over the clean plate, as gaussian puffs: weighted matching pursuit, a >= 0"""
    g = cv2.imread(SRC % f, 0); pl = cv2.imread(os.path.join(MEAS, 'chaos-p30.png'), 0)
    t = f / 25
    S_, P_ = inv(g, t), inv(pl, t)
    if 2560 <= f <= 2575:  # the burst's smear is textured: leave out only the static thin lines (plate)
        thin = cv2.dilate((cv2.morphologyEx(pl, cv2.MORPH_TOPHAT, np.ones((11, 11), np.uint8)) > 30).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    else:
        thin = cv2.morphologyEx(g, cv2.MORPH_TOPHAT, np.ones((11, 11), np.uint8)) > 40
    valid = (owlmask(f) == 0) & (fxmask(f) == 0) & (echomask(f) == 0) & (P_ < V - 0.12) & (~thin)
    valid[:120] = False; valid[925:] = False
    valid[:, :140] = False; valid[:, 2028:] = False
    A = np.clip((S_ - P_) / np.maximum(V - P_, 0.12), -1, 1.2)
    wv = valid.astype(np.float32)
    num = cv2.GaussianBlur(A * wv, (0, 0), 6); den = cv2.GaussianBlur(wv, (0, 0), 6)
    R = np.where(den > 0.15, num / np.maximum(den, 1e-3), 0).astype(np.float32)
    Wt = (den > 0.15).astype(np.float32)
    Rs = R[::4, ::4].copy(); Ws = Wt[::4, ::4]; h, w = Rs.shape
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    blobs = []
    for it in range(N):
        B = cv2.GaussianBlur(Rs * Ws, (0, 0), 3) / np.maximum(cv2.GaussianBlur(Ws, (0, 0), 3), 1e-3)
        y0, x0 = np.unravel_index(np.argmax(B * (Ws > 0)), B.shape)
        if B[y0, x0] < 0.04: break
        best = None
        for s in sigs:
            s4 = s / 4
            G = np.exp(-0.5 * ((xs - x0) ** 2 + (ys - y0) ** 2) / s4 ** 2)
            a = float((Ws * Rs * G).sum() / max((Ws * G * G).sum(), 1e-6))
            a = max(0.0, min(a, 1.0))
            red = (Ws * Rs ** 2).sum() - (Ws * (Rs - a * G) ** 2).sum()
            if best is None or red > best[0]: best = (red, s, a, G)
        red, s, a, G = best
        if a < 0.03 or red <= 0: 
            Rs[max(0, y0 - 1):y0 + 2, max(0, x0 - 1):x0 + 2] = 0
            continue
        Rs = Rs - a * G
        blobs += [round(float(x0 * 4 + 2), 1), round(float(y0 * 4 + 2), 1), float(s), float(s), round(a, 3)]
    return blobs
if __name__ == '__main__':
    f0, f1 = int(sys.argv[1]), int(sys.argv[2])
    p = os.path.join(MEAS, 'smoke.json')
    out = json.load(open(p)) if os.path.exists(p) else {}
    for f in range(f0, f1 + 1):
        out[str(f)] = fit(f, N=40) if 2560 <= f <= 2575 else fit(f)
        print(f, len(out[str(f)]) // 5, 'blobs', 'max a', max(out[str(f)][4::5]) if out[str(f)] else 0, flush=True)
    json.dump(out, open(p, 'w'))

# ---------------------------------------------------------------- v3: anisotropic puffs, least-squares refined
from scipy.optimize import minimize as _min
def target(f, outside=False):
    g = cv2.imread(SRC % f, 0); pl = cv2.imread(os.path.join(MEAS, 'chaos-p30.png'), 0)
    t = f / 25
    S_, P_ = inv(g, t), inv(pl, t)
    if 2560 <= f <= 2575:
        thin = cv2.dilate((cv2.morphologyEx(pl, cv2.MORPH_TOPHAT, np.ones((11, 11), np.uint8)) > 30).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    else:
        thin = cv2.morphologyEx(g, cv2.MORPH_TOPHAT, np.ones((11, 11), np.uint8)) > 40
    em = echomask(f) if f < 2566 else np.zeros((H, W), np.uint8)
    if f <= 2513:  # the opening wipe: only above the white band
        em = em | ((yy > (884 + (f - 2512) * 476) - 0.4275 * xx - 12).astype(np.uint8))
    valid = (owlmask(f) == 0) & (fxmask(f) == 0) & (em == 0) & (P_ < V - 0.12) & (~thin)
    if not outside:
        valid[:120] = False; valid[925:] = False; valid[:, :140] = False; valid[:, 2028:] = False
    A = np.clip((S_ - P_) / np.maximum(V - P_, 0.12), 0, 1)
    wv = valid.astype(np.float32)
    num = cv2.GaussianBlur(A * wv, (0, 0), 4); den = cv2.GaussianBlur(wv, (0, 0), 4)
    T = np.where(den > 0.15, num / np.maximum(den, 1e-3), 0).astype(np.float32)
    Wt = np.clip(den / 0.5, 0, 1).astype(np.float32)
    return cv2.resize(T, (W // 8, H // 8), interpolation=cv2.INTER_AREA), cv2.resize(Wt, (W // 8, H // 8), interpolation=cv2.INTER_AREA)
def fit3(f, K=36):
    T, Wt = target(f)
    h, w = T.shape
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float64); xs = xs * 8 + 4; ys = ys * 8 + 4
    # init: greedy isotropic on the target
    R = T.copy(); P = []
    for k in range(K):
        B = cv2.GaussianBlur(R * Wt, (0, 0), 2)
        j = np.argmax(B); y0, x0 = divmod(j, w)
        if B[y0, x0] < 0.03: break
        best = None
        for s in (20, 32, 50, 80, 120):
            G = np.exp(-0.5 * ((xs - x0 * 8 - 4) ** 2 + (ys - y0 * 8 - 4) ** 2) / s ** 2)
            a = float((Wt * R * G).sum() / max((Wt * G * G).sum(), 1e-6)); a = max(0.0, min(1.0, a))
            red = (Wt * R ** 2).sum() - (Wt * (R - a * G) ** 2).sum()
            if best is None or red > best[0]: best = (red, s, a, G)
        red, s, a, G = best
        if a < 0.03: break
        R = R - a * G
        P.append([x0 * 8 + 4, y0 * 8 + 4, np.log(s), np.log(s), 0.0, a])
    if not P: return []
    P = np.array(P, float); n = len(P)
    Wf = Wt.astype(np.float64); Tf = T.astype(np.float64)
    def fg(v):
        p = v.reshape(n, 6); M = np.zeros_like(Tf); Gs = []
        for (x, y, lsx, lsy, th, a) in p:
            c, s_ = np.cos(th), np.sin(th); sx, sy = np.exp(lsx), np.exp(lsy)
            u = (xs - x) * c + (ys - y) * s_; vv = -(xs - x) * s_ + (ys - y) * c
            E = np.exp(-0.5 * (u * u / sx ** 2 + vv * vv / sy ** 2)); Gs.append((E, u, vv, c, s_, sx, sy, a)); M += a * E
        r = Wf * (M - Tf); L = (r * (M - Tf)).sum()
        gr = np.zeros((n, 6)); d = 2 * r
        for i, (E, u, vv, c, s_, sx, sy, a) in enumerate(Gs):
            G = a * E
            gr[i, 0] = (d * G * (u * c / sx ** 2 - vv * s_ / sy ** 2)).sum()
            gr[i, 1] = (d * G * (u * s_ / sx ** 2 + vv * c / sy ** 2)).sum()
            gr[i, 2] = (d * G * u * u / sx ** 2).sum()
            gr[i, 3] = (d * G * vv * vv / sy ** 2).sum()
            gr[i, 4] = (d * G * u * vv * (1 / sy ** 2 - 1 / sx ** 2)).sum()
            gr[i, 5] = (d * E).sum()
        return L, gr.reshape(-1)
    bounds = []
    for _ in range(n): bounds += [(-200, W + 200), (-200, H + 200), (np.log(10), np.log(320)), (np.log(10), np.log(320)), (-np.pi, np.pi), (0, 1)]
    L0 = fg(P.reshape(-1))[0]
    r = _min(fg, P.reshape(-1), jac=True, method='L-BFGS-B', bounds=bounds, options=dict(maxiter=250))
    p = r.x.reshape(n, 6)
    out = []
    for (x, y, lsx, lsy, th, a) in p:
        if a < 0.02: continue
        out += [round(float(x), 1), round(float(y), 1), round(float(np.exp(lsx)), 1), round(float(np.exp(lsy)), 1), round(float(a), 3), round(float(th), 3)]
    return out, L0, r.fun

if __name__ == '__main__' and len(sys.argv) > 3 and sys.argv[3] == 'v3':
    pass
