# Joint fit of the dolly: per-layer inverse-depth planes + a shared per-frame camera side-shift e(t), with the
# forward travel d(t) fixed (s14.js DOLLY). Model (camera translating by (u, d) toward C0):
#     p' = C0 + (p - C0 - w e(t)) / (1 - d(t) w)
# (e = 0 is a pure dolly toward C0; a rising camera shifts near layers more than far ones, since the shift scales
# with w.) Points are sampled on each layer's visible area at 40.00 (geo3.js faces) and tracked by chained,
# scale-compensated template matching. jointfit.py track | fit
import sys, cv2, numpy as np, json
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from common import *
import tone3
from tone3 import dolly, owl_mask, faces, visible_masks, PLANES
from scipy.optimize import least_squares
C0 = np.array([1104.5, 642.9])
TS = [round(40.0 + 0.04 * k, 2) for k in range(0, 17)]
LAY = ['back', 'ceiling', 'floor', 'left', 'aside', 'right', 'synth', 'under', 'deskBase', 'deskTop']
def model(P, pl, t, e):
    d = dolly(t); P = np.asarray(P, float)
    w = pl[0] * P[:, 0] + pl[1] * P[:, 1] + pl[2]
    return C0 + (P - C0 - w[:, None] * e) / np.maximum(0.02, 1 - d * w)[:, None]
def track():
    gray = {t: cv2.cvtColor(src(t), cv2.COLOR_BGR2GRAY).astype(np.float32) for t in TS}
    owl = {t: owl_mask(luma(src(t)), t) for t in TS}
    items = faces(); vis = visible_masks(items, 40.0)
    lm = {L: np.zeros((H, W), bool) for L in LAY}
    for (n, e), m in zip(items, vis): lm[e[0]] |= m.astype(bool)
    out = {}
    R = 14
    for L in LAY:
        pl = PLANES[L][:3]
        m = cv2.erode(lm[L].astype(np.uint8), np.ones((2 * R + 1, 2 * R + 1), np.uint8)) > 0
        tr = []
        for y in range(R + 4, H - R - 4, 22):
            for x in range(R + 4, W - R - 4, 22):
                if not m[y, x] or owl[40.0][y - R:y + R, x - R:x + R].any(): continue
                tpl = gray[40.0][y - R:y + R, x - R:x + R]
                if tpl.std() < 9: continue
                p = [float(x), float(y)]; obs = []; prev = np.array(p); cur = tpl; mprev = 1.0
                for t in TS[1:]:
                    q = model([p], pl, t, np.zeros(2))[0]; qp = model([p], pl, round(t - 0.04, 2), np.zeros(2))[0]
                    guess = prev + (q - qp)
                    d = dolly(t); w = pl[0] * x + pl[1] * y + pl[2]
                    mt = 1 / max(0.05, 1 - d * w); k = mt / mprev
                    T = cv2.resize(cur, None, fx=k, fy=k, interpolation=cv2.INTER_LINEAR)
                    th, tw = T.shape
                    if th > 160: break
                    sr = int(14 + 12 * k)
                    A0, B0 = int(guess[0] - tw / 2 - sr), int(guess[1] - th / 2 - sr)
                    if A0 < 0 or B0 < 0 or A0 + tw + 2 * sr > W or B0 + th + 2 * sr > H: break
                    if owl[t][B0:B0 + th + 2 * sr, A0:A0 + tw + 2 * sr].mean() > 0.02: break
                    F = gray[t][B0:B0 + th + 2 * sr, A0:A0 + tw + 2 * sr]
                    mr = cv2.matchTemplate(F, T, cv2.TM_CCOEFF_NORMED); _, mx, _, loc = cv2.minMaxLoc(mr)
                    if mx < 0.72: break
                    fx, fy = A0 + loc[0] + tw / 2, B0 + loc[1] + th / 2
                    obs.append((t, fx, fy)); prev = np.array([fx, fy]); mprev = mt
                    hx, hy = tw // 2, th // 2; X, Y = int(round(fx)), int(round(fy))
                    if X - hx < 0 or Y - hy < 0 or X + hx > W or Y + hy > H: break
                    cur = gray[t][Y - hy:Y + hy, X - hx:X + hx]
                if len(obs) >= 2: tr.append((p, obs))
        out[L] = tr
        print(L, 'tracks', len(tr), 'obs', sum(len(o) for _, o in tr), flush=True)
    json.dump(out, open(f'{MEAS}/tracks_all.json', 'w'))
def fit():
    TR = json.load(open(f'{MEAS}/tracks_all.json'))
    lays = [L for L in LAY if len(TR.get(L, [])) >= 5]
    nT = len(TS) - 1
    def unpack(th):
        pls = {L: [th[3 * i] * 1e-3, th[3 * i + 1] * 1e-3, th[3 * i + 2]] for i, L in enumerate(lays)}
        E = th[3 * len(lays):].reshape(nT, 2)
        return pls, E
    def resid(th):
        pls, E = unpack(th); r = []
        for L in lays:
            for p, obs in TR[L]:
                for (t, fx, fy) in obs:
                    q = model([p], pls[L], t, E[TS.index(t) - 1])[0]
                    r += [q[0] - fx, q[1] - fy]
        return np.array(r)
    th0 = []
    for L in lays: pl = PLANES[L]; th0 += [pl[0] * 1e3, pl[1] * 1e3, pl[2]]
    th0 = np.array(th0 + [0.0] * (2 * nT))
    # first planes with e = 0, then everything
    r0 = resid(th0)
    sol = least_squares(resid, th0, loss='soft_l1', f_scale=3.0, max_nfev=200)
    pls, E = unpack(sol.x); r1 = resid(sol.x)
    print('median |r| before', round(float(np.median(np.abs(r0))), 2), 'after', round(float(np.median(np.abs(r1))), 2), 'p90', round(float(np.percentile(np.abs(r1), 90)), 2))
    for L in lays:
        rs = []
        for p, obs in TR[L]:
            for (t, fx, fy) in obs:
                q = model([p], pls[L], t, E[TS.index(t) - 1])[0]; rs.append(np.hypot(q[0] - fx, q[1] - fy))
        print(f'  {L:9s} plane [{pls[L][0]:.6f}, {pls[L][1]:.6f}, {pls[L][2]:.4f}]  (was {[round(v, 6) for v in PLANES[L][:3]]})  n={len(rs)} median {np.median(rs):.2f}')
    print('  e(t):', ' '.join(f'{t:.2f}:[{e[0]:.1f},{e[1]:.1f}]' for t, e in zip(TS[1:], E)))
    json.dump({'planes': pls, 'e': E.tolist(), 't': TS[1:]}, open(f'{MEAS}/jointfit.json', 'w'))
if __name__ == '__main__':
    track() if sys.argv[1] == 'track' else fit()

def fit2(nit=3, fixb=('synth', 'under', 'deskBase', 'deskTop', 'aside', 'back')):
    """staged: planes per layer with e fixed, then e with planes fixed; b (dw/dy) held at 0 for thin layers"""
    TR = json.load(open(f'{MEAS}/tracks_all.json'))
    lays = [L for L in LAY if len(TR.get(L, [])) >= 5]
    nT = len(TS) - 1
    E = np.zeros((nT, 2)); pls = {L: list(PLANES[L][:3]) for L in lays}
    def rl(L, pl, E):
        r = []
        for p, obs in TR[L]:
            for (t, fx, fy) in obs:
                q = model([p], pl, t, E[TS.index(t) - 1])[0]; r += [q[0] - fx, q[1] - fy]
        return np.array(r)
    for it in range(nit):
        for L in lays:
            if L in fixb:
                f = lambda th: rl(L, [th[0] * 1e-3, 0.0, th[1]], E)
                s = least_squares(f, [pls[L][0] * 1e3, pls[L][2] + pls[L][1] * 600], loss='soft_l1', f_scale=3.0)
                pls[L] = [s.x[0] * 1e-3, 0.0, s.x[1]]
            else:
                f = lambda th: rl(L, [th[0] * 1e-3, th[1] * 1e-3, th[2]], E)
                s = least_squares(f, [pls[L][0] * 1e3, pls[L][1] * 1e3, pls[L][2]], loss='soft_l1', f_scale=3.0)
                pls[L] = [s.x[0] * 1e-3, s.x[1] * 1e-3, s.x[2]]
        # e per frame, all layers
        for k, t in enumerate(TS[1:]):
            def f(e):
                r = []
                for L in lays:
                    for p, obs in TR[L]:
                        for (tt, fx, fy) in obs:
                            if tt != t: continue
                            q = model([p], pls[L], t, e)[0]; r += [q[0] - fx, q[1] - fy]
                return np.array(r) if r else np.zeros(2)
            E[k] = least_squares(f, E[k], loss='soft_l1', f_scale=3.0).x
        allr = np.concatenate([rl(L, pls[L], E) for L in lays])
        print('iter', it, 'median |r|', round(float(np.median(np.abs(allr))), 2), 'p90', round(float(np.percentile(np.abs(allr), 90)), 2))
    for L in lays:
        r = rl(L, pls[L], E).reshape(-1, 2)
        print(f'  {L:9s} plane [{pls[L][0]:.6f}, {pls[L][1]:.6f}, {pls[L][2]:.4f}]  (was {[round(v, 6) for v in PLANES[L][:3]]})  n={len(r)} median {np.median(np.hypot(r[:, 0], r[:, 1])):.2f}')
    print('  e(t):', ' '.join(f'{t:.2f}:[{e[0]:.1f},{e[1]:.1f}]' for t, e in zip(TS[1:], E)))
    json.dump({'planes': pls, 'e': E.tolist(), 't': TS[1:]}, open(f'{MEAS}/jointfit.json', 'w'))
if __name__ == '__main__' and sys.argv[1] == 'fit2':
    fit2()
