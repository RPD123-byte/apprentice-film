# tonefit.py RENDERDIR FRAME PART[,PART...] [--gain 0.8] : refit the parts' cubic value study (src/shots/s13/toneF.js)
# from the render's residual: (source - render) in pre-grade (both blurred 4 px) over the pixels where the part is the
# top layer (its outline eroded 6 px, feature parts left out); the least-squares cubic in u = (x - 1300) / 300,
# v = (y - 470) / 300 is added (x gain) to the part's coefficients.
import sys, json, numpy as np, cv2
from cfg import *
d, f = sys.argv[1], int(sys.argv[2]); parts = sys.argv[3].split(',')
gain = float(sys.argv[sys.argv.index('--gain') + 1]) if '--gain' in sys.argv else 0.8
T = jsdata('toneF')
R = cv2.GaussianBlur(ungrade(cv2.imread(f'{d}/r{f}.png', 0).astype(np.float32), f / 25 + 0.02), (0, 0), 4)
S = cv2.GaussianBlur(srcpre(str(f) if f not in range(891, 899) else '891-898'), (0, 0), 4)
C = jsdata('silC'); X = jsdata('silX', 'SILFEET')
order = [('nub', ringmask(C['nub'])), ('tail', ringmask(C['tail'])), ('body', ringmask(C['body'])), ('wing', ringmask(C['wing'])), ('feet', ringmask(X)), ('head', ringmask(C['head']))]
if f >= 901 and f <= 911: order[-1] = ('headF', ringmask(jsdata('silD')['headF']))
top = {}
cover = np.zeros((946, 2206), np.uint8)
for k, m in reversed(order):
    top[k] = m & (1 - cover); cover |= m
yy, xx = np.mgrid[0:946, 0:2206]; U = (xx - 1300) / 300.0; Vv = (yy - 470) / 300.0
basis = [np.ones_like(U), U, Vv, U * U, U * Vv, Vv * Vv, U ** 3, U * U * Vv, U * Vv * Vv, Vv ** 3]
for part in parts:
    m = cv2.erode(top[part], np.ones((13, 13), np.uint8)).astype(bool)
    if part in ('head', 'headF'):
        mm = m.astype(np.uint8); apply_exb(mm, part); m = mm.astype(bool)
    res = (S - R)[m]
    A = np.stack([b[m] for b in basis], 1)
    lam = 0.02 * len(res)   # ridge: keep the cubic small where the part has little data
    reg = np.diag([0, 1, 1, 4, 4, 4, 16, 16, 16, 16]) * lam
    if m.sum() < 20000: reg[3:, 3:] += np.eye(7) * 1e9   # small visible area: plane only
    coef = np.linalg.solve(A.T @ A + reg, A.T @ res)
    old = T.get(part, [0] * 10)
    T[part] = [round(o + gain * c, 5) for o, c in zip(old, coef)]
    print(f'{part}: n {m.sum()}  mean residual {res.mean():+.4f}  rms {np.sqrt((res ** 2).mean()):.4f} -> fitted rms {np.sqrt(((res - A @ coef) ** 2).mean()):.4f}')
s = ("// s13 value study (fix pass 1b refit by snapshots/s13-fix1-tools/tonefit.py): per part, a cubic polynomial in\n"
     "// u = (x - 1300) / 300, v = (y - 470) / 300 (frame px) giving the pre-grade tone correction added to the part's base\n"
     "// plumage before its strokes: [1, u, v, u^2, uv, v^2, u^3, u^2 v, u v^2, v^3]. Iterated render -> residual -> fit.\n"
     "export const TONE = " + json.dumps(T) + ";\n")
open(ROOT + '/src/shots/s13/toneF.js', 'w').write(s)
