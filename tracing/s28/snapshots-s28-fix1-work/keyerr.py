# per-frame figure-region blurred error for forced-key renders. Usage: keyerr.py DIR... 
import cv2, numpy as np, sys, glob, re
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s28d-tools')
from lib import src
def bl(a, s): return cv2.GaussianBlur(a.astype(np.float32), (0, 0), s)
res = {}
for d in sys.argv[1:]:
    for p in glob.glob(d + '/frame-*.png'):
        t = float(re.search(r'at-([\d.]+)s', p).group(1))
        r = cv2.imread(p)[100:946, 150:1500]; s = src(t)[100:946, 150:1500]
        res.setdefault(t, {})[d[-1]] = (np.abs(bl(r, 4) - bl(s, 4)).mean(), np.abs(bl(r, 12) - bl(s, 12)).mean())
for t in sorted(res):
    print(f'{t:7.2f} ' + '  '.join(f'{k}: {v[0]:5.1f}/{v[1]:5.1f}' for k, v in sorted(res[t].items())))
