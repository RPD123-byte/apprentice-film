# Fit each room layer's inverse-depth plane w = a x + b y + c to the source's motion over the dolly.
# Points (R40) on a layer are tracked from 40.00 (where R40 = the frame) to every later frame by scale-compensated
# template matching, chaining the template forward frame to frame (re-cut at each found position) so the match
# survives large magnification; then (a, b, c) is fitted to all found positions, with d(t) and the layer's centre.
# planefit.py layer x0 y0 x1 y1 step [R]   -> prints the fitted plane and residuals; writes meas/tracks_<layer>.json
import sys, cv2, numpy as np, json
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from common import *
import tone3
from tone3 import fwd, dolly, centre, PLANES, owl_mask
from scipy.optimize import least_squares
L = sys.argv[1]; x0, y0, x1, y1, st = map(int, sys.argv[2:7]); R = int(sys.argv[7]) if len(sys.argv) > 7 else 16
TS = [round(40.0 + 0.04 * k, 2) for k in range(0, 17)]
gray = {t: cv2.cvtColor(src(t), cv2.COLOR_BGR2GRAY).astype(np.float32) for t in TS}
owl = {t: owl_mask(luma(src(t)), t) for t in TS}
def mag(p, t, pl):
    tone3.PLANES[L] = pl
    a = fwd([p], L, t)[0]; b = fwd([[p[0] + 3, p[1]]], L, t)[0]; c = fwd([[p[0], p[1] + 3]], L, t)[0]
    return np.linalg.norm(b - a) / 3, np.linalg.norm(c - a) / 3
pl0 = list(PLANES[L])
tracks = []
for y in range(y0, y1 + 1, st):
    for x in range(x0, x1 + 1, st):
        p = [float(x), float(y)]
        if not (R + 2 <= x < W - R - 2 and R + 2 <= y < H - R - 2) or owl[40.0][y - R:y + R, x - R:x + R].any(): continue
        tpl = gray[40.0][y - R:y + R, x - R:x + R]
        if tpl.std() < 9: continue
        obs = []; prev = np.array(p); mprev = (1.0, 1.0); cur = tpl
        for t in TS[1:]:
            q = fwd([p], L, t)[0]
            # predict from the previous found position: shift by the predicted step
            qp = fwd([p], L, round(t - 0.04, 2))[0]
            guess = prev + (q - qp)
            mt = mag(p, t, pl0)
            kx, ky = mt[0] / mprev[0], mt[1] / mprev[1]
            T = cv2.resize(cur, None, fx=kx, fy=ky, interpolation=cv2.INTER_LINEAR)
            th, tw = T.shape
            if th > 200 or tw > 200: break
            sr = int(12 + 10 * max(kx, ky))
            A0, B0 = int(guess[0] - tw / 2 - sr), int(guess[1] - th / 2 - sr)
            if A0 < 0 or B0 < 0 or A0 + tw + 2 * sr > W or B0 + th + 2 * sr > H: break
            if owl[t][B0:B0 + th + 2 * sr, A0:A0 + tw + 2 * sr].mean() > 0.02: break
            F = gray[t][B0:B0 + th + 2 * sr, A0:A0 + tw + 2 * sr]
            mr = cv2.matchTemplate(F, T, cv2.TM_CCOEFF_NORMED); _, mx, _, loc = cv2.minMaxLoc(mr)
            if mx < 0.7: break
            fx, fy = A0 + loc[0] + tw / 2, B0 + loc[1] + th / 2
            obs.append((t, fx, fy, mx))
            prev = np.array([fx, fy]); mprev = mt
            # re-cut the template at the found position (at the current scale)
            hx, hy = int(round(tw / 2)), int(round(th / 2))
            X, Y = int(round(fx)), int(round(fy))
            if X - hx < 0 or Y - hy < 0 or X + hx > W or Y + hy > H: break
            cur = gray[t][Y - hy:Y + hy, X - hx:X + hx]
        if len(obs) >= 3: tracks.append((p, obs))
print(L, 'tracks', len(tracks), 'obs', sum(len(o) for _, o in tracks))
json.dump([[p, o] for p, o in tracks], open(f'{MEAS}/tracks_{L}.json', 'w'))
def resid(th):
    tone3.PLANES[L] = [th[0] * 1e-3, th[1] * 1e-3, th[2]] + pl0[3:]
    r = []
    for p, obs in tracks:
        for (t, fx, fy, mx) in obs:
            q = fwd([p], L, t)[0]
            r += [q[0] - fx, q[1] - fy]
    return np.array(r)
th0 = [pl0[0] * 1e3, pl0[1] * 1e3, pl0[2]]
r0 = resid(th0)
sol = least_squares(resid, th0, loss='soft_l1', f_scale=4.0)
r1 = resid(sol.x)
print('plane before', [round(v, 6) for v in pl0[:3]], 'median |r|', round(float(np.median(np.abs(r0))), 2))
print('plane after ', [round(sol.x[0] * 1e-3, 6), round(sol.x[1] * 1e-3, 6), round(sol.x[2], 4)], 'median |r|', round(float(np.median(np.abs(r1))), 2), 'p90', round(float(np.percentile(np.abs(r1), 90)), 2))
# residual by time
tone3.PLANES[L] = [sol.x[0] * 1e-3, sol.x[1] * 1e-3, sol.x[2]] + pl0[3:]
byt = {}
for p, obs in tracks:
    for (t, fx, fy, mx) in obs:
        q = fwd([p], L, t)[0]; byt.setdefault(t, []).append((q[0] - fx, q[1] - fy))
print(' '.join(f'{t:.2f}:{np.median([a for a, b in v]):+.1f},{np.median([b for a, b in v]):+.1f}(n{len(v)})' for t, v in sorted(byt.items())))
