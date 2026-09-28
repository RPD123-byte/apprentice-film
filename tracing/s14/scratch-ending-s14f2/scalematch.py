# scalematch.py x0 y0 x1 y1 t0 t1,t2,... [renderdir]: best scale+shift of the source crop at t0 in later frames
import sys; sys.path.insert(0, '/Users/computer/rootline/apprentice-film/src/shots/s14/trace3')
from common import *
import cv2, numpy as np, glob, re
x0, y0, x1, y1 = map(int, sys.argv[1:5]); t0 = float(sys.argv[5]); ts = [float(v) for v in sys.argv[6].split(',')]
rd = sys.argv[7] if len(sys.argv) > 7 else None
def get(t, rend=False):
    if rend:
        f = [p for p in glob.glob(rd + '/frame-*.png') if abs(float(re.search(r'at-([\d.]+)s', p).group(1)) - t) < 1e-3][0]
        return luma(cv2.imread(f)).astype(np.float32)
    return luma(src(t)).astype(np.float32)
def hp(L): return L - cv2.GaussianBlur(L, (0, 0), 6)
for rend in ([False, True] if rd else [False]):
    T0 = hp(get(t0, rend))[y0:y1, x0:x1]
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    prev = 1.0
    for t in ts:
        F = hp(get(t, rend))
        best = None
        for s in np.arange(prev * 0.95, prev * 1.4, 0.005):
            tp = cv2.resize(T0, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
            if tp.shape[0] >= F.shape[0] or tp.shape[1] >= F.shape[1]: break
            r = cv2.matchTemplate(F, tp, cv2.TM_CCOEFF_NORMED)
            _, mv, _, ml = cv2.minMaxLoc(r)
            if best is None or mv > best[0]: best = (mv, s, ml, tp.shape)
        mv, s, ml, sh = best
        prev = s
        ncx, ncy = ml[0] + sh[1] / 2, ml[1] + sh[0] / 2
        print(('REN ' if rend else 'SRC ') + f'{t:.2f} s {s:.3f} centre ({cx:.0f},{cy:.0f}) -> ({ncx:.1f},{ncy:.1f}) score {mv:.2f}')
