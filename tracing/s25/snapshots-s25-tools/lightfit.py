#!/usr/bin/env python3
# lightfit.py RENDERDIR f,f,f -- the page's light in this shot as a coarse multiplicative gain grid (NX x NY nodes over
# the screen, bilinear), least squares on ungraded frames: source ≈ gain(x) · render, on page pixels only (the owl,
# chips, slash arcs, smoke, cracks and the header strip's cut edge left out). Renders must be made WITHOUT the gain.
# Writes ../s25-meas/light.json {nx, ny, x0, y0, x1, y1, g: [...]} (a few dozen numbers: a light measurement).
import cv2, numpy as np, json, sys, os
from grade import ungrade
HERE = os.path.dirname(os.path.abspath(__file__)); MEAS = os.path.join(HERE, '..', 's25-meas')
SRC = os.path.join(HERE, '..', 's25-src', 'f%05d.png')
NX, NY = 13, 7
X0, Y0, X1, Y1 = 144, 128, 2023, 912
SCHED = json.load(open(os.path.join(MEAS, 'sched.json')))
FX = json.load(open(os.path.join(MEAS, 'fxrows.json')))
SMK = json.load(open(os.path.join(MEAS, 'smoke.json')))
def pose_hull(key):
    p = os.path.join(MEAS, f'pose-{key}.json')
    if not os.path.exists(p): return []
    return [np.array(r, float).reshape(-1, 2) for r in json.load(open(p))['hull']]
def figmask(f):
    m = np.zeros((946, 2206), np.uint8)
    rows = []
    i = f - SCHED['SCHED_F0']
    if 0 <= i < len(SCHED['SCHED']): rows.append(SCHED['SCHED'][i])
    i = f - SCHED['CHAOS_F0']
    if 0 <= i < len(SCHED['CHAOS']) and f < 2566: rows.append(SCHED['CHAOS'][i])
    i = f - SCHED['ECHO_F0']
    if 0 <= i < len(SCHED['ECHO']): rows += SCHED['ECHO'][i]
    for r in rows:
        a, b, c, d, e, ff = r[1:7]; A = np.array([[a, c, e], [b, d, ff]])
        for q in pose_hull(r[0]):
            cv2.fillPoly(m, [np.round((A[:, :2] @ q.T).T + A[:, 2]).astype(np.int32)], 1)
    if f >= 2673:  # thrown / floating scissors
        m[200:470, 560:1560] = 1
    if 2600 <= f < 2700 and False: pass
    return cv2.dilate(m, np.ones((41, 41), np.uint8))
def fxmask(f):
    m = np.zeros((946, 2206), np.uint8)
    i = f - FX['CHIPS_F0']
    if 0 <= i < len(FX['CHIPS']):
        r = FX['CHIPS'][i]
        for k in range(0, len(r) - 5, 6):
            x, y, w, h, a, v = r[k:k + 6]
            cv2.fillPoly(m, [np.round(cv2.boxPoints(((x, y), (w + 12, h + 12), np.degrees(a)))).astype(np.int32)], 1)
    i = f - FX['SLASH_F0']
    if 0 <= i < len(FX['SLASH']):
        for cx, cy, a, b, rot, t0, t1, w, v in FX['SLASH'][i]:
            ts = np.linspace(t0, t1, 80); c, s_ = np.cos(rot), np.sin(rot)
            pts = np.stack([cx + a * np.cos(ts) * c - b * np.sin(ts) * s_, cy + a * np.cos(ts) * s_ + b * np.sin(ts) * c], 1)
            cv2.polylines(m, [np.round(pts).astype(np.int32)], False, 1, int(w * 2 + 16))
    b = SMK.get(str(f), [])
    if b:
        yy, xx = np.mgrid[0:946:4, 0:2206:4].astype(np.float32); A = np.zeros_like(xx)
        for k in range(0, len(b), 5):
            x, y, sx, sy, a = b[k:k + 5]; A = 1 - (1 - A) * (1 - a * np.exp(-0.5 * ((xx - x) ** 2 / sx ** 2 + (yy - y) ** 2 / sy ** 2)))
        m |= cv2.resize((A > 0.04).astype(np.uint8), (2206, 946), interpolation=cv2.INTER_NEAREST)
    return m
def basis():
    # bilinear hat weights of each grid node at every quarter-res pixel
    ys, xs = np.mgrid[0:946:4, 0:2206:4].astype(np.float32)
    u = np.clip((xs - X0) / (X1 - X0) * (NX - 1), 0, NX - 1); v = np.clip((ys - Y0) / (Y1 - Y0) * (NY - 1), 0, NY - 1)
    B = []
    for j in range(NY):
        for i in range(NX):
            B.append(np.maximum(0, 1 - np.abs(u - i)) * np.maximum(0, 1 - np.abs(v - j)))
    return np.stack(B, 0)
if __name__ == '__main__':
    rd = sys.argv[1]; frames = [int(v) for v in sys.argv[2].split(',')]
    B = basis(); K = B.shape[0]
    AtA = np.zeros((K, K)); Atb = np.zeros(K)
    for f in frames:
        R = cv2.imread(os.path.join(rd, f'r{f:05d}.png'))[:, :, ::-1].astype(np.float32) / 255
        S = cv2.imread(SRC % f)[:, :, ::-1].astype(np.float32) / 255
        cs = os.path.join(MEAS, f'pre{f}.npy')
        Sp = (np.load(cs).astype(np.float32).mean(2) / 255) if os.path.exists(cs) else ungrade(S, f / 25).mean(2)
        Rp = ungrade(R, f / 25).mean(2)
        g = cv2.imread(SRC % f, 0)
        crack = cv2.dilate((cv2.morphologyEx(g, cv2.MORPH_TOPHAT, np.ones((9, 9), np.uint8)) > 60).astype(np.uint8), np.ones((7, 7), np.uint8))
        rr = cv2.imread(os.path.join(rd, f'r{f:05d}.png'), 0)
        crack |= cv2.dilate((cv2.morphologyEx(rr, cv2.MORPH_TOPHAT, np.ones((9, 9), np.uint8)) > 60).astype(np.uint8), np.ones((7, 7), np.uint8))
        valid = (figmask(f) == 0) & (fxmask(f) == 0) & (crack == 0)
        valid[:Y0 + 4] = False; valid[Y1:] = False; valid[:, :X0 + 4] = False; valid[:, X1 - 4:] = False
        # the header strip's edges (the cut rim) are left out
        valid[176:196] = False; valid[352:372] = False
        w = valid.astype(np.float32)
        # compare blurred (sigma 6) weighted means so fine engraving misregistration does not matter
        Rb = cv2.GaussianBlur(Rp * w, (0, 0), 6); Sb = cv2.GaussianBlur(Sp * w, (0, 0), 6); Wb = cv2.GaussianBlur(w, (0, 0), 6)
        ok = Wb > 0.5
        Rm = np.where(ok, Rb / np.maximum(Wb, 1e-3), 0)[::4, ::4]; Sm = np.where(ok, Sb / np.maximum(Wb, 1e-3), 0)[::4, ::4]; Wm = ok[::4, ::4].astype(np.float32)
        Ab = B * Rm[None]  # K x h x w
        A2 = Ab.reshape(K, -1); ww = Wm.reshape(-1)
        AtA += (A2 * ww) @ A2.T; Atb += (A2 * ww) @ Sm.reshape(-1)
        print(f, 'valid px', int(Wm.sum()), flush=True)
    # smoothness (neighbouring nodes) + weak pull to 1
    lam, mu = float(os.environ.get("LAM", 5)), float(os.environ.get("MU", 0.5))
    L = np.zeros((K, K))
    for j in range(NY):
        for i in range(NX):
            k = j * NX + i
            for (di, dj) in ((1, 0), (0, 1)):
                if i + di < NX and j + dj < NY:
                    k2 = (j + dj) * NX + i + di
                    L[k, k] += 1; L[k2, k2] += 1; L[k, k2] -= 1; L[k2, k] -= 1
    gsol = np.linalg.solve(AtA + lam * L + mu * np.eye(K), Atb + mu * np.ones(K))
    gsol = np.clip(gsol, 0.4, 1.8)
    print(np.round(gsol.reshape(NY, NX), 2))
    json.dump(dict(nx=NX, ny=NY, x0=X0, y0=Y0, x1=X1, y1=Y1, g=[round(float(v), 3) for v in gsol]), open(os.path.join(MEAS, 'light.json'), 'w'))
