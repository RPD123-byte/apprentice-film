# s28 fix1: per-frame render-vs-source blurred diffs and consecutive steps. Usage: metrics.py DIR [--steps]
import cv2, numpy as np, sys, glob, re
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s28d-tools')
from lib import src
d = sys.argv[1]
fs = sorted(glob.glob(d + '/frame-*.png'), key=lambda p: float(re.search(r'at-([\d.]+)s', p).group(1)))
def bl(a, s): return cv2.GaussianBlur(a.astype(np.float32), (0, 0), s)
prev = None; rows = []
for p in fs:
    t = float(re.search(r'at-([\d.]+)s', p).group(1))
    r = cv2.imread(p); s = src(t)
    d4 = float(np.abs(bl(r, 4) - bl(s, 4)).mean()); d12 = float(np.abs(bl(r, 12) - bl(s, 12)).mean())
    st = ''
    if prev is not None:
        pr, ps, pt = prev
        st = f'  step render {np.abs(bl(r,4)-bl(pr,4)).mean():5.1f}  source {np.abs(bl(s,4)-bl(ps,4)).mean():5.1f} (from {pt})'
    print(f'{t:7.2f}  s4 {d4:5.1f}  s12 {d12:5.1f}{st}')
    rows.append((d4, d12)); prev = (r, s, t)
a = np.array(rows); print('mean s4 %.2f s12 %.2f' % tuple(a.mean(0)))
