# Track arbitrary R40 points through the dolly with scale-compensated template matching from 40.08, assuming a
# layer (for the prediction and the magnification); prints the implied inverse depth w per point per frame.
# trackpts.py layer x0 y0 x1 y1 step [R]
import sys, cv2, numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from common import *
from tone3 import fwd, dolly, centre, PLANES, owl_mask
L = sys.argv[1]; x0, y0, x1, y1, st = map(int, sys.argv[2:7]); R = int(sys.argv[7]) if len(sys.argv) > 7 else 20
import os
T0 = float(os.environ.get('T0', '40.08')); TS = [float(x) for x in os.environ.get('TS', '40.16,40.24,40.32,40.40,40.48,40.56').split(',')]
if os.environ.get('FLOORK'):
    import tone3; k = float(os.environ['FLOORK']); tone3.PLANES['floor'] = [0, k, -643 * k]
S0 = cv2.cvtColor(src(T0), cv2.COLOR_BGR2GRAY).astype(np.float32)
om0 = owl_mask(luma(src(T0)), T0)
frames = {t: cv2.cvtColor(src(t), cv2.COLOR_BGR2GRAY).astype(np.float32) for t in TS}
oms = {t: owl_mask(luma(src(t)), t) for t in TS}
def mag(p, t, w=None):
    a = fwd([p], L, t)[0]; b = fwd([[p[0] + 4, p[1]]], L, t)[0]; c = fwd([[p[0], p[1] + 4]], L, t)[0]
    return np.linalg.norm(b - a) / 4, np.linalg.norm(c - a) / 4
out = []
for y in range(y0, y1 + 1, st):
    for x in range(x0, x1 + 1, st):
        p = [x, y]
        q0 = fwd([p], L, T0)[0]; X, Y = int(round(q0[0])), int(round(q0[1]))
        if not (R + 2 <= X < W - R - 2 and R + 2 <= Y < H - R - 2) or om0[Y - R:Y + R, X - R:X + R].any(): continue
        tpl0 = S0[Y - R:Y + R, X - R:X + R]
        if tpl0.std() < 8: continue
        m0 = mag(p, T0); ws = []
        for t in TS:
            q = fwd([p], L, t)[0]; mt = mag(p, t)
            kx, ky = mt[0] / m0[0], mt[1] / m0[1]
            if max(kx, ky) > 3.5: break
            tpl = cv2.resize(tpl0, None, fx=kx, fy=ky)
            th, tw = tpl.shape; sr = int(40 + 30 * max(kx, ky))
            A0, B0 = int(q[0] - tw / 2 - sr), int(q[1] - th / 2 - sr)
            if A0 < 0 or B0 < 0 or A0 + tw + 2 * sr > W or B0 + th + 2 * sr > H: break
            F = frames[t][B0:B0 + th + 2 * sr, A0:A0 + tw + 2 * sr]
            if oms[t][B0:B0 + th + 2 * sr, A0:A0 + tw + 2 * sr].mean() > 0.05: break
            mr = cv2.matchTemplate(F, tpl, cv2.TM_CCOEFF_NORMED); _, mx, _, loc = cv2.minMaxLoc(mr)
            if mx < 0.55: ws.append(None); continue
            fx, fy = A0 + loc[0] + tw / 2, B0 + loc[1] + th / 2
            C = np.array(centre(L, t)); d = dolly(t)
            r0 = np.linalg.norm(np.array(p) - C); r1 = np.linalg.norm(np.array([fx, fy]) - C)
            ws.append(round((1 - r0 / r1) / d, 2))
        good = [w for w in ws if w is not None]
        if good: out.append((x, y, ws))
        pl = PLANES[L]
        print(f'({x},{y}) plane w={pl[0]*x+pl[1]*y+pl[2]:.2f} implied', ws)
