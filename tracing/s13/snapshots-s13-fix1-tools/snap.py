# snap.py FRAMES MODE R "x,y x,y ..." : refine hand-picked control points of one key line on the source.
#   MODE ridge: move each point along the polyline normal (+-R px) to the darkest spot (sigma 1 blur); report its
#               FWHM width and depth under the local paper (pre-grade values too)
#   MODE bright: same for a bright streak;  MODE edge: to the strongest step (reports the two sides' levels)
import sys, numpy as np, cv2
from common import *
fr, mode, R = sys.argv[1], sys.argv[2], float(sys.argv[3])
P = [tuple(map(float, s.split(','))) for s in sys.argv[4].split()]
I = cv2.GaussianBlur(src(fr), (0, 0), 1.0)
def samp(x, y): return cv2.getRectSubPix(I, (1, 1), (float(x), float(y)))[0, 0]
out = []
for i, p in enumerate(P):
    a = P[max(0, i - 1)]; b = P[min(len(P) - 1, i + 1)]
    t = np.array([b[0] - a[0], b[1] - a[1]]); t /= (np.linalg.norm(t) or 1); n = np.array([-t[1], t[0]])
    ss = np.arange(-R, R + 0.01, 0.25); prof = np.array([samp(p[0] + n[0] * s, p[1] + n[1] * s) for s in ss])
    if mode == 'ridge' or mode == 'bright':
        k = np.argmin(prof) if mode == 'ridge' else np.argmax(prof)
        s0 = ss[k]; q = (p[0] + n[0] * s0, p[1] + n[1] * s0)
        wide = np.array([samp(q[0] + n[0] * s, q[1] + n[1] * s) for s in np.arange(-12, 12.01, 0.25)])
        paper = np.percentile(wide, 90 if mode == 'ridge' else 10); pk = prof[k]; half = (paper + pk) / 2
        w = ((wide < half) if mode == 'ridge' else (wide > half)).sum() * 0.25
        out.append((q[0], q[1], w, pk, paper))
        print(f'{q[0]:7.1f},{q[1]:6.1f}  moved {s0:+5.2f}  w {w:4.1f}  val {pk:5.1f} (pre {pre(pk,q[0],q[1]):.3f})  paper {paper:5.1f} (pre {pre(paper,q[0],q[1]):.3f})')
    else:
        g = np.gradient(prof); k = np.argmax(np.abs(g)); s0 = ss[k]; q = (p[0] + n[0] * s0, p[1] + n[1] * s0)
        lo = prof[max(0, k - 12)]; hi = prof[min(len(prof) - 1, k + 12)]
        print(f'{q[0]:7.1f},{q[1]:6.1f}  moved {s0:+5.2f}  side- {lo:5.1f} side+ {hi:5.1f}')
print('pts', ' '.join(f'[{o[0]:.1f}, {o[1]:.1f}]' for o in out) if out else '')
