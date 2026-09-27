# Check the dolly mapping: anchor points on each layer are predicted at later frames (room3 planes + the dolly)
# and found in the source by scale-compensated template matching from 40.08. Prints residuals and the implied w.
# track.py [layers,...]
import sys, cv2, numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from common import *
from tone3 import fwd, dolly, centre, PLANES, owl_mask
T0 = 40.08
TS = [40.16, 40.24, 40.32, 40.40, 40.48, 40.56, 40.64]
only = sys.argv[1].split(',') if len(sys.argv) > 1 else None
G = geo()
# anchors: polygon vertices of faces (not open lines), deduplicated per layer
anch = []
for n, e in G.items():
    if len(e) > 2 and e[2].get('open'): continue
    if isinstance(e[1], dict): continue
    L = e[0]
    if only and L not in only: continue
    for p in e[1]:
        if -50 < p[0] < 2250 and -10 < p[1] < 960 and not any(a[0] == L and abs(a[1][0] - p[0]) < 25 and abs(a[1][1] - p[1]) < 25 for a in anch):
            anch.append((L, p, n))
S0 = cv2.cvtColor(src(T0), cv2.COLOR_BGR2GRAY).astype(np.float32)
om0 = owl_mask(luma(src(T0)), T0)
frames = {t: cv2.cvtColor(src(t), cv2.COLOR_BGR2GRAY).astype(np.float32) for t in TS}
oms = {t: owl_mask(luma(src(t)), t) for t in TS}
def mag(L, p, t):
    # local magnification R40 -> frame at t (finite difference)
    a = fwd([p], L, t)[0]; b = fwd([[p[0] + 4, p[1]]], L, t)[0]; c = fwd([[p[0], p[1] + 4]], L, t)[0]
    return np.linalg.norm(b - a) / 4, np.linalg.norm(c - a) / 4
res = {}
R = 22
for L, p, n in anch:
    q0 = fwd([p], L, T0)[0]
    x0, y0 = int(round(q0[0])), int(round(q0[1]))
    if not (R + 2 <= x0 < W - R - 2 and R + 2 <= y0 < H - R - 2): continue
    if om0[y0 - R:y0 + R, x0 - R:x0 + R].any(): continue
    tpl0 = S0[y0 - R:y0 + R, x0 - R:x0 + R]
    if tpl0.std() < 12: continue
    m0 = mag(L, p, T0)
    row = []
    for t in TS:
        q = fwd([p], L, t)[0]
        mt = mag(L, p, t)
        kx, ky = mt[0] / m0[0], mt[1] / m0[1]
        if max(kx, ky) > 4: break
        tpl = cv2.resize(tpl0, None, fx=kx, fy=ky, interpolation=cv2.INTER_LINEAR)
        th, tw = tpl.shape
        sr = int(30 + 20 * max(kx, ky))
        X0, Y0 = int(q[0] - tw / 2 - sr), int(q[1] - th / 2 - sr)
        X1, Y1 = X0 + tw + 2 * sr, Y0 + th + 2 * sr
        if X0 < 0 or Y0 < 0 or X1 > W or Y1 > H: break
        F = frames[t][Y0:Y1, X0:X1]
        if oms[t][Y0:Y1, X0:X1].mean() > 0.05: break
        mres = cv2.matchTemplate(F, tpl, cv2.TM_CCOEFF_NORMED)
        _, mx, _, loc = cv2.minMaxLoc(mres)
        if mx < 0.6: row.append(None); continue
        fx, fy = X0 + loc[0] + tw / 2, Y0 + loc[1] + th / 2
        # implied inverse depth from the radial distance to C: |q - C| = |p - C| / (1 - d w)
        C = np.array(centre(L, t)); d = dolly(t)
        r0 = np.linalg.norm(np.array(p) - C); r1 = np.linalg.norm(np.array([fx, fy]) - C)
        wimp = (1 - r0 / r1) / d if r1 > 1 and d > 0 else float('nan')
        row.append((t, fx - q[0], fy - q[1], mx, wimp))
    res[(L, tuple(p), n)] = row
for L in PLANES:
    rows = [(k, v) for k, v in res.items() if k[0] == L]
    if not rows: continue
    print('==', L)
    for (L_, p, n), row in rows:
        s = ' '.join(f'{r[0]:.2f}:({r[1]:+.0f},{r[2]:+.0f}|w{r[4]:.2f})' if r else ' ---' for r in row)
        pl = PLANES[L]; wm = pl[0] * p[0] + pl[1] * p[1] + pl[2]
        print(f'  {n:10s} ({p[0]:.0f},{p[1]:.0f}) w={wm:.2f}  {s}')
