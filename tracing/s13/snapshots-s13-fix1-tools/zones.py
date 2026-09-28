# zones.py FRAMES SILMOD PART THR[,THR...] TOL MINAREA out.json [--viz out.jpg] [--exclude "x0,y0,x1,y1;..."]
# The source's flat cel tones under the hatching: the "paper" level (a 9 px max filter, blurred 3 px, i.e. the tone
# with the ink lines lifted out) thresholded at pre-grade levels inside a part's outline; each connected area
# simplified to a coarse control polygon (Douglas-Peucker, TOL px) and given the median paper level inside it.
import sys, json, cv2, numpy as np
from common import *
fr, mod, part = sys.argv[1], sys.argv[2], sys.argv[3]
thrs = [float(t) for t in sys.argv[4].split(',')]; tol = float(sys.argv[5]); amin = float(sys.argv[6]); out = sys.argv[7]
I = src(fr)
if mod == 'silX':
    R = jsdata('silX', 'SILE') if part == 'SILE' else jsdata('silX', 'SILFAR')[part[-1]] if part.startswith('SILFAR') else jsdata('silX', 'SILFEET')
else: R = jsdata(mod)[part]
M = ringmask(R)
if '--exclude' in sys.argv:
    for b in sys.argv[sys.argv.index('--exclude') + 1].split(';'):
        x0, y0, x1, y1 = map(int, b.split(',')); M[y0:y1, x0:x1] = 0
Pp = srcpre(fr)
P = cv2.GaussianBlur(cv2.dilate(Pp, np.ones((9, 9), np.uint8)), (0, 0), 3)
res = []
vz = cv2.cvtColor(np.clip(I, 0, 255).astype(np.uint8), cv2.COLOR_GRAY2BGR)
cols = [(0, 0, 255), (0, 200, 255), (0, 255, 0), (255, 0, 255), (255, 255, 0)]
for ti, t in enumerate(thrs):
    Z = ((P < t) & (M > 0)).astype(np.uint8)
    Z = cv2.morphologyEx(Z, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    cs, _ = cv2.findContours(Z, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    for c in cs:
        if cv2.contourArea(c) < amin: continue
        a = cv2.approxPolyDP(c, tol, True).reshape(-1, 2)
        m = np.zeros_like(Z); cv2.fillPoly(m, [c], 1); m &= Z
        v = float(np.median(P[m > 0]))
        res.append({'thr': t, 'v': round(v, 3), 'area': int(cv2.contourArea(c)), 'pts': a.tolist()})
        cv2.polylines(vz, [a.reshape(-1, 1, 2)], True, cols[ti % 5], 2)
json.dump(res, open(out, 'w'))
for z in res: print(z['thr'], z['v'], z['area'], len(z['pts']))
if '--viz' in sys.argv:
    ys, xs = np.nonzero(M); cv2.imwrite(sys.argv[sys.argv.index('--viz') + 1], vz[max(0, ys.min() - 10):ys.max() + 10, max(0, xs.min() - 10):xs.max() + 10])
