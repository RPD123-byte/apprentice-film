# zc.py DIR F x0 y0 x1 y1 scale out : render|source crop pair
import sys, cv2, numpy as np
sys.path.insert(0, '/Users/computer/rootline/apprentice-film/snapshots/s22-fix1-h')
from run import src
d, F, x0, y0, x1, y1, s, out = sys.argv[1], int(sys.argv[2]), *map(int, sys.argv[3:7]), float(sys.argv[7]), sys.argv[8]
a = cv2.imread(f'{d}/r{F:04d}.png')[y0:y1, x0:x1]; b = src(F)[y0:y1, x0:x1]
p = np.hstack([a, np.full((a.shape[0], 3, 3), (0, 0, 200), np.uint8), b])
cv2.imwrite(out, cv2.resize(p, None, fx=s, fy=s, interpolation=cv2.INTER_CUBIC))
