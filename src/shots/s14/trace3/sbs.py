# side-by-side crop of a render and the source at the same time: sbs.py render.png T x0 y0 x1 y1 scale out.jpg
import sys, cv2, numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from common import *
r = cv2.imread(sys.argv[1]); t = float(sys.argv[2]); x0, y0, x1, y1 = map(int, sys.argv[3:7]); sc = float(sys.argv[7]); out = sys.argv[8]
s = src(t)
A = cv2.resize(r[y0:y1, x0:x1], None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
B = cv2.resize(s[y0:y1, x0:x1], None, fx=sc, fy=sc, interpolation=cv2.INTER_CUBIC)
im = np.hstack([A, np.zeros((A.shape[0], 6, 3), np.uint8) + 60, B]) if (x1 - x0) <= (y1 - y0) * 1.2 else np.vstack([A, np.zeros((6, A.shape[1], 3), np.uint8) + 60, B])
cv2.imwrite(out, im, [cv2.IMWRITE_JPEG_QUALITY, 90])
