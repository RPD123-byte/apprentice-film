# overlay geo3 polygons mapped through the dolly model (tone3.fwd) onto the source frame at t: ovt.py t out.jpg [layers] [scale]
import sys, cv2, numpy as np
sys.path.insert(0, __file__.rsplit('/', 1)[0])
from common import *
from tone3 import fwd
t = float(sys.argv[1]); out = sys.argv[2]
only = sys.argv[3].split(',') if len(sys.argv) > 3 and sys.argv[3] != 'all' else None
sc = float(sys.argv[4]) if len(sys.argv) > 4 else 0.8
img = src(t).copy()
G = geo()
for n, e in G.items():
    if only and e[0] not in only: continue
    P = fwd(shape_pts(e[1]), e[0], t)
    if np.abs(P).max() > 20000: continue
    closed = not (len(e) > 2 and e[2].get('open'))
    cv2.polylines(img, [np.round(P).astype(np.int32)], closed, LCOL.get(e[0], (255, 255, 255)), 2, cv2.LINE_AA)
cv2.imwrite(out, cv2.resize(img, None, fx=sc, fy=sc), [cv2.IMWRITE_JPEG_QUALITY, 88])
